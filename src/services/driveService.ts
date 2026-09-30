import { googleFetch } from "@/api/googleClient";
import { DEFAULT_PAGE_SIZE, GOOGLE_APIS } from "@/config";
import { AppError, toUserError } from "@/utils/errors";
import type { AccountStorage } from "@/types/account";
import type { DriveFileItem, DriveFilePage } from "@/types/drive";

interface AboutResponse {
  storageQuota?: {
    limit?: string;
    usage?: string;
    usageInDrive?: string;
    usageInDriveTrash?: string;
  };
}

interface DriveFileResource {
  id?: string;
  name?: string;
  mimeType?: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  starred?: boolean;
}

interface DriveListResponse {
  files?: DriveFileResource[];
  nextPageToken?: string;
}

const FILE_FIELDS =
  "id,name,mimeType,size,modifiedTime,iconLink,thumbnailLink,webViewLink,starred";
const MULTIPART_MAX_BYTES = 5 * 1024 * 1024;
const RESUMABLE_CHUNK_BYTES = 8 * 1024 * 1024;

function asBytes(value?: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function filesUrl(search?: Record<string, string | undefined>): string {
  const url = new URL(`${GOOGLE_APIS.drive}/files`);
  if (search) {
    for (const [key, value] of Object.entries(search)) {
      if (value) url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

function toDriveFileItem(accountId: string, file: DriveFileResource): DriveFileItem | null {
  if (!file.id || !file.name || !file.mimeType) return null;
  return {
    accountId,
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: asBytes(file.size),
    modifiedTime: file.modifiedTime,
    iconLink: file.iconLink,
    thumbnailLink: file.thumbnailLink,
    webViewLink: file.webViewLink,
    starred: file.starred,
  };
}

function fileMime(file: File): string {
  return file.type || "application/octet-stream";
}

/**
 * Drive API is used for storage quota, file listing, and uploads you start here.
 * Existing Drive files are opened in Google Drive rather than downloaded.
 */
export const driveService = {
  async getStorageQuota(accountId: string): Promise<AccountStorage> {
    try {
      const response = await googleFetch(
        accountId,
        `${GOOGLE_APIS.drive}/about?fields=storageQuota`,
      );
      const json = (await response.json()) as AboutResponse;
      const quota = json.storageQuota;
      const usageBytes = asBytes(quota?.usage);
      const limitBytes = asBytes(quota?.limit);

      if (!quota) {
        return {
          accountId,
          quotaAvailable: false,
          quotaNote:
            "Google did not return storage quota for this account. Numbers are not estimated.",
          fetchedAt: new Date().toISOString(),
        };
      }

      if (limitBytes === undefined) {
        return {
          accountId,
          usageBytes,
          usageInDriveBytes: asBytes(quota.usageInDrive),
          usageInDriveTrashBytes: asBytes(quota.usageInDriveTrash),
          quotaAvailable: false,
          quotaNote:
            "This account does not expose a storage limit (common for some Workspace accounts). Used space is shown when Google provides it.",
          fetchedAt: new Date().toISOString(),
        };
      }

      return {
        accountId,
        usageBytes,
        limitBytes,
        usageInDriveBytes: asBytes(quota.usageInDrive),
        usageInDriveTrashBytes: asBytes(quota.usageInDriveTrash),
        quotaAvailable: true,
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof AppError && error.code === "permission") {
        return {
          accountId,
          quotaAvailable: false,
          quotaNote:
            "Storage quota is unavailable for this account. Drive access was denied, and Gmail does not provide quota itself.",
          fetchedAt: new Date().toISOString(),
        };
      }
      throw error;
    }
  },

  async listFiles(
    accountId: string,
    options?: { q?: string; pageToken?: string; maxResults?: number },
  ): Promise<DriveFilePage> {
    const response = await googleFetch(
      accountId,
      filesUrl({
        q: options?.q ?? "trashed = false",
        pageToken: options?.pageToken,
        pageSize: String(options?.maxResults ?? DEFAULT_PAGE_SIZE),
        corpora: "user",
        includeItemsFromAllDrives: "true",
        supportsAllDrives: "true",
        orderBy: "modifiedTime desc",
        fields: `nextPageToken,files(${FILE_FIELDS})`,
      }),
    );
    const json = (await response.json()) as DriveListResponse;
    const items: DriveFileItem[] = [];
    for (const file of json.files ?? []) {
      const item = toDriveFileItem(accountId, file);
      if (item) items.push(item);
    }
    return {
      items,
      nextPageTokens: { [accountId]: json.nextPageToken },
    };
  },

  async listAcrossAccounts(
    accountIds: string[],
    options?: { q?: string; pageTokens?: Record<string, string | undefined>; maxResults?: number },
  ): Promise<DriveFilePage> {
    const pages = await Promise.allSettled(
      accountIds.map((accountId) =>
        driveService.listFiles(accountId, {
          q: options?.q,
          pageToken: options?.pageTokens?.[accountId],
          maxResults: options?.maxResults,
        }),
      ),
    );
    const items: DriveFileItem[] = [];
    const nextPageTokens: Record<string, string | undefined> = {};
    const warnings: string[] = [];
    for (const [index, accountId] of accountIds.entries()) {
      const result = pages[index];
      if (result.status === "fulfilled") {
        items.push(...result.value.items);
        nextPageTokens[accountId] = result.value.nextPageTokens[accountId];
        if (result.value.warnings) warnings.push(...result.value.warnings);
      } else {
        warnings.push(toUserError(result.reason));
      }
    }
    if (items.length === 0 && warnings.length === accountIds.length) {
      const reason = pages[0];
      throw reason.status === "rejected"
        ? reason.reason
        : new AppError("unknown", "Drive did not return files.");
    }
    return { items, nextPageTokens, warnings };
  },

  async uploadFile(accountId: string, file: File): Promise<DriveFileItem> {
    if (file.size <= MULTIPART_MAX_BYTES) {
      return uploadMultipart(accountId, file);
    }
    return uploadResumable(accountId, file);
  },
};

async function uploadMultipart(accountId: string, file: File): Promise<DriveFileItem> {
  const boundary = `unified_gmail_${crypto.randomUUID().replaceAll("-", "")}`;
  const metadata = JSON.stringify({
    name: file.name,
    mimeType: fileMime(file),
  });
  const body = new Blob(
    [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
      `--${boundary}\r\nContent-Type: ${fileMime(file)}\r\n\r\n`,
      file,
      `\r\n--${boundary}--`,
    ],
    { type: `multipart/related; boundary=${boundary}` },
  );
  const response = await googleFetch(
    accountId,
    `${GOOGLE_APIS.driveUpload}/files?uploadType=multipart&supportsAllDrives=true&fields=${encodeURIComponent(FILE_FIELDS)}`,
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  return parseUploadedFile(accountId, response);
}

async function uploadResumable(accountId: string, file: File): Promise<DriveFileItem> {
  const mime = fileMime(file);
  const start = await googleFetch(
    accountId,
    `${GOOGLE_APIS.driveUpload}/files?uploadType=resumable&supportsAllDrives=true&fields=${encodeURIComponent(FILE_FIELDS)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mime,
        "X-Upload-Content-Length": String(file.size),
      },
      body: JSON.stringify({ name: file.name, mimeType: mime }),
    },
  );
  const location = start.headers.get("Location");
  if (!location) {
    throw new AppError("unknown", "Google did not start a Drive upload session.");
  }

  let offset = 0;
  let last: Response | undefined;
  while (offset < file.size) {
    const end = Math.min(offset + RESUMABLE_CHUNK_BYTES, file.size);
    last = await googleFetch(accountId, location, {
      method: "PUT",
      headers: {
        "Content-Type": mime,
        "Content-Range": `bytes ${offset}-${end - 1}/${file.size}`,
      },
      body: file.slice(offset, end),
      okStatuses: [308],
    });
    offset = end;
  }
  if (!last) {
    throw new AppError("unknown", "Drive upload did not complete.");
  }
  return parseUploadedFile(accountId, last);
}

async function parseUploadedFile(accountId: string, response: Response): Promise<DriveFileItem> {
  const json = (await response.json()) as DriveFileResource;
  const item = toDriveFileItem(accountId, json);
  if (!item) {
    throw new AppError("unknown", "Drive uploaded the file but did not return its metadata.");
  }
  return item;
}
