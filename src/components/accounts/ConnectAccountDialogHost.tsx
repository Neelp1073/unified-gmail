import { ConnectAccountDialog } from "@/components/accounts/ConnectAccountDialog";
import { requestConnectGoogle } from "@/auth/bridge";
import { driveService } from "@/services/driveService";
import { useAccountStore } from "@/store/accounts";
import { useSettingsStore } from "@/store/settings";
import { useToastStore } from "@/store/toasts";
import { useUiStore } from "@/store/ui";
import { toUserError } from "@/utils/errors";

export function ConnectAccountDialogHost() {
  const open = useUiStore((state) => state.connectOpen);
  const setConnectOpen = useUiStore((state) => state.setConnectOpen);
  const updateSettings = useSettingsStore((state) => state.update);
  const hydrateAccounts = useAccountStore((state) => state.hydrate);
  const upsertAccount = useAccountStore((state) => state.upsertAccount);
  const upsertStorage = useAccountStore((state) => state.upsertStorage);
  const push = useToastStore((state) => state.push);

  if (!open) return null;

  return (
    <ConnectAccountDialog
      onClose={() => setConnectOpen(false)}
      onConnect={(nextClientId) => {
        void updateSettings({ googleClientId: nextClientId });
        return requestConnectGoogle(nextClientId)
          .then(async (account) => {
            await upsertAccount(account);
            await hydrateAccounts();
            try {
              await upsertStorage(await driveService.getStorageQuota(account.id));
            } catch {
              // Quota is optional; the account is still connected.
            }
            setConnectOpen(false);
            push({
              title: "Account connected",
              description: account.email,
              tone: "success",
            });
          })
          .catch((error) => {
            push({
              title: "Could not connect account",
              description: toUserError(error),
              tone: "danger",
            });
          });
      }}
    />
  );
}
