import crypto from 'crypto';
import fs from 'fs';
import { env } from '../config/env';

const TEXT_PREFIX = 'enc:v1:';
const FILE_MAGIC = Buffer.from('MRENC1', 'ascii'); // 6 bytes
const IV_LENGTH = 12; // 96-bit IV recommended by NIST for AES-256-GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

let cachedVaultKey: Buffer | null = null;

/**
 * Derive deterministic 256-bit encryption key for PII & eKYC at-rest protection.
 * Uses dedicated PII_ENCRYPTION_KEY if configured, otherwise derives safely from JWT_SECRET
 * with domain-separated salt via scrypt.
 */
const getVaultKey = (): Buffer => {
  if (cachedVaultKey) return cachedVaultKey;
  const masterSecret = (process.env.PII_ENCRYPTION_KEY || env.JWT_SECRET).trim();
  cachedVaultKey = crypto.scryptSync(masterSecret, 'motorent-pii-vault-salt-v1', 32);
  return cachedVaultKey;
};

/**
 * Encrypt sensitive string field (e.g. CCCD / ID card number) with AES-256-GCM.
 * Idempotent: already-encrypted strings (prefixed with enc:v1:) are returned unchanged.
 */
export const encryptPiiText = (plaintext?: string | null): string => {
  if (!plaintext) return '';
  const trimmed = plaintext.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith(TEXT_PREFIX)) return trimmed;

  const key = getVaultKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(trimmed, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${TEXT_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

/**
 * Decrypt sensitive string field encrypted by encryptPiiText.
 * Backward-compatible: legacy plaintext values not starting with enc:v1: are returned as-is.
 */
export const decryptPiiText = (storedValue?: string | null): string => {
  if (!storedValue) return '';
  const trimmed = storedValue.trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith(TEXT_PREFIX)) return trimmed;

  try {
    const payload = trimmed.slice(TEXT_PREFIX.length);
    const parts = payload.split(':');
    if (parts.length !== 3) return '';

    const [ivHex, tagHex, cipherHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const ciphertext = Buffer.from(cipherHex, 'hex');

    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      return '';
    }

    const key = getVaultKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
};

/**
 * Check whether a buffer carries the MRENC1 encrypted file header.
 */
export const isEncryptedFileBuffer = (buf: Buffer): boolean => {
  if (!buf || buf.length < FILE_MAGIC.length + IV_LENGTH + AUTH_TAG_LENGTH) {
    return false;
  }
  return buf.subarray(0, FILE_MAGIC.length).equals(FILE_MAGIC);
};

/**
 * Encrypt binary document buffer (CCCD / GPLX / Selfie) with AES-256-GCM.
 * Binary layout: [6B "MRENC1"][12B IV][16B AuthTag][Ciphertext...]
 */
export const encryptFileBuffer = (plainBuffer: Buffer): Buffer => {
  if (isEncryptedFileBuffer(plainBuffer)) {
    return plainBuffer;
  }
  const key = getVaultKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([FILE_MAGIC, iv, authTag, encrypted]);
};

/**
 * Decrypt binary document buffer encrypted by encryptFileBuffer.
 * Backward-compatible: legacy unencrypted image buffers are returned untouched.
 */
export const decryptFileBuffer = (storedBuffer: Buffer): Buffer => {
  if (!isEncryptedFileBuffer(storedBuffer)) {
    return storedBuffer;
  }
  const offsetIv = FILE_MAGIC.length;
  const offsetTag = offsetIv + IV_LENGTH;
  const offsetCipher = offsetTag + AUTH_TAG_LENGTH;

  const iv = storedBuffer.subarray(offsetIv, offsetTag);
  const authTag = storedBuffer.subarray(offsetTag, offsetCipher);
  const ciphertext = storedBuffer.subarray(offsetCipher);

  const key = getVaultKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
};

/**
 * Atomically encrypt a validated eKYC file in place on disk so raw image bytes
 * never remain readable at rest in private_uploads/ekyc.
 */
export const encryptFileInPlace = async (filePath: string): Promise<void> => {
  const raw = await fs.promises.readFile(filePath);
  if (isEncryptedFileBuffer(raw)) return;
  const encrypted = encryptFileBuffer(raw);
  const tmpPath = `${filePath}.enc.tmp`;
  await fs.promises.writeFile(tmpPath, encrypted, { mode: 0o600 });
  await fs.promises.rename(tmpPath, filePath);
};
