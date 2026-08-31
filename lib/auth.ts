export const SESSION_COOKIE = "devforge_session";

const SESSION_MESSAGE = "devforge-session-v1";
const encoder = new TextEncoder();

function password() {
  const value = process.env.DEVFORGE_PASSWORD;
  if (!value) {
    throw new Error("DEVFORGE_PASSWORD is required");
  }
  return value;
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function digest(value: string) {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

export async function acceptsPassword(candidate: string) {
  return timingSafeEqual(await digest(candidate), await digest(password()));
}

export async function sessionToken() {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(SESSION_MESSAGE)));
}

export async function acceptsSession(candidate: string | undefined) {
  return candidate !== undefined && timingSafeEqual(candidate, await sessionToken());
}
