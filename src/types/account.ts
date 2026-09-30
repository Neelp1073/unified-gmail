export const ACCOUNT_LABELS = [
  "personal",
  "university",
  "work",
  "other",
] as const;

export type AccountLabel = (typeof ACCOUNT_LABELS)[number];

export type AccountStatus = "active" | "needs_reauth" | "error" | "connecting";

export interface Account {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  label: AccountLabel;
  customLabel?: string;
  connectedAt: string;
  lastSync?: string;
  scopes: string[];
  status: AccountStatus;
  statusMessage?: string;
}

export interface AccountStorage {
  accountId: string;
  usageBytes?: number;
  limitBytes?: number;
  usageInDriveBytes?: number;
  usageInDriveTrashBytes?: number;
  quotaAvailable: boolean;
  quotaNote?: string;
  fetchedAt?: string;
}

export const LABEL_COLORS: Record<AccountLabel, string> = {
  personal: "#4f46e5",
  university: "#c2410c",
  work: "#0f766e",
  other: "#7c3aed",
};

export function accountBadgeText(account: Account): string {
  if (account.customLabel?.trim()) return account.customLabel.trim().toUpperCase();
  return account.label.toUpperCase();
}
