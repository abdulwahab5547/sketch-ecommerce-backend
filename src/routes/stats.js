import { Router } from "express";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/stats", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const [total, available, sold, reserved] = await Promise.all([
      Product.countDocuments({}),
      Product.countDocuments({ status: "available" }),
      Product.countDocuments({ status: "sold" }),
      Product.countDocuments({ status: "reserved" }),
    ]);

    const sumByStatus = async (status) => {
      const out = await Product.aggregate([
        { $match: { status } },
        { $group: { _id: null, sum: { $sum: "$price" } } },
      ]);
      return out[0]?.sum ?? 0;
    };

    const [inventoryValue, lifetimeValue] = await Promise.all([
      sumByStatus("available"),
      sumByStatus("sold"),
    ]);

    const byCategoryRaw = await Product.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const byCategory = byCategoryRaw.map((c) => ({
      category: c._id,
      count: c.count,
    }));

    const recentDocs = await Product.find()
      .sort({ createdAt: -1 })
      .limit(5);
    const recent = recentDocs.map((d) => {
      const obj = d.toJSON();
      return {
        id: obj.id,
        title: obj.title,
        category: obj.category,
        series: obj.series,
        price: obj.price,
        status: obj.status,
        createdAt: obj.createdAt,
      };
    });

    // ---- Real order-based sales metrics ----
    const orderAgg = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 }, sum: { $sum: "$total" } } },
    ]);
    const byStatus = Object.fromEntries(orderAgg.map((o) => [o._id, o]));
    const orderStat = (s) => ({ count: byStatus[s]?.count ?? 0, sum: byStatus[s]?.sum ?? 0 });
    const confirmed = orderStat("confirmed");
    const pending = orderStat("pending");
    const cancelled = orderStat("cancelled");
    const orders = {
      total: confirmed.count + pending.count + cancelled.count,
      confirmed: confirmed.count,
      pending: pending.count,
      cancelled: cancelled.count,
      revenue: confirmed.sum, // money actually earned (confirmed orders)
      pendingValue: pending.sum, // money awaiting confirmation
    };

    const recentOrderDocs = await Order.find().sort({ createdAt: -1 }).limit(6);
    const recentOrders = recentOrderDocs.map((d) => {
      const o = d.toJSON();
      return {
        id: o.id,
        ref: o.ref,
        name: o.customer?.name || "",
        email: o.customer?.email || "",
        total: o.total,
        status: o.status,
        itemCount: (o.items || []).reduce((n, it) => n + it.qty, 0),
        createdAt: o.createdAt,
      };
    });

    res.json({
      totals: { total, available, sold, reserved },
      inventoryValue,
      lifetimeValue,
      orders,
      byCategory,
      recent,
      recentOrders,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
