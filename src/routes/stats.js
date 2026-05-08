import { Router } from "express";
import { Product } from "../models/Product.js";
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

    res.json({
      totals: { total, available, sold, reserved },
      inventoryValue,
      lifetimeValue,
      byCategory,
      recent,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
