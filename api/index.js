// Vercel serverless entry point.
//
// Every request under /api/* is rewritten to /api by vercel.json and
// invokes this single function. Express then routes internally based on
// the original `req.url` (Vercel preserves it across the rewrite).
//
// The Mongo connection is established lazily by middleware in src/app.js
// and cached across warm invocations (see src/db.js).
import app from "../src/app.js";

export default app;
