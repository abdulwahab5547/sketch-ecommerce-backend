import { Router } from "express";
import crypto from "node:crypto";
import { Order, VALID_ORDER_STATUSES } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// Generate a short, readable, unique reference like "ZI-7K2QF9".
async function generateRef() {
  for (let i = 0; i < 8; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
    const ref = `ZI-${code}`;
    const exists = await Order.exists({ ref });
    if (!exists) return ref;
  }
  return `ZI-${Date.now().toString(36).toUpperCase()}`;
}

// ---------- Inventory linkage ----------
// An order "holds" inventory while it's pending or confirmed; cancelling
// releases it. Out-of-stock pieces are marked reserved (pending) or sold
// (confirmed); restored to available when stock returns.
const holdsStock = (status) => status === "pending" || status === "confirmed";

async function reserveItems(items) {
  for (const it of items) {
    if (!it.productId) continue;
    const p = await Product.findById(it.productId);
    if (!p) continue;
    p.quantity = Math.max(0, (p.quantity || 0) - it.qty);
    if (p.quantity <= 0) p.status = "reserved";
    await p.save();
  }
}

async function releaseItems(items) {
  for (const it of items) {
    if (!it.productId) continue;
    const p = await Product.findById(it.productId);
    if (!p) continue;
    p.quantity = (p.quantity || 0) + it.qty;
    if (p.quantity > 0 && (p.status === "reserved" || p.status === "sold")) {
      p.status = "available";
    }
    await p.save();
  }
}

// Reflect the order's holding status onto out-of-stock products:
// confirmed → "sold", pending → "reserved".
async function markItemsStatus(items, orderStatus) {
  const target = orderStatus === "confirmed" ? "sold" : "reserved";
  for (const it of items) {
    if (!it.productId) continue;
    const p = await Product.findById(it.productId);
    if (!p) continue;
    if (p.quantity <= 0) {
      p.status = target;
      await p.save();
    }
  }
}

// Public view of an order — never leaks more than the customer needs.
function publicView(doc) {
  const o = doc.toJSON();
  return {
    ref: o.ref,
    status: o.status,
    items: o.items,
    subtotal: o.subtotal,
    total: o.total,
    paymentMethod: o.paymentMethod,
    customerName: o.customer?.name || "",
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

// ---------- Public: place an order ----------

router.post("/", async (req, res, next) => {
  try {
    const body = req.body || {};
    const c = body.customer || {};
    const errors = [];
    if (!c.name || !String(c.name).trim()) errors.push("name is required");
    if (!c.email || !String(c.email).trim()) errors.push("email is required");
    if (!Array.isArray(body.items) || body.items.length === 0) errors.push("cart is empty");
    if (errors.length) return res.status(400).json({ error: errors.join("; ") });

    // Re-price each line from the DB where possible so totals can't be tampered.
    const ids = body.items.map((it) => it.productId).filter(Boolean);
    const dbProducts = ids.length ? await Product.find({ _id: { $in: ids } }) : [];
    const priceById = new Map(dbProducts.map((p) => [p._id, p.price]));

    const items = body.items.map((it) => {
      const qty = Math.max(1, Math.floor(Number(it.qty) || 1));
      const price = priceById.has(it.productId)
        ? priceById.get(it.productId)
        : Math.max(0, Number(it.price) || 0);
      return {
        productId: it.productId || null,
        title: String(it.title || "").slice(0, 200),
        price,
        qty,
      };
    });
    const subtotal = items.reduce((n, it) => n + it.price * it.qty, 0);

    const ref = await generateRef();
    const doc = await Order.create({
      ref,
      customer: {
        name: String(c.name).trim(),
        email: String(c.email).trim().toLowerCase(),
        phone: c.phone ? String(c.phone).trim() : "",
        address: c.address ? String(c.address).trim() : "",
        city: c.city ? String(c.city).trim() : "",
        country: c.country ? String(c.country).trim() : "",
        notes: c.notes ? String(c.notes).trim() : "",
      },
      items,
      subtotal,
      total: subtotal,
      paymentMethod: body.paymentMethod ? String(body.paymentMethod).slice(0, 80) : "",
      status: "pending",
    });

    // Reserve stock for the new (pending) order so the same 1-of-1 can't be
    // ordered twice while payment is pending.
    await reserveItems(doc.items);

    // The creator gets the full-ish public view (includes their ref to track).
    res.status(201).json({ order: publicView(doc) });
  } catch (err) {
    next(err);
  }
});

// ---------- Public: track an order (ref + email) ----------

router.get("/track/:ref", async (req, res, next) => {
  try {
    const email = String(req.query.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "email is required to view this order" });
    const doc = await Order.findOne({ ref: req.params.ref });
    if (!doc || doc.customer.email !== email) {
      return res.status(404).json({ error: "No order found for that reference + email" });
    }
    res.json({ order: publicView(doc) });
  } catch (err) {
    next(err);
  }
});

// ---------- Admin ----------

router.get("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status && VALID_ORDER_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }
    const docs = await Order.find(filter).sort({ createdAt: -1 });
    res.json({ orders: docs.map((d) => d.toJSON()) });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const doc = await Order.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ order: doc.toJSON() });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const status = req.body?.status;
    if (!VALID_ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_ORDER_STATUSES.join(", ")}` });
    }
    const doc = await Order.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });

    const prev = doc.status;
    doc.status = status;
    await doc.save();

    // Apply the inventory effect of the status transition.
    if (prev !== status) {
      if (!holdsStock(prev) && holdsStock(status)) {
        await reserveItems(doc.items);          // cancelled → pending/confirmed
        await markItemsStatus(doc.items, status);
      } else if (holdsStock(prev) && !holdsStock(status)) {
        await releaseItems(doc.items);          // pending/confirmed → cancelled
      } else if (holdsStock(prev) && holdsStock(status)) {
        await markItemsStatus(doc.items, status); // pending ↔ confirmed
      }
    }

    res.json({ order: doc.toJSON() });
  } catch (err) {
    next(err);
  }
});

export default router;
