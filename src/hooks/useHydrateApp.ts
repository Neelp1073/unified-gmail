import { useEffect, useRef } from "react";
import { useAccountStore } from "@/store/accounts";
import { useSettingsStore } from "@/store/settings";

export function useHydrateApp(): boolean {
  const settingsHydrate = useSettingsStore((state) => state.hydrate);
  const accountsHydrate = useAccountStore((state) => state.hydrate);
  const settingsReady = useSettingsStore((state) => state.hydrated);
  const accountsReady = useAccountStore((state) => state.hydrated);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void settingsHydrate();
    void accountsHydrate();
  }, [settingsHydrate, accountsHydrate]);

  return settingsReady && accountsReady;
}
