import { Router } from "express";
import { About, getAbout } from "../models/About.js";
import { VALID_MOTIFS } from "../models/Product.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

function validate(body) {
  const errors = [];
  if (body.bio !== undefined) {
    if (typeof body.bio !== "object" || body.bio === null) {
      errors.push("bio must be an object");
    } else if (body.bio.beginnings !== undefined && !Array.isArray(body.bio.beginnings)) {
      errors.push("bio.beginnings must be an array of strings");
    }
  }
  if (body.journey !== undefined) {
    if (!Array.isArray(body.journey)) {
      errors.push("journey must be an array");
    } else {
      body.journey.forEach((y, i) => {
        if (!y || typeof y !== "object") {
          errors.push(`journey[${i}] must be an object`);
          return;
        }
        if (!y.year || !String(y.year).trim()) {
          errors.push(`journey[${i}].year is required`);
        }
        if (y.works !== undefined && !Array.isArray(y.works)) {
          errors.push(`journey[${i}].works must be an array`);
        } else if (Array.isArray(y.works)) {
          y.works.forEach((w, j) => {
            if (!w.title || !String(w.title).trim()) {
              errors.push(`journey[${i}].works[${j}].title is required`);
            }
            if (w.motif && !VALID_MOTIFS.includes(w.motif)) {
              errors.push(
                `journey[${i}].works[${j}].motif must be one of ${VALID_MOTIFS.join(", ")}`
              );
            }
            if (w.palette && (!Array.isArray(w.palette) || (w.palette.length !== 0 && w.palette.length !== 3))) {
              errors.push(`journey[${i}].works[${j}].palette must be 0 or 3 hex colors`);
            }
          });
        }
      });
    }
  }
  return errors;
}

function normalizeWork(w) {
  return {
    title: String(w.title || "").trim(),
    motif: w.motif || null,
    palette: Array.isArray(w.palette) ? w.palette : [],
  };
}

function normalizeJourney(arr) {
  return (Array.isArray(arr) ? arr : []).map((y) => ({
    year: String(y.year || "").trim(),
    chapter: y.chapter ? String(y.chapter).trim() : "",
    note: y.note ? String(y.note) : "",
    works: Array.isArray(y.works) ? y.works.map(normalizeWork) : [],
  }));
}

// ---------- Public (read) ----------

router.get("/", async (_req, res, next) => {
  try {
    const doc = await getAbout();
    res.json({ about: doc.toJSON() });
  } catch (err) {
    next(err);
  }
});

// ---------- Admin (write) ----------

router.put("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = validate(body);
    if (errors.length) return res.status(400).json({ error: errors.join("; ") });

    const update = {};
    if (body.bio !== undefined) {
      update.bio = {
        hero: body.bio.hero ? String(body.bio.hero) : "",
        intro: body.bio.intro ? String(body.bio.intro) : "",
        beginnings: Array.isArray(body.bio.beginnings)
          ? body.bio.beginnings.map((p) => String(p))
          : [],
      };
    }
    if (body.journey !== undefined) {
      update.journey = normalizeJourney(body.journey);
    }

    const doc = await About.findOneAndUpdate(
      { _id: "main" },
      { $set: update, $setOnInsert: { _id: "main" } },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ about: doc.toJSON() });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

export default router;
