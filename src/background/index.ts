import { REFRESH_ALARM } from "@/config";
import { isRuntimeMessage } from "@/types/messages";
import {
  connectGoogleAccount,
  disconnectAccount,
  exchangeGoogleAuthCodeDirect,
  reauthenticateAccount,
} from "@/auth/oauth";
import { serializeAuthError } from "@/auth/bridge";

chrome.runtime.onInstalled.addListener(() => {
  void chrome.alarms.create(REFRESH_ALARM, { periodInMinutes: 15 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== REFRESH_ALARM) return;
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isRuntimeMessage(message)) return;

  if (message.type === "OPEN_DASHBOARD") {
    const hash = message.hash?.startsWith("#")
      ? message.hash
      : `#${message.hash ?? "/"}`;
    const url = chrome.runtime.getURL(`src/dashboard/index.html${hash}`);
    void chrome.tabs.create({ url });
    sendResponse({ ok: true });
    return;
  }

  if (message.type === "EXCHANGE_OAUTH_CODE") {
    void exchangeGoogleAuthCodeDirect({
      clientId: message.clientId,
      code: message.code,
      verifier: message.verifier,
      redirectUri: message.redirectUri,
    })
      .then((tokens) => sendResponse({ ok: true, tokens }))
      .catch((error) => sendResponse(serializeAuthError(error)));
    return true;
  }

  if (message.type === "CONNECT_GOOGLE") {
    void connectGoogleAccount()
      .then((account) => sendResponse({ ok: true, account }))
      .catch((error) => sendResponse(serializeAuthError(error)));
    return true;
  }

  if (message.type === "REAUTH_GOOGLE") {
    void reauthenticateAccount(message.accountId, message.clientId)
      .then((account) => sendResponse({ ok: true, account }))
      .catch((error) => sendResponse(serializeAuthError(error)));
    return true;
  }

  if (message.type === "DISCONNECT_GOOGLE") {
    void disconnectAccount(message.accountId)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse(serializeAuthError(error)));
    return true;
  }
});
