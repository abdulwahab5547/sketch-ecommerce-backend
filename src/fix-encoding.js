// One-shot: scan every product and fix mojibake'd strings created by an
// earlier UTF-8/cp1252 round-trip. Specifically replaces "\u00c3\u2014"
// (the cp1252-as-utf8 echo of "\u00d7") with "\u00d7", and a couple of
// other common near-misses for accented chars.
//
// Usage:  node src/fix-encoding.js
//         npm run fix-encoding
import "dotenv/config";
import { connectDB, disconnectDB } from "./db.js";
import { Product } from "./models/Product.js";

// All needles + replacements written as ASCII Unicode escapes so the source
// file is encoding-proof on every platform.
const FIXES = [
  ["\u00c3\u2014", "\u00d7"], // "\u00c3\u2014" -> "\u00d7" (multiplication sign)
  ["\u00c3\u00a9", "\u00e9"], // "\u00c3\u00a9" -> "\u00e9" (e with acute)
  ["\u00c3\u00af", "\u00ef"], // "\u00c3\u00af" -> "\u00ef" (i with diaeresis)
  ["\u00c3\u00a2", "\u00e2"], // "\u00c3\u00a2" -> "\u00e2" (a with circumflex)
  ["\u00c3 ",          "\u00e0"], // "\u00c3 " -> "\u00e0" (a with grave)
];

const STRING_FIELDS = ["title", "series", "medium", "size", "year", "edition"];

function fixStr(s) {
  if (typeof s !== "string") return s;
  let out = s;
  for (const [bad, good] of FIXES) {
    if (out.includes(bad)) out = out.split(bad).join(good);
  }
  return out;
}

async function main() {
  await connectDB();
  const docs = await Product.find({});
  let touched = 0;
  let fields = 0;

  for (const doc of docs) {
    const update = {};
    for (const f of STRING_FIELDS) {
      const before = doc[f];
      const after = fixStr(before);
      if (after !== before) {
        update[f] = after;
        fields++;
      }
    }
    if (Object.keys(update).length > 0) {
      await Product.updateOne({ _id: doc._id }, { $set: update });
      touched++;
      console.log(`  - ${doc._id}: fixed ${Object.keys(update).join(", ")}`);
    }
  }

  console.log(`\ndone -- fixed ${fields} fields across ${touched} of ${docs.length} products.`);
  await disconnectDB();
}

main().catch(async (err) => {
  console.error("failed:", err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
