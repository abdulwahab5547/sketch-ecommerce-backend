import { Router } from "express";
import { Studio, getStudio } from "../models/Studio.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

function validate(body) {
  const errors = [];
  if (body.process !== undefined && !Array.isArray(body.process)) {
    errors.push("process must be an array");
  } else if (Array.isArray(body.process)) {
    body.process.forEach((s, i) => {
      if (!s || typeof s !== "object" || !String(s.title || "").trim()) {
        errors.push(`process[${i}].title is required`);
      }
    });
  }
  if (body.shipped !== undefined && !Array.isArray(body.shipped)) {
    errors.push("shipped must be an array");
  } else if (Array.isArray(body.shipped)) {
    body.shipped.forEach((s, i) => {
      if (!s || typeof s !== "object" || !String(s.title || "").trim()) {
        errors.push(`shipped[${i}].title is required`);
      }
    });
  }
  return errors;
}

const str = (v) => (v === undefined || v === null ? "" : String(v));

// ---------- Public (read) ----------

router.get("/", async (_req, res, next) => {
  try {
    const doc = await getStudio();
    res.json({ studio: doc.toJSON() });
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
    if (body.eyebrow !== undefined) update.eyebrow = str(body.eyebrow);
    if (body.title !== undefined) update.title = str(body.title);
    if (body.intro !== undefined) update.intro = str(body.intro);
    if (body.shippedIntro !== undefined) update.shippedIntro = str(body.shippedIntro);
    if (body.certificateIntro !== undefined) update.certificateIntro = str(body.certificateIntro);
    if (body.certificateImageUrl !== undefined) update.certificateImageUrl = body.certificateImageUrl || null;
    if (body.certificatePublicId !== undefined) update.certificatePublicId = body.certificatePublicId || null;
    if (body.process !== undefined) {
      update.process = (body.process || [])
        .filter((s) => s && String(s.title || "").trim())
        .map((s) => ({ num: str(s.num), title: str(s.title).trim(), desc: str(s.desc) }));
    }
    if (body.shipped !== undefined) {
      update.shipped = (body.shipped || [])
        .filter((s) => s && String(s.title || "").trim())
        .map((s) => ({ title: str(s.title).trim(), note: str(s.note) }));
    }

    const doc = await Studio.findOneAndUpdate(
      { _id: "main" },
      { $set: update, $setOnInsert: { _id: "main" } },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ studio: doc.toJSON() });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

export default router;
