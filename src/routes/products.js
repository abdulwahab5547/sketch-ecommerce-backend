import { Router } from "express";
import crypto from "node:crypto";
import {
  Product,
  VALID_STATUSES,
  VALID_MOTIFS,
  VALID_ORIENTATIONS,
} from "../models/Product.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function generateId(title) {
  const base = slugify(title) || "piece";
  const suffix = crypto.randomBytes(2).toString("hex");
  return `${base}-${suffix}`;
}

function validateProduct(body, { partial = false } = {}) {
  const errors = [];
  const required = ["title", "category", "series", "price"];
  for (const k of required) {
    if (!partial && (body[k] === undefined || body[k] === null || body[k] === "")) {
      errors.push(`${k} is required`);
    }
  }
  // category is admin-managed (Taxonomy) — any non-empty value is accepted.
  if (body.category !== undefined && !String(body.category).trim()) {
    errors.push("category is required");
  }
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    errors.push(`status must be one of ${VALID_STATUSES.join(", ")}`);
  }
  if (body.motif !== undefined && body.motif !== null && body.motif !== "" && !VALID_MOTIFS.includes(body.motif)) {
    errors.push(`motif must be one of ${VALID_MOTIFS.join(", ")}`);
  }
  if (body.price !== undefined && (Number.isNaN(Number(body.price)) || Number(body.price) < 0)) {
    errors.push("price must be a non-negative number");
  }
  if (body.quantity !== undefined && body.quantity !== null && body.quantity !== "" &&
      (Number.isNaN(Number(body.quantity)) || Number(body.quantity) < 0)) {
    errors.push("quantity must be a non-negative number");
  }
  if (body.orientation !== undefined && body.orientation !== null && body.orientation !== "" &&
      !VALID_ORIENTATIONS.includes(body.orientation)) {
    errors.push(`orientation must be one of ${VALID_ORIENTATIONS.join(", ")}`);
  }
  if (body.images !== undefined && body.images !== null && !Array.isArray(body.images)) {
    errors.push("images must be an array of { url, publicId }");
  }
  if (body.palette !== undefined && body.palette !== null) {
    if (!Array.isArray(body.palette) || (body.palette.length !== 0 && body.palette.length !== 3)) {
      errors.push("palette must be an array of 3 hex colors (or empty)");
    }
  }
  return errors;
}

// Build a clean, ordered images array from whatever the client sent. Falls
// back to the legacy single imageUrl/cloudinaryPublicId pair when no gallery
// is provided, so older clients keep working.
function normalizeImages(body) {
  if (Array.isArray(body.images)) {
    return body.images
      .filter((im) => im && typeof im.url === "string" && im.url.trim())
      .map((im) => ({ url: im.url.trim(), publicId: im.publicId || null }));
  }
  if (body.imageUrl) {
    return [{ url: String(body.imageUrl), publicId: body.cloudinaryPublicId || null }];
  }
  return [];
}

// ---------- Public (read) ----------

router.get("/", async (req, res, next) => {
  try {
    const { category, series, status } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (series) filter.series = series;
    if (status) filter.status = status;
    const docs = await Product.find(filter).sort({ createdAt: -1 });
    res.json({ products: docs.map((d) => d.toJSON()) });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const doc = await Product.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ product: doc.toJSON() });
  } catch (err) {
    next(err);
  }
});

// ---------- Admin (write) ----------

router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = validateProduct(body);
    if (errors.length) return res.status(400).json({ error: errors.join("; ") });

    const id = body.id?.trim() || generateId(body.title);
    const exists = await Product.exists({ _id: id });
    if (exists) {
      return res.status(409).json({ error: `Product id "${id}" already exists` });
    }

    const images = normalizeImages(body);
    const doc = await Product.create({
      _id: id,
      title: body.title,
      category: body.category,
      series: body.series,
      medium: body.medium ?? null,
      size: body.size ?? null,
      year: body.year ?? null,
      edition: body.edition ?? "Original, 1 of 1",
      quantity: body.quantity === undefined || body.quantity === "" ? 1 : Number(body.quantity),
      orientation: body.orientation || "portrait",
      price: Number(body.price),
      status: body.status ?? "available",
      motif: body.motif || null,
      palette: body.palette ?? [],
      images,
      // Keep the legacy single-image fields in sync with the main picture.
      imageUrl: images[0]?.url ?? null,
      cloudinaryPublicId: images[0]?.publicId ?? null,
    });

    res.status(201).json({ product: doc.toJSON() });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

router.put("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = validateProduct(body, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join("; ") });

    const allowed = [
      "title", "category", "series", "medium", "size",
      "year", "edition", "price", "status", "motif", "palette",
      "orientation",
    ];
    const update = {};
    for (const f of allowed) {
      if (body[f] !== undefined) {
        update[f] = f === "price" ? Number(body[f]) : body[f];
      }
    }
    if (body.quantity !== undefined) {
      update.quantity = body.quantity === "" ? 1 : Number(body.quantity);
    }
    // When images (or the legacy single-image fields) are sent, rebuild the
    // gallery and re-sync the main-picture mirror fields.
    if (body.images !== undefined || body.imageUrl !== undefined) {
      const images = normalizeImages(body);
      update.images = images;
      update.imageUrl = images[0]?.url ?? null;
      update.cloudinaryPublicId = images[0]?.publicId ?? null;
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const doc = await Product.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ product: doc.toJSON() });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const result = await Product.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
