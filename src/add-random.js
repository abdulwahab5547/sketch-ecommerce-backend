// One-shot script: insert N random products. Re-runnable - every run
// generates fresh slug-suffix ids, so titles can repeat across runs.
//
// Usage:  node src/add-random.js          # default 16
//         node src/add-random.js 32       # any count
//         npm run random
import "dotenv/config";
import crypto from "node:crypto";
import { connectDB, disconnectDB } from "./db.js";
import { Product } from "./models/Product.js";

const COUNT = Number(process.argv[2]) || 16;

// Curated (title, category, series, motif, palette) seeds - each pulls
// from the existing taxonomy and visual identity.
const SAMPLES = [
  // ---------- Cars ----------
  { c: "cars", s: "Ferrari",  t: "F40, side study",            motifs: ["car-side"],  pals: [["#1a0e0e", "#3a1a18", "#9a2a24"]] },
  { c: "cars", s: "Ferrari",  t: "488 GTB, profile",           motifs: ["car-side"],  pals: [["#1c0e0c", "#321612", "#a83228"]] },
  { c: "cars", s: "Ferrari",  t: "F8 Tributo, three-quarter",  motifs: ["car-front"], pals: [["#1a0e0e", "#3a1a18", "#9a2a24"]] },
  { c: "cars", s: "McLaren",  t: "720S, low stance",           motifs: ["car-side"],  pals: [["#181614", "#2a2620", "#9a8568"]] },
  { c: "cars", s: "McLaren",  t: "GT, idling at dusk",         motifs: ["car-front"], pals: [["#1a1612", "#2a221c", "#c87a3a"]] },
  { c: "cars", s: "Porsche",  t: "Carrera GT, side study",     motifs: ["car-side"],  pals: [["#161412", "#28241e", "#8a7558"]] },
  { c: "cars", s: "Porsche",  t: "959, profile",               motifs: ["car-side"],  pals: [["#181614", "#2a2620", "#7a8471"]] },
  { c: "cars", s: "Jaguar",   t: "F-Type, in shade",           motifs: ["car-front"], pals: [["#181614", "#2a2620", "#7a8471"]] },
  { c: "cars", s: "Jaguar",   t: "XK120, study",               motifs: ["car-side"],  pals: [["#1a1612", "#2b2520", "#5a8a64"]] },
  { c: "cars", s: "Nissan",   t: "Skyline R32, profile",       motifs: ["car-side"],  pals: [["#1a1a18", "#2a2a26", "#888378"]] },
  { c: "cars", s: "Nissan",   t: "GT-R Nismo, rear quarter",   motifs: ["car-side"],  pals: [["#181614", "#2a2620", "#9a8568"]] },

  // ---------- Characters ----------
  { c: "characters", s: "Marvel",            t: "Iron Man, helmet study",     motifs: ["hood-profile"], pals: [["#1a0e0e", "#3a1a18", "#9a2a24"]] },
  { c: "characters", s: "Marvel",            t: "Daredevil, mid-leap",        motifs: ["leap-figure"],  pals: [["#1a0e0e", "#3a1a18", "#9a2a24"]] },
  { c: "characters", s: "Marvel",            t: "Captain, the shield arm",    motifs: ["swing-figure"], pals: [["#0e0e12", "#1e1a2a", "#5a3a6a"]] },
  { c: "characters", s: "Marvel",            t: "Wolverine, claws out",       motifs: ["robed-stand"],  pals: [["#1a0e0e", "#3a1a18", "#9a2a24"]] },
  { c: "characters", s: "Marvel",            t: "Doctor Strange, the cape",   motifs: ["robed-stand"],  pals: [["#0e0e12", "#1e1a2a", "#5a3a6a"]] },
  { c: "characters", s: "Assassin's Creed",  t: "Bayek, by torchlight",       motifs: ["hood-profile"], pals: [["#1a1612", "#2b2520", "#8a7a64"]] },
  { c: "characters", s: "Assassin's Creed",  t: "Kassandra, study",           motifs: ["robed-stand"],  pals: [["#181614", "#2a2620", "#9a8568"]] },
  { c: "characters", s: "Assassin's Creed",  t: "Jacob, rooftop run",         motifs: ["leap-figure"],  pals: [["#1a1612", "#2b2520", "#8a7a64"]] },
  { c: "characters", s: "Assassin's Creed",  t: "Edward, the deck",           motifs: ["robed-stand"],  pals: [["#181614", "#2a2620", "#9a8568"]] },

  // ---------- Anime ----------
  { c: "anime", s: "Naruto",        t: "Sasuke, sharingan",          motifs: ["robed-stand"],  pals: [["#1a1410", "#2a1f18", "#c87a3a"]] },
  { c: "anime", s: "Naruto",        t: "Itachi, mid-jutsu",          motifs: ["leap-figure"],  pals: [["#1a1410", "#2a1f18", "#c87a3a"]] },
  { c: "anime", s: "One Piece",     t: "Zoro, three-sword",          motifs: ["robed-stand"],  pals: [["#1a0e08", "#2a1810", "#b85a2a"]] },
  { c: "anime", s: "One Piece",     t: "Sanji, kick study",          motifs: ["leap-figure"],  pals: [["#1a0e08", "#2a1810", "#b85a2a"]] },
  { c: "anime", s: "Dragon Ball",   t: "Vegeta, the charge",         motifs: ["leap-figure"],  pals: [["#181210", "#2a1e18", "#d8a14e"]] },
  { c: "anime", s: "Dragon Ball",   t: "Gohan, transformation",      motifs: ["swing-figure"], pals: [["#181210", "#2a1e18", "#d8a14e"]] },
  { c: "anime", s: "Demon Slayer",  t: "Inosuke, breath of beast",   motifs: ["leap-figure"],  pals: [["#0e1418", "#1a242a", "#3a8aaa"]] },
  { c: "anime", s: "Demon Slayer",  t: "Nezuko, study",              motifs: ["robed-stand"],  pals: [["#0e1418", "#1a242a", "#3a8aaa"]] },
];

const MEDIUMS = [
  "Graphite & charcoal on cotton",
  "Pencil on bristol",
  "Ink wash on toned paper",
  "Charcoal, cont\u00e9",
  "Graphite, white chalk",
  "Pencil, fineliner",
  "Graphite & ink",
];

// Use the x escape for the multiplication sign so the source file
// stays pure ASCII - avoids any chance of cp1252/UTF-8 mojibake when Node
// loads this file on Windows.
const SIZES = ["9 \u00d7 12 in", "11 \u00d7 14 in", "12 \u00d7 16 in", "14 \u00d7 18 in", "16 \u00d7 20 in"];
const YEARS = ["2024", "2025", "2026"];

const SIZE_MULTIPLIER = {
  "9 \u00d7 12 in": 1.0,
  "11 \u00d7 14 in": 1.3,
  "12 \u00d7 16 in": 1.6,
  "14 \u00d7 18 in": 2.0,
  "16 \u00d7 20 in": 2.5,
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function generateId(title) {
  const base = slugify(title) || "piece";
  const suffix = crypto.randomBytes(2).toString("hex");
  return `${base}-${suffix}`;
}

function priceFor(size) {
  const base = 480;
  const m = SIZE_MULTIPLIER[size] ?? 1;
  const noise = Math.floor(Math.random() * 300);
  return Math.round((base * m + noise) / 10) * 10;
}

function buildDoc(sample) {
  const size = pick(SIZES);
  return {
    _id: generateId(sample.t),
    title: sample.t,
    category: sample.c,
    series: sample.s,
    medium: pick(MEDIUMS),
    size,
    year: pick(YEARS),
    edition: "Original, 1 of 1",
    price: priceFor(size),
    status: Math.random() < 0.85 ? "available" : "sold",
    motif: pick(sample.motifs),
    palette: pick(sample.pals),
  };
}

async function main() {
  await connectDB();

  if (COUNT > SAMPLES.length) {
    console.warn(
      `[warn] requested ${COUNT} but only ${SAMPLES.length} unique samples \u2014 some titles may repeat across runs (ids stay unique).`
    );
  }

  const picks = shuffle(SAMPLES).slice(0, COUNT);
  const docs = picks.map(buildDoc);

  const inserted = await Product.insertMany(docs, { ordered: false });
  console.log(`\u2713 inserted ${inserted.length} random products into MongoDB:\n`);
  for (const d of inserted) {
    console.log(
      `  \u00b7 ${d._id.padEnd(38)} ${d.title.padEnd(34)} ${d.category}/${d.series}`.padEnd(110) +
        ` $${String(d.price).padStart(5)}  ${d.status}`
    );
  }
  console.log(`\ntotal in db now: ${await Product.countDocuments({})}`);

  await disconnectDB();
}

main().catch(async (err) => {
  console.error("failed:", err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
