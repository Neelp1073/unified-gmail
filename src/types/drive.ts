export interface DriveFileItem {
  accountId: string;
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime?: string;
  iconLink?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  starred?: boolean;
}

export interface DriveFilePage {
  items: DriveFileItem[];
  nextPageTokens: Record<string, string | undefined>;
  warnings?: string[];
}

export function driveFileKey(item: { accountId: string; id: string }): string {
  return `${item.accountId}:${item.id}`;
}

export function isDriveFolder(mimeType: string): boolean {
  return mimeType === "application/vnd.google-apps.folder";
}

export function isDriveMedia(mimeType: string): boolean {
  return mimeType.startsWith("image/") || mimeType.startsWith("video/");
}

export function driveOpenUrl(item: DriveFileItem): string {
  if (item.webViewLink) return item.webViewLink;
  if (isDriveFolder(item.mimeType)) {
    return `https://drive.google.com/drive/folders/${encodeURIComponent(item.id)}`;
  }
  return `https://drive.google.com/file/d/${encodeURIComponent(item.id)}/view`;
}

export function buildDriveQuery(kind: "files" | "photos", search = ""): string {
  const parts = ["trashed = false"];
  if (kind === "photos") {
    parts.push("(mimeType contains 'image/' or mimeType contains 'video/')");
  }
  const term = search.trim().replaceAll("\\", "\\\\").replaceAll("'", "\\'");
  if (term) parts.push(`name contains '${term}'`);
  return parts.join(" and ");
}
