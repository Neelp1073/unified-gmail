# Unified Gmail

A Manifest V3 Chrome/Edge extension that gives you **one interface** for multiple Gmail accounts.

Google accounts stay separate. This app does **not** merge storage quotas, scrape gmail.com, or send mail through a custom backend. It talks to Google APIs from the extension.

Combined capacity numbers are labeled as an aggregation of separate accounts.

## Stage 1 status

Working now:

- Vite + React + TypeScript + Tailwind
- Dashboard, popup, settings, and navigation shell
- Light / dark / system theme
- Account switcher, empty states, toasts, confirm dialogs
- Local settings persistence via `chrome.storage.local`

Not in this stage:

- Google OAuth sign-in (Stage 2)
- Live Gmail / storage data

## Load the extension

```bash
pnpm install
pnpm icons
pnpm dev
```

In Chrome or Edge:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked**
4. Select the `dist` folder created by Vite / CRXJS

`pnpm build` produces a production `dist/` you can load the same way.

Pinned unpacked extension ID:

`fiigkankdkfhojbdcdlgdhhhaepnlmim`

## Google Cloud configuration

Do this before Stage 2 (connecting accounts). The Client ID is **not a secret**. Never put a client secret in the extension.

### 1. Create a project

[Google Cloud Console → New project](https://console.cloud.google.com/projectcreate)

Suggested name: `Unified Gmail`

### 2. Enable APIs

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com) — used **only** for `about.get` storage quota, not for Drive files

### 3. OAuth consent screen

[APIs & Services → OAuth consent](https://console.cloud.google.com/apis/credentials/consent)

- User type: **External** (or Internal if this is a Workspace org)
- App name: Unified Gmail
- Support email and developer contact: your email
- Add **test users** for every Gmail address you will connect while the app is in Testing

Scopes to add (start with read-only):

| Scope | Why |
| --- | --- |
| `openid` | Standard sign-in |
| `https://www.googleapis.com/auth/userinfo.email` | Show which account connected |
| `https://www.googleapis.com/auth/userinfo.profile` | Display name / photo |
| `https://www.googleapis.com/auth/gmail.readonly` | Inbox, search, viewer, attachments metadata |
| `https://www.googleapis.com/auth/drive.metadata.readonly` | Storage quota via Drive `about.get` |

Later, only when those features are used:

| Scope | Why |
| --- | --- |
| `https://www.googleapis.com/auth/gmail.send` | Compose / send |
| `https://www.googleapis.com/auth/gmail.modify` | Read/unread, star, archive |

Gmail scopes are **restricted**. Personal Testing mode is enough for your own accounts. Chrome Web Store / production OAuth verification requires Google’s restricted-scope process (including a security assessment).

### 4. Create an OAuth client

[Credentials → Create credentials → OAuth client ID](https://console.cloud.google.com/apis/credentials)

Preferred type: **Chrome extension**

- Item ID: `fiigkankdkfhojbdcdlgdhhhaepnlmim`

If you use type **Web application** instead, add this authorized redirect URI:

`https://fiigkankdkfhojbdcdlgdhhhaepnlmim.chromiumapp.org/`

That URI is also available at runtime from `chrome.identity.getRedirectURL()`.

### 5. Put the Client ID in the extension

Either:

- Copy `.env.example` to `.env` and set `VITE_GOOGLE_CLIENT_ID`, then rebuild, or
- Open the dashboard → **Settings → Google API** and paste the Client ID (stored only in `chrome.storage.local`)

Do not create or paste a client secret. The extension will use PKCE + `chrome.identity.launchWebAuthFlow`.

## Privacy

```
Google APIs  →  this extension  →  your UI
```

No app server stores mail bodies, attachments, or OAuth tokens.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Extension dev build with HMR |
| `pnpm build` | Typecheck + production build |
| `pnpm typecheck` | TypeScript only |
| `pnpm lint` | ESLint |
| `pnpm icons` | Regenerate toolbar icons |

## Trademark note

The product name was requested as Unified Gmail. Google may restrict use of “Gmail” on the Chrome Web Store. Keep that in mind before a public listing.
