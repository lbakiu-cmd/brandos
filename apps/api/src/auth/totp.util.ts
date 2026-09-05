import * as crypto from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Encodes a buffer to a Base32 string (RFC 4648)
 */
export function bufferToBase32(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes a Base32 string into a Buffer
 */
export function base32ToBuffer(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/=+$/, "").replace(/[\s-]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) {
      continue;
    }

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates a random Base32 secret for Google Authenticator (default 20 bytes = 160 bits)
 */
export function generateTotpSecret(byteLength = 20): string {
  const bytes = crypto.randomBytes(byteLength);
  return bufferToBase32(bytes);
}

/**
 * Generates the 6-digit TOTP code for a secret at a specific time step offset
 */
export function generateTotpToken(secret: string, timeStep = 30, offset = 0): string {
  const key = base32ToBuffer(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const time = Math.floor(epoch / timeStep) + offset;

  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(time));

  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const dynamicOffset = hmac[hmac.length - 1] & 0x0f;

  const binary =
    ((hmac[dynamicOffset] & 0x7f) << 24) |
    ((hmac[dynamicOffset + 1] & 0xff) << 16) |
    ((hmac[dynamicOffset + 2] & 0xff) << 8) |
    (hmac[dynamicOffset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, "0");
}

/**
 * Verifies a 6-digit TOTP token against a secret with a window drift tolerance (default ±1 window = ±30 seconds)
 */
export function verifyTotpToken(secret: string, token: string, window = 1, timeStep = 30): boolean {
  if (!secret || !token) return false;
  const cleanToken = token.trim().replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleanToken)) return false;

  for (let offset = -window; offset <= window; offset++) {
    const generated = generateTotpToken(secret, timeStep, offset);
    if (crypto.timingSafeEqual(Buffer.from(generated), Buffer.from(cleanToken))) {
      return true;
    }
  }

  return false;
}

/**
 * Generates standard backup recovery codes
 */
export function generateBackupCodes(count = 6): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const p1 = Math.floor(1000 + Math.random() * 9000);
    const p2 = Math.floor(1000 + Math.random() * 9000);
    codes.push(`BRANDOS-${p1}-${p2}`);
  }
  return codes;
}

/**
 * Builds the standard otpauth URI formatted for QR code generation
 */
export function getOtpAuthUrl({
  issuer = "BrandOS Eye",
  accountName,
  secret,
}: {
  issuer?: string;
  accountName: string;
  secret: string;
}): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}
