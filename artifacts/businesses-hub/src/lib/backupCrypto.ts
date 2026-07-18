const ENCRYPTED_SCHEMA = "businesses-hub-export-encrypted";
const PBKDF2_ITERATIONS = 310000;

export interface EncryptedBackup {
  schema: typeof ENCRYPTED_SCHEMA;
  version: 1;
  exportedAt: string;
  kdf: { name: "PBKDF2"; hash: "SHA-256"; iterations: number };
  cipher: "AES-GCM";
  salt: string;
  iv: string;
  ciphertext: string;
}

export type PasswordStrength = "weak" | "okay" | "strong";

export function scorePasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return "weak";
  let variety = 0;
  if (/[a-z]/.test(password)) variety++;
  if (/[A-Z]/.test(password)) variety++;
  if (/[0-9]/.test(password)) variety++;
  if (/[^a-zA-Z0-9]/.test(password)) variety++;
  if (/^(.)\1+$/.test(password)) return "weak";
  if (password.length >= 12 && variety >= 3) return "strong";
  if (password.length >= 10 && variety >= 2) return "strong";
  if (variety >= 2 || password.length >= 10) return "okay";
  return "weak";
}

export function isEncryptedBackup(parsed: unknown): parsed is EncryptedBackup {
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    (parsed as { schema?: unknown }).schema === ENCRYPTED_SCHEMA &&
    typeof (parsed as { ciphertext?: unknown }).ciphertext === "string" &&
    typeof (parsed as { salt?: unknown }).salt === "string" &&
    typeof (parsed as { iv?: unknown }).iv === "string"
  );
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptBackup(plaintextJson: string, password: string): Promise<EncryptedBackup> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintextJson),
  );
  return {
    schema: ENCRYPTED_SCHEMA,
    version: 1,
    exportedAt: new Date().toISOString(),
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations: PBKDF2_ITERATIONS },
    cipher: "AES-GCM",
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptBackup(encrypted: EncryptedBackup, password: string): Promise<string> {
  const salt = fromBase64(encrypted.salt);
  const iv = fromBase64(encrypted.iv);
  const iterations = encrypted.kdf?.iterations || PBKDF2_ITERATIONS;
  const key = await deriveKey(password, salt, iterations);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    fromBase64(encrypted.ciphertext) as BufferSource,
  );
  return new TextDecoder().decode(plaintext);
}
