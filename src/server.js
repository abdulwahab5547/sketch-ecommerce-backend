// Local dev / self-hosted entry. On Vercel this file is not used —
// api/[...path].js imports the app directly.
import app from "./app.js";

const PORT = Number(process.env.PORT) || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log(`CORS allowing: ${CORS_ORIGIN}`);
});
