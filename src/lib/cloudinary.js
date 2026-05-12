// Thin wrapper around the Cloudinary SDK.
// Auto-configures from env vars on first import.
import { v2 as cloudinary } from "cloudinary";

let configured = false;

export function ensureCloudinary() {
  if (configured) return cloudinary;
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    const err = new Error(
      "Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in the backend env."
    );
    err.status = 500;
    throw err;
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  configured = true;
  return cloudinary;
}

export function uploadBufferToCloudinary(buffer, { folder, publicId } = {}) {
  const cld = ensureCloudinary();
  return new Promise((resolve, reject) => {
    const opts = {
      folder: folder || process.env.CLOUDINARY_FOLDER || "sketch-ecommerce/products",
      resource_type: "image",
    };
    if (publicId) opts.public_id = publicId;
    const stream = cld.uploader.upload_stream(opts, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

export async function destroyAsset(publicId) {
  if (!publicId) return null;
  const cld = ensureCloudinary();
  return cld.uploader.destroy(publicId, { resource_type: "image" });
}
