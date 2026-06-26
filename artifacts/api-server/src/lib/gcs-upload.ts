/**
 * Shared GCS upload helper.
 *
 * Used by any route that needs to upload a file buffer to Google Cloud Storage
 * and store the resulting public URL. Enforces:
 *   - MIME allowlist
 *   - Extension allowlist (guards against MIME-header spoofing)
 *   - Content-Type metadata set on the GCS object
 *   - Cache-Control: no-transform, max-age=3600
 *   - Returns the public HTTPS URL of the uploaded object
 *
 * Company logo upload TODO: delete previous logo_url from GCS before overwriting.
 */
import { Storage } from "@google-cloud/storage";
import path from "path";

const storageClient = new Storage();
export const BUCKET_NAME =
  process.env.GCS_LISTING_IMAGES_BUCKET || "tadweerah-staging-listing-images";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export type UploadResult = {
  publicUrl: string;
};

export type GcsUploadOptions = {
  /** The file buffer to upload */
  buffer: Buffer;
  /** The original filename (used for extension validation and to derive GCS filename) */
  originalname: string;
  /** The MIME type as reported by the client (validated against allowlist) */
  mimetype: string;
  /** The destination path within the bucket, e.g. "companies/{id}/logo-1234.png" */
  destinationPath: string;
};

/**
 * Validates and uploads a file buffer to GCS.
 * Throws an error with a descriptive message if validation fails.
 * Returns { publicUrl } on success.
 */
export async function uploadToGcs(options: GcsUploadOptions): Promise<UploadResult> {
  const { buffer, originalname, mimetype, destinationPath } = options;

  // 1. Validate MIME type from client header
  if (!ALLOWED_MIME_TYPES.has(mimetype)) {
    throw new Error(
      `Unsupported file type: ${mimetype}. Allowed: jpeg, png, webp.`
    );
  }

  // 2. Validate extension from original filename (guards against MIME spoofing)
  const ext = path.extname(originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(
      `Unsupported file extension: ${ext}. Allowed: .jpg, .jpeg, .png, .webp.`
    );
  }

  // 3. Upload to GCS with explicit content-type and cache-control
  const blob = storageClient.bucket(BUCKET_NAME).file(destinationPath);

  const stream = blob.createWriteStream({
    resumable: false,
    metadata: {
      contentType: mimetype,
      cacheControl: "no-transform, max-age=3600",
    },
  });

  await new Promise<void>((resolve, reject) => {
    stream.on("error", (err) => reject(err));
    stream.on("finish", () => resolve());
    stream.end(buffer);
  });

  // 4. Return the public HTTPS URL
  const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${destinationPath}`;
  return { publicUrl };
}
