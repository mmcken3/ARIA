/**
 * AES-256-GCM token encryption for OAuth access/refresh tokens.
 *
 * Tokens are encrypted before every DB write and decrypted only in
 * server-side contexts (API routes, background jobs). Never log raw values.
 *
 * Key setup: generate with `openssl rand -hex 32` and set TOKEN_ENCRYPTION_KEY.
 *
 * Wire-format: "<iv_hex>:<tag_hex>:<ciphertext_hex>" — all three parts required.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

function getKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex) throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex characters)");
  }
  return key;
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV — GCM standard
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag(); // 128-bit auth tag
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptToken(value: string): string {
  const key = getKey();
  const parts = value.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted token format");
  const [ivHex, tagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
}
