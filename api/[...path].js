// Vercel serverless entry point.
//
// The catch-all filename ([...path].js) means this single function handles
// every request under /api/* (e.g. /api/auth/login, /api/products, etc.).
// Vercel preserves the original `req.url`, so the Express app routes the
// request normally — no special wiring needed.
//
// The DB connection is established lazily by middleware in src/app.js and
// cached across warm invocations (see src/db.js).
import app from "../src/app.js";

export default app;
