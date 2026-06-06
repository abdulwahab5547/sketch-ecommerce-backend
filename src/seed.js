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
import { Studio, getStudio } from "./models/Studio.js";
import { Taxonomy, getTaxonomy } from "./models/Taxonomy.js";
import { ARTWORKS, CATEGORIES, SERIES_BY_CATEGORY } from "../../frontend/src/data/artworks.js";
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

async function seedStudio() {
  const existing = await Studio.findById("main");
  if (existing && (existing.process?.length || existing.intro)) {
    console.log("✓ studio already seeded");
    return;
  }
  const doc = await getStudio();
  doc.eyebrow = "Inside the studio";
  doc.title = "The Studio";
  doc.intro =
    "Every piece is drawn by hand over six to ten sittings — graphite and ink on archival cotton. Here's how a drawing comes together, and exactly what arrives in the box.";
  doc.process = [
    { num: "01", title: "Reference", desc: "Hours of stills, frames, and screenshots — pinned, sorted, lived with." },
    { num: "02", title: "Block-in", desc: "Loose construction in 2H, finding the gesture and the bones." },
    { num: "03", title: "Render", desc: "Slow build with 4B, 6B, and a soft brush — light, then shadow, then light again." },
    { num: "04", title: "Sign & ship", desc: "Signed in graphite, sleeved in archival board, packed flat for the post." },
  ];
  doc.shippedIntro = "Each original ships flat from Karachi, carefully protected. Inside the box:";
  doc.shipped = [
    { title: "The original drawing", note: "Hand-signed in graphite, sleeved between acid-free archival boards." },
    { title: "Certificate of authenticity", note: "Signed and numbered, confirming the piece is an original 1-of-1." },
    { title: "Care card", note: "How to frame, hang, and protect graphite work so it lasts a lifetime." },
    { title: "A handwritten note", note: "Because every piece that leaves the studio still means something to me." },
  ];
  doc.certificateIntro =
    "Every original comes with a signed certificate of authenticity — proof that the piece is one-of-one, drawn entirely by hand.";
  doc.certificateImageUrl = null;
  doc.certificatePublicId = null;
  await doc.save();
  console.log(`✓ studio seeded: ${doc.process.length} process steps, ${doc.shipped.length} shipped items`);
}

async function seedTaxonomy() {
  const existing = await Taxonomy.findById("main");
  if (existing && existing.categories?.length) {
    console.log("✓ taxonomy already seeded");
    return;
  }
  const doc = await getTaxonomy();
  doc.categories = CATEGORIES.map((c) => ({
    key: c,
    name: c.charAt(0).toUpperCase() + c.slice(1),
  }));
  doc.series = Object.entries(SERIES_BY_CATEGORY).flatMap(([category, names]) =>
    names.map((name) => ({ name, category }))
  );
  await doc.save();
  console.log(`✓ taxonomy seeded: ${doc.categories.length} categories, ${doc.series.length} series`);
}

async function main() {
  await connectDB();
  await seedAdmin();
  await seedTaxonomy();
  await seedProducts();
  await seedSupplies();
  await seedAbout();
  await seedStudio();
  console.log("done.");
  await disconnectDB();
}

main().catch(async (err) => {
  console.error("seed failed:", err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
