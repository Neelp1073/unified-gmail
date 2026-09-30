import { useSettingsStore, applyResolvedTheme } from "@/store/settings";
import { useEffect } from "react";

export function useThemeSync(): void {
  const theme = useSettingsStore((state) => state.theme);
  const hydrated = useSettingsStore((state) => state.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    applyResolvedTheme(theme);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyResolvedTheme(theme);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme, hydrated]);
}
