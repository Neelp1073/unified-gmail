export function openDashboard(hash = "/"): void {
  const path = hash.startsWith("#") ? hash : `#${hash.startsWith("/") ? hash : `/${hash}`}`;
  const url = chrome.runtime.getURL(`src/dashboard/index.html${path}`);
  void chrome.tabs.create({ url });
}
