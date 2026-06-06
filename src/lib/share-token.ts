import crypto from "crypto";

const SECRET = process.env.SHARE_LINK_SECRET || "travelmapper-default-share-secret-2026";

export function generateShareToken(scheduleId: string): string {
  const hmac = crypto.createHmac("sha256", SECRET).update(scheduleId).digest("hex").slice(0, 16);
  const payload = `${scheduleId}:${hmac}`;
  return Buffer.from(payload).toString("base64url");
}

export function verifyShareToken(token: string): string | null {
  try {
    const payload = Buffer.from(token, "base64url").toString("utf-8");
    const [scheduleId, hmac] = payload.split(":");
    if (!scheduleId || !hmac) return null;

    const expected = crypto.createHmac("sha256", SECRET).update(scheduleId).digest("hex").slice(0, 16);
    if (hmac !== expected) return null;

    return scheduleId;
  } catch {
    return null;
  }
}
