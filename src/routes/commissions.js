import { Router } from "express";
import crypto from "node:crypto";
import { Commission, VALID_COMMISSION_STATUSES } from "../models/Commission.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { notifyCommission } from "../lib/mailer.js";

const router = Router();

async function generateRef() {
  for (let i = 0; i < 8; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
    const ref = `CM-${code}`;
    if (!(await Commission.exists({ ref }))) return ref;
  }
  return `CM-${Date.now().toString(36).toUpperCase()}`;
}

const str = (v, max = 2000) => String(v ?? "").trim().slice(0, max);

// ---------- Public: submit a commission request ----------

router.post("/", async (req, res, next) => {
  try {
    const b = req.body || {};
    const errors = [];
    if (!str(b.name)) errors.push("name is required");
    if (!str(b.email)) errors.push("email is required");
    if (!str(b.message)) errors.push("message is required");
    if (errors.length) return res.status(400).json({ error: errors.join("; ") });

    const ref = await generateRef();
    const doc = await Commission.create({
      ref,
      name: str(b.name, 200),
      email: str(b.email, 200).toLowerCase(),
      phone: str(b.phone, 80),
      subject: str(b.subject, 200),
      budget: str(b.budget, 120),
      deadline: str(b.deadline, 120),
      message: str(b.message, 4000),
      status: "new",
    });

    // Alert the owner + confirm to the requester. Never throws.
    await notifyCommission(doc);

    res.status(201).json({ commission: { ref: doc.ref, status: doc.status } });
  } catch (err) {
    next(err);
  }
});

// ---------- Admin ----------

router.get("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status && VALID_COMMISSION_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }
    const docs = await Commission.find(filter).sort({ createdAt: -1 });
    res.json({ commissions: docs.map((d) => d.toJSON()) });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const status = req.body?.status;
    if (!VALID_COMMISSION_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_COMMISSION_STATUSES.join(", ")}` });
    }
    const doc = await Commission.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ commission: doc.toJSON() });
  } catch (err) {
    next(err);
  }
});

export default router;
