const PREFIX = "unified-gmail:";

type ChangeListener = (changes: Record<string, chrome.storage.StorageChange>) => void;

function hasChromeStorage(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

export async function storageGet<T>(key: string, fallback: T): Promise<T> {
  const namespaced = PREFIX + key;
  if (!hasChromeStorage()) {
    const raw = localStorage.getItem(namespaced);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
  const result = await chrome.storage.local.get(namespaced);
  return (result[namespaced] as T | undefined) ?? fallback;
}

export async function storageSet<T>(key: string, value: T): Promise<void> {
  const namespaced = PREFIX + key;
  if (!hasChromeStorage()) {
    localStorage.setItem(namespaced, JSON.stringify(value));
    return;
  }
  await chrome.storage.local.set({ [namespaced]: value });
}

export async function storageRemove(key: string): Promise<void> {
  const namespaced = PREFIX + key;
  if (!hasChromeStorage()) {
    localStorage.removeItem(namespaced);
    return;
  }
  await chrome.storage.local.remove(namespaced);
}

export async function storageClearAppData(): Promise<void> {
  if (!hasChromeStorage()) {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith(PREFIX));
    keys.forEach((key) => localStorage.removeItem(key));
    return;
  }
  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter((key) => key.startsWith(PREFIX));
  if (keys.length) await chrome.storage.local.remove(keys);
}

export function subscribeStorage(listener: ChangeListener): () => void {
  if (!hasChromeStorage()) return () => undefined;
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
