import mongoose from "mongoose";

// A product category. `key` is the stable value products store in
// product.category (e.g. "cars"); `name` is the display label ("Cars").
const categorySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
  },
  { _id: false }
);

// A series, scoped to a category by its key. Products store the series `name`.
const seriesSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const taxonomySchema = new mongoose.Schema(
  {
    // Singleton: there is exactly one Taxonomy document, with id "main".
    _id: { type: String, default: "main" },
    categories: { type: [categorySchema], default: [] },
    series: { type: [seriesSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

export const Taxonomy = mongoose.model("Taxonomy", taxonomySchema);

// Helper used by routes + seed: get-or-create the singleton.
export async function getTaxonomy() {
  let doc = await Taxonomy.findById("main");
  if (!doc) doc = await Taxonomy.create({ _id: "main" });
  return doc;
}

export function slugifyKey(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
