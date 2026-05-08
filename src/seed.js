// Seed an admin user, the initial product catalog, supply groups, and the
// about-page content. Idempotent -- re-running is safe: existing rows are
// left alone (so admin edits aren't overwritten).
import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB, disconnectDB } from "./db.js";
import { User } from "./models/User.js";
import { Product } from "./models/Product.js";
import { SupplyGroup } from "./models/SupplyGroup.js";
import { About, getAbout } from "./models/About.js";
import { ARTWORKS } from "../../frontend/src/data/artworks.js";
import { SUPPLY_GROUPS } from "../../frontend/src/data/supplies.js";
import { BIO, JOURNEY } from "../../frontend/src/data/journey.js";

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
  console.log(`✓ products: ${added} seeded, ${ARTWORKS.length - added} already present`);
}

async function seedSupplies() {
  let added = 0;
  for (let i = 0; i < SUPPLY_GROUPS.length; i++) {
    const g = SUPPLY_GROUPS[i];
    const exists = await SupplyGroup.exists({ _id: g.id });
    if (exists) continue;
    await SupplyGroup.create({
      _id: g.id,
      title: g.title,
      glyph: g.glyph,
      intro: g.intro,
      items: g.items.map((it) => ({
        brand: it.brand,
        name: it.name,
        spec: it.spec ?? null,
        note: it.note ?? null,
      })),
      order: (i + 1) * 10,
    });
    added++;
  }
  console.log(`✓ supplies: ${added} seeded, ${SUPPLY_GROUPS.length - added} already present`);
}

async function seedAbout() {
  const existing = await About.findById("main");
  if (existing && (existing.journey?.length || existing.bio?.intro)) {
    console.log("✓ about already seeded");
    return;
  }
  const doc = await getAbout();
  doc.bio = {
    hero: BIO.hero || "",
    intro: BIO.intro || "",
    beginnings: BIO.beginnings || [],
  };
  doc.journey = (JOURNEY || []).map((y) => ({
    year: y.year,
    chapter: y.chapter,
    note: y.note,
    works: (y.works || []).map((w) => ({
      title: w.title,
      motif: w.motif || null,
      palette: w.palette || [],
    })),
  }));
  await doc.save();
  console.log(`✓ about seeded: ${doc.journey.length} journey years`);
}

async function main() {
  await connectDB();
  await seedAdmin();
  await seedProducts();
  await seedSupplies();
  await seedAbout();
  console.log("done.");
  await disconnectDB();
}

main().catch(async (err) => {
  console.error("seed failed:", err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
