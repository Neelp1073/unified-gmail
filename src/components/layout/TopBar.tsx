import { FormEvent, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Moon, PenLine, Search, Sun } from "lucide-react";
import { AccountSwitcher } from "@/components/layout/AccountSwitcher";
import { Button } from "@/components/ui/Button";
import { useSettingsStore, resolveTheme } from "@/store/settings";

export function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const theme = useSettingsStore((state) => state.theme);
  const update = useSettingsStore((state) => state.update);
  const resolved = resolveTheme(theme);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const q = String(data.get("q") ?? "").trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  const params = new URLSearchParams(location.search);
  const defaultQuery = location.pathname === "/search" ? params.get("q") ?? "" : "";

  return (
    <header className="flex h-14 items-center gap-3 border-b border-line bg-surface/80 px-4 backdrop-blur">
      <form onSubmit={onSearch} className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          name="q"
          defaultValue={defaultQuery}
          placeholder="Search across all Gmail accounts..."
          className="h-9 w-full rounded-lg border border-line bg-canvas-muted pr-16 pl-9 text-sm placeholder:text-muted"
        />
        <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded-md border border-line bg-surface px-1.5 py-0.5 text-[10px] text-muted sm:block">
          ⌘K
        </kbd>
      </form>
      <AccountSwitcher />
      <Button variant="secondary" size="icon" onClick={() => navigate("/compose")}>
        <PenLine className="size-4" />
        <span className="sr-only">Compose</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => update({ theme: resolved === "dark" ? "light" : "dark" })}
        aria-label={resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {resolved === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>
    </header>
  );
}
