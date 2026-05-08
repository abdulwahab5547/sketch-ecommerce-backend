import { Router } from "express";
import crypto from "node:crypto";
import {
  Product,
  VALID_CATEGORIES,
  VALID_STATUSES,
  VALID_MOTIFS,
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
  if (body.category !== undefined && !VALID_CATEGORIES.includes(body.category)) {
    errors.push(`category must be one of ${VALID_CATEGORIES.join(", ")}`);
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
  if (body.palette !== undefined && body.palette !== null) {
    if (!Array.isArray(body.palette) || (body.palette.length !== 0 && body.palette.length !== 3)) {
      errors.push("palette must be an array of 3 hex colors (or empty)");
    }
  }
  return errors;
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

    const doc = await Product.create({
      _id: id,
      title: body.title,
      category: body.category,
      series: body.series,
      medium: body.medium ?? null,
      size: body.size ?? null,
      year: body.year ?? null,
      edition: body.edition ?? "Original, 1 of 1",
      price: Number(body.price),
      status: body.status ?? "available",
      motif: body.motif || null,
      palette: body.palette ?? [],
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
    ];
    const update = {};
    for (const f of allowed) {
      if (body[f] !== undefined) {
        update[f] = f === "price" ? Number(body[f]) : body[f];
      }
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
