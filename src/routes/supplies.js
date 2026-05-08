import { Router } from "express";
import crypto from "node:crypto";
import { SupplyGroup, VALID_GLYPHS } from "../models/SupplyGroup.js";
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
  const base = slugify(title) || "group";
  const suffix = crypto.randomBytes(2).toString("hex");
  return `${base}-${suffix}`;
}

function validate(body, { partial = false } = {}) {
  const errors = [];
  if (!partial && (!body.title || !String(body.title).trim())) {
    errors.push("title is required");
  }
  if (body.glyph !== undefined && !VALID_GLYPHS.includes(body.glyph)) {
    errors.push(`glyph must be one of ${VALID_GLYPHS.join(", ")}`);
  }
  if (body.items !== undefined) {
    if (!Array.isArray(body.items)) {
      errors.push("items must be an array");
    } else {
      body.items.forEach((it, i) => {
        if (!it || typeof it !== "object") {
          errors.push(`items[${i}] must be an object`);
          return;
        }
        if (!it.brand || !String(it.brand).trim()) errors.push(`items[${i}].brand is required`);
        if (!it.name || !String(it.name).trim()) errors.push(`items[${i}].name is required`);
      });
    }
  }
  return errors;
}

function normalizeItems(items) {
  return (Array.isArray(items) ? items : []).map((it) => ({
    brand: String(it.brand || "").trim(),
    name: String(it.name || "").trim(),
    spec: it.spec ? String(it.spec).trim() : null,
    note: it.note ? String(it.note).trim() : null,
  }));
}

// ---------- Public (read) ----------

router.get("/", async (_req, res, next) => {
  try {
    const docs = await SupplyGroup.find({}).sort({ order: 1, createdAt: 1 });
    res.json({ groups: docs.map((d) => d.toJSON()) });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const doc = await SupplyGroup.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ group: doc.toJSON() });
  } catch (err) {
    next(err);
  }
});

// ---------- Admin (write) ----------

router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = validate(body);
    if (errors.length) return res.status(400).json({ error: errors.join("; ") });

    const id = body.id?.trim() || generateId(body.title);
    if (await SupplyGroup.exists({ _id: id })) {
      return res.status(409).json({ error: `Supply group "${id}" already exists` });
    }

    const doc = await SupplyGroup.create({
      _id: id,
      title: String(body.title).trim(),
      glyph: body.glyph || "tool",
      intro: body.intro || "",
      items: normalizeItems(body.items),
      order: Number.isFinite(Number(body.order)) ? Number(body.order) : 100,
    });
    res.status(201).json({ group: doc.toJSON() });
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
    const errors = validate(body, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join("; ") });

    const update = {};
    if (body.title !== undefined) update.title = String(body.title).trim();
    if (body.glyph !== undefined) update.glyph = body.glyph;
    if (body.intro !== undefined) update.intro = body.intro;
    if (body.items !== undefined) update.items = normalizeItems(body.items);
    if (body.order !== undefined && Number.isFinite(Number(body.order))) {
      update.order = Number(body.order);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const doc = await SupplyGroup.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ group: doc.toJSON() });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const result = await SupplyGroup.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
