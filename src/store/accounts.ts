import { create } from "zustand";
import type { Account, AccountStorage } from "@/types/account";
import { storageGet, storageSet } from "@/lib/storage";

interface AccountState {
  accounts: Account[];
  storageByAccount: Record<string, AccountStorage>;
  selectedAccountId: "all" | string;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSelectedAccountId: (id: "all" | string) => void;
  setAccounts: (accounts: Account[]) => Promise<void>;
  upsertAccount: (account: Account) => Promise<void>;
  removeAccount: (accountId: string) => Promise<void>;
  upsertStorage: (entry: AccountStorage) => Promise<void>;
}

const ACCOUNTS_KEY = "accounts";
const SELECTED_KEY = "selectedAccountId";
const STORAGE_KEY = "storageByAccount";

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  storageByAccount: {},
  selectedAccountId: "all",
  hydrated: false,

  hydrate: async () => {
    const [accounts, selectedAccountId, storageByAccount] = await Promise.all([
      storageGet<Account[]>(ACCOUNTS_KEY, []),
      storageGet<"all" | string>(SELECTED_KEY, "all"),
      storageGet<Record<string, AccountStorage>>(STORAGE_KEY, {}),
    ]);
    set({ accounts, selectedAccountId, storageByAccount, hydrated: true });
  },

  setSelectedAccountId: (id) => {
    set({ selectedAccountId: id });
    void storageSet(SELECTED_KEY, id);
  },

  setAccounts: async (accounts) => {
    set({ accounts });
    await storageSet(ACCOUNTS_KEY, accounts);
  },

  upsertAccount: async (account) => {
    const accounts = get().accounts;
    const next = accounts.some((item) => item.id === account.id)
      ? accounts.map((item) => (item.id === account.id ? account : item))
      : [...accounts, account];
    await get().setAccounts(next);
  },

  removeAccount: async (accountId) => {
    await get().setAccounts(get().accounts.filter((item) => item.id !== accountId));
    const storageByAccount = { ...get().storageByAccount };
    delete storageByAccount[accountId];
    set({ storageByAccount });
    await storageSet(STORAGE_KEY, storageByAccount);
    if (get().selectedAccountId === accountId) {
      get().setSelectedAccountId("all");
    }
  },

  upsertStorage: async (entry) => {
    const storageByAccount = {
      ...get().storageByAccount,
      [entry.accountId]: entry,
    };
    set({ storageByAccount });
    await storageSet(STORAGE_KEY, storageByAccount);
  },
}));

export function selectVisibleAccounts(
  accounts: Account[],
  selectedAccountId: "all" | string,
): Account[] {
  if (selectedAccountId === "all") return accounts;
  return accounts.filter((account) => account.id === selectedAccountId);
}
