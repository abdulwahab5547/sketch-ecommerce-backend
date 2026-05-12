// Admin-only image upload endpoint. Accepts a single multipart "image" field
// (max 8 MB), forwards it to Cloudinary, returns the secure URL + public_id.
// The admin product form then writes those values to the product document.
import { Router } from "express";
import multer from "multer";
import { uploadBufferToCloudinary, destroyAsset } from "../lib/cloudinary.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  },
});

router.post(
  "/image",
  requireAuth,
  requireAdmin,
  upload.single("image"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided (field name must be 'image')" });
      }
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: req.body.folder || undefined,
      });
      res.json({
        imageUrl: result.secure_url,
        cloudinaryPublicId: result.public_id,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        format: result.format,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/image/:publicId(*)",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const result = await destroyAsset(req.params.publicId);
      res.json({ ok: true, result });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
