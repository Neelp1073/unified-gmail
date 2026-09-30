import { defineManifest } from "@crxjs/vite-plugin";

/**
 * Public key that pins the unpacked extension ID to:
 * fiigkankdkfhojbdcdlgdhhhaepnlmim
 *
 * Register this ID in Google Cloud as the Chrome extension item ID.
 * OAuth redirect: https://fiigkankdkfhojbdcdlgdhhhaepnlmim.chromiumapp.org/
 */
const EXTENSION_PUBLIC_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArRsAh0DS8w+No8xfJT8/ele/irX5xI+IHIoneDaxvn7Y0RCpmDPIUWKHKDlzPA2AeBDZenyRAzjvYXu1v2YIDiqyVCxidjF20EbbcSzi47bMIZfl1XRwfB0Oyh0YefFAo4oPrrG8e2FRuvQGHSdSF5NPuCYLxw9dHex99ZJP9PwznVzepPgHRq9R6CsMH+kBBGxBzNAAj775h3r7rwbzObzqibdv9Oavf/rRTj5EXdFTWk+UBwqOFlFUcRkfCygEEIcBP7WoxpcrEsMFGqC+9q6tOHIr/kpx9WzjHiGyeycZTM0isz2w1pjClfXRm/4zRd269NAs0hab0LlZ4s9IKwIDAQAB";

export default defineManifest({
  manifest_version: 3,
  name: "Unified Gmail",
  short_name: "Unified Gmail",
  version: "0.1.0",
  description:
    "One interface for multiple Gmail accounts. Accounts stay separate — this aggregates views, not Google storage quotas.",
  key: EXTENSION_PUBLIC_KEY,
  minimum_chrome_version: "116",
  icons: {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png",
  },
  action: {
    default_title: "Unified Gmail",
    default_popup: "src/popup/index.html",
    default_icon: {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
    },
  },
  options_page: "src/dashboard/index.html",
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  permissions: ["identity", "storage", "alarms", "notifications"],
  host_permissions: [
    "https://www.googleapis.com/*",
    "https://gmail.googleapis.com/*",
    "https://accounts.google.com/*",
    "https://oauth2.googleapis.com/*",
  ],
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'",
  },
});
