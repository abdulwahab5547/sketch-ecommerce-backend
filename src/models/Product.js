import mongoose from "mongoose";

// Initial seed set only. Categories are managed by the admin (see Taxonomy),
// so product.category is NOT constrained to this list.
export const VALID_CATEGORIES = ["cars", "characters", "anime"];
export const VALID_STATUSES = ["available", "sold", "reserved"];
export const VALID_MOTIFS = [
  "hood-profile",
  "swing-figure",
  "car-side",
  "robed-stand",
  "leap-figure",
  "car-front",
];
export const VALID_ORIENTATIONS = ["portrait", "landscape"];

// One picture of a piece. The first entry in a product's `images` array is the
// "main" picture; the rest are additional shots shown in the gallery.
const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: null },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    // Use the slug ("ezio-01") as Mongo's natural _id so the public API
    // can keep returning a stable string id for each product.
    _id: { type: String },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    series: { type: String, required: true, index: true },
    medium: { type: String, default: null },
    size: { type: String, default: null },
    year: { type: String, default: null },
    edition: { type: String, default: "Original, 1 of 1" },
    // How many of this piece are in stock. Originals are 1; prints/multiples
    // can be higher. 0 means out of stock.
    quantity: { type: Number, default: 1, min: 0 },
    // Whether the artwork reads taller-than-wide (portrait) or wider-than-tall
    // (landscape). Drives the frame aspect ratio on the shop + product pages.
    orientation: {
      type: String,
      enum: VALID_ORIENTATIONS,
      default: "portrait",
    },
    price: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: VALID_STATUSES,
      default: "available",
      index: true,
    },
    motif: {
      type: String,
      enum: [...VALID_MOTIFS, null],
      default: null,
    },
    palette: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length === 0 || arr.length === 3,
        message: "palette must be an array of 3 hex colors (or empty)",
      },
    },
    // Cloudinary-hosted product image. Optional — falls back to the
    // procedural placeholder (motif + palette) when null. Kept in sync with
    // images[0] so older code paths (cart snapshot, shop cards) still work.
    imageUrl: { type: String, default: null },
    cloudinaryPublicId: { type: String, default: null },
    // Full ordered gallery. images[0] is the main picture.
    images: { type: [imageSchema], default: [] },
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

export const Product = mongoose.model("Product", productSchema);
