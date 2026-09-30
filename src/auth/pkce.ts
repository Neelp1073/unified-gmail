function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function randomUrlSafe(byteLength = 32): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function createPkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomUrlSafe(32);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return { verifier, challenge: bytesToBase64Url(new Uint8Array(digest)) };
}
