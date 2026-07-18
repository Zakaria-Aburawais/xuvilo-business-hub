import { Storage, type Bucket } from "@google-cloud/storage";
import { randomUUID } from "node:crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

let storageClient: Storage | null = null;
let bucketHandle: Bucket | null = null;

function getStorage(): Storage {
  if (storageClient) return storageClient;
  storageClient = new Storage({
    credentials: {
      audience: "replit",
      subject_token_type: "access_token",
      token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
      type: "external_account",
      credential_source: {
        url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
        format: { type: "json", subject_token_field_name: "access_token" },
      },
      universe_domain: "googleapis.com",
    },
    projectId: "",
  });
  return storageClient;
}

function getBucket(): Bucket {
  if (bucketHandle) return bucketHandle;
  const bucketId = process.env["DEFAULT_OBJECT_STORAGE_BUCKET_ID"];
  if (!bucketId) throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
  bucketHandle = getStorage().bucket(bucketId);
  return bucketHandle;
}

function getPrivateRoot(): string {
  const dir = process.env["PRIVATE_OBJECT_DIR"];
  if (!dir) throw new Error("PRIVATE_OBJECT_DIR not set");
  return dir.endsWith("/") ? dir.slice(0, -1) : dir;
}

/** Build the storage object path for a given user + purpose. */
export function buildStorageKey(userId: string, purpose: string, filename: string): string {
  const safeName = filename.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 200);
  const id = randomUUID();
  const root = getPrivateRoot();
  // Strip the bucket prefix if present in PRIVATE_OBJECT_DIR (format `/<bucket>/<dir>`)
  const noBucket = root.startsWith("/") ? root.split("/").slice(2).join("/") : root;
  const base = noBucket || "private";
  return `${base}/users/${userId}/${purpose}/${id}-${safeName}`;
}

/** Upload bytes to object storage. */
export async function putObject(
  storageKey: string,
  data: Buffer,
  contentType: string,
): Promise<void> {
  const file = getBucket().file(storageKey);
  await file.save(data, {
    contentType,
    resumable: false,
    metadata: { contentType },
  });
}

/** Download bytes from object storage. */
export async function getObject(storageKey: string): Promise<Buffer> {
  const file = getBucket().file(storageKey);
  const [contents] = await file.download();
  return contents;
}

/** Generate a short-lived signed URL for browser download. */
export async function getSignedDownloadUrl(
  storageKey: string,
  filename: string,
  ttlSeconds = 600,
): Promise<string> {
  const file = getBucket().file(storageKey);
  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + ttlSeconds * 1000,
    responseDisposition: `attachment; filename="${filename.replace(/"/g, "")}"`,
  });
  return url;
}

/** Delete an object. Best-effort. */
export async function deleteObject(storageKey: string): Promise<void> {
  try {
    await getBucket().file(storageKey).delete({ ignoreNotFound: true });
  } catch {
    /* swallow */
  }
}
