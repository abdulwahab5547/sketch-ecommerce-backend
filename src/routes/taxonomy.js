import { Router } from "express";
import { Taxonomy, getTaxonomy, slugifyKey } from "../models/Taxonomy.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// Normalize the categories array: every category needs a unique key (derived
// from the name when not supplied) and a display name.
function normalizeCategories(arr) {
  const out = [];
  const seen = new Set();
  (Array.isArray(arr) ? arr : []).forEach((c) => {
    if (!c || typeof c !== "object") return;
    const name = String(c.name || "").trim();
    if (!name) return;
    let key = slugifyKey(c.key || name) || slugifyKey(name);
    if (!key) return;
    // Ensure uniqueness.
    let base = key, n = 2;
    while (seen.has(key)) key = `${base}-${n++}`;
    seen.add(key);
    out.push({ key, name });
  });
  return out;
}

// Normalize series: each needs a name and a category key. Series whose
// category no longer exists are dropped.
function normalizeSeries(arr, categoryKeys) {
  const out = [];
  const seen = new Set();
  (Array.isArray(arr) ? arr : []).forEach((s) => {
    if (!s || typeof s !== "object") return;
    const name = String(s.name || "").trim();
    const category = String(s.category || "").trim();
    if (!name || !category) return;
    if (categoryKeys.size && !categoryKeys.has(category)) return;
    const dedupe = `${category}::${name.toLowerCase()}`;
    if (seen.has(dedupe)) return;
    seen.add(dedupe);
    out.push({ name, category });
  });
  return out;
}

// ---------- Public (read) ----------

router.get("/", async (_req, res, next) => {
  try {
    const doc = await getTaxonomy();
    res.json({ taxonomy: doc.toJSON() });
  } catch (err) {
    next(err);
  }
});

// ---------- Admin (write) ----------

router.put("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};
    const update = {};
    let categoryKeys = null;

    if (body.categories !== undefined) {
      const categories = normalizeCategories(body.categories);
      update.categories = categories;
      categoryKeys = new Set(categories.map((c) => c.key));
    }
    if (body.series !== undefined) {
      // If categories weren't sent in this request, validate against existing.
      if (!categoryKeys) {
        const existing = await getTaxonomy();
        categoryKeys = new Set((existing.categories || []).map((c) => c.key));
      }
      update.series = normalizeSeries(body.series, categoryKeys);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    const doc = await Taxonomy.findOneAndUpdate(
      { _id: "main" },
      { $set: update, $setOnInsert: { _id: "main" } },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ taxonomy: doc.toJSON() });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

export default router;
