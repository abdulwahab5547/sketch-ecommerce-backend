// Express app factory. No `app.listen()` here so this module can be reused by
// both the local dev server (src/server.js) and the Vercel serverless entry
// (api/[...path].js).
import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { connectDB } from "./db.js";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import statsRoutes from "./routes/stats.js";
import suppliesRoutes from "./routes/supplies.js";
import aboutRoutes from "./routes/about.js";
import uploadsRoutes from "./routes/uploads.js";

const app = express();
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: CORS_ORIGIN.split(",").map((s) => s.trim()), credentials: true }));
app.use(express.json({ limit: "1mb" }));
if (process.env.NODE_ENV !== "test" && process.env.VERCEL !== "1") {
  app.use(morgan("dev"));
}

// Ensure Mongo is connected before any handler runs. Cheap when warm
// (resolves immediately) — see src/db.js for the cached-promise pattern.
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/supplies", suppliesRoutes);
app.use("/api/about", aboutRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/admin", statsRoutes);

// 404 for /api
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error("[error]", err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal error" });
});

export default app;
