import { Router } from "express";
import { Settings, getSettings } from "../models/Settings.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const str = (v) => (v === undefined || v === null ? "" : String(v));

// Normalize a social/external URL: strip leftover "#" placeholder prefixes
// (e.g. "#https://…" from an unedited default field) and add https:// when the
// scheme is missing. Returns "" for empty/placeholder values.
function normalizeSocialHref(raw) {
  let h = str(raw).trim().replace(/^#+/, "").trim();
  if (!h) return "";
  if (!/^https?:\/\//i.test(h) && !h.startsWith("/") && !h.startsWith("mailto:")) {
    h = "https://" + h;
  }
  return h;
}

// ---------- Public (read) ----------

router.get("/", async (_req, res, next) => {
  try {
    const doc = await getSettings();
    res.json({ settings: doc.toJSON() });
  } catch (err) {
    next(err);
  }
});

// ---------- Admin (write) ----------

router.put("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};
    const update = {};

    if (body.hero !== undefined) {
      const slides = Array.isArray(body.hero?.slides) ? body.hero.slides : [];
      const stats = Array.isArray(body.hero?.stats) ? body.hero.stats : [];
      update.hero = {
        slides: slides.map((s) => ({
          eyebrow: str(s.eyebrow),
          title: str(s.title),
          titleMeta: str(s.titleMeta),
          lede: str(s.lede),
          ctaLabel: str(s.ctaLabel),
          href: str(s.href),
          imageUrl: s.imageUrl || null,
          publicId: s.publicId || null,
        })),
        stats: stats
          .filter((s) => s && (str(s.num).trim() || str(s.label).trim()))
          .map((s) => ({ num: str(s.num).trim(), label: str(s.label).trim() })),
      };
    }

    if (body.work !== undefined) {
      update.work = {
        eyebrow: str(body.work.eyebrow),
        title: str(body.work.title),
        lede: str(body.work.lede),
        productIds: Array.isArray(body.work.productIds)
          ? body.work.productIds.map(String).filter(Boolean)
          : [],
      };
    }

    if (body.quote !== undefined) {
      update.quote = {
        text: str(body.quote.text),
        attribution: str(body.quote.attribution),
      };
    }

    if (body.process !== undefined) {
      const steps = Array.isArray(body.process?.steps) ? body.process.steps : [];
      update.process = {
        eyebrow: str(body.process.eyebrow),
        title: str(body.process.title),
        steps: steps
          .filter((s) => s && str(s.title).trim())
          .map((s) => ({ num: str(s.num), title: str(s.title).trim(), desc: str(s.desc) })),
      };
    }

    if (body.contactEmail !== undefined) update.contactEmail = str(body.contactEmail).trim();

    if (body.socials !== undefined) {
      update.socials = (Array.isArray(body.socials) ? body.socials : [])
        .filter((s) => s && str(s.name).trim())
        .map((s) => ({ name: str(s.name).trim(), href: normalizeSocialHref(s.href) }));
    }

    if (body.footer !== undefined) {
      const f = body.footer || {};
      update.footer = {
        brandName: str(f.brandName).trim(),
        tagline: str(f.tagline).trim(),
        note: str(f.note).trim(),
      };
    }

    if (body.portfolio !== undefined) {
      const p = body.portfolio || {};
      update.portfolio = {
        eyebrow: str(p.eyebrow).trim(),
        title: str(p.title).trim(),
        lede: str(p.lede),
      };
    }

    if (body.commissions !== undefined) {
      const c = body.commissions || {};
      update.commissions = {
        eyebrow: str(c.eyebrow).trim(),
        title: str(c.title).trim(),
        lede: str(c.lede),
        steps: (Array.isArray(c.steps) ? c.steps : [])
          .map((s) => str(s).trim())
          .filter(Boolean),
      };
    }

    if (body.payment !== undefined) {
      const p = body.payment || {};
      update.payment = {
        whatsapp: str(p.whatsapp).trim(),
        instructions: str(p.instructions),
        methods: (Array.isArray(p.methods) ? p.methods : [])
          .filter((m) => m && str(m.label).trim())
          .map((m) => ({
            label: str(m.label).trim(),
            accountName: str(m.accountName).trim(),
            accountNumber: str(m.accountNumber).trim(),
            extra: str(m.extra).trim(),
          })),
      };
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    const doc = await Settings.findOneAndUpdate(
      { _id: "main" },
      { $set: update, $setOnInsert: { _id: "main" } },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ settings: doc.toJSON() });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

export default router;
