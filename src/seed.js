// Seed an admin user and the initial product catalog. Idempotent — re-running
// is safe: existing rows are left alone (so admin edits aren't overwritten).
import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB, disconnectDB } from "./db.js";
import { User } from "./models/User.js";
import { Product } from "./models/Product.js";
import { ARTWORKS } from "../../frontend/src/data/artworks.js";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@zaidikram.art").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin1234";

async function seedAdmin() {
  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`✓ admin user already exists: ${ADMIN_EMAIL}`);
    return;
  }
  await User.create({
    email: ADMIN_EMAIL,
    passwordHash: bcrypt.hashSync(ADMIN_PASSWORD, 10),
    name: "Studio admin",
    role: "admin",
  });
  console.log(`✓ admin user seeded: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

async function seedProducts() {
  let added = 0;
  for (const a of ARTWORKS) {
    const exists = await Product.exists({ _id: a.id });
    if (exists) continue;
    await Product.create({
      _id: a.id,
      title: a.title,
      category: a.category,
      series: a.series,
      medium: a.medium ?? null,
      size: a.size ?? null,
      year: a.year ?? null,
      edition: a.edition ?? "Original, 1 of 1",
      price: a.price,
      status: a.status ?? "available",
      motif: a.motif ?? null,
      palette: a.palette ?? [],
    });
    added++;
  }
  console.log(
    `✓ products: ${added} seeded, ${ARTWORKS.length - added} already present`
  );
}

async function main() {
  await connectDB();
  await seedAdmin();
  await seedProducts();
  console.log("done.");
  await disconnectDB();
}

main().catch(async (err) => {
  console.error("seed failed:", err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
