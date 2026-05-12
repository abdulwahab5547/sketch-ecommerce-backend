import mongoose from "mongoose";

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

const productSchema = new mongoose.Schema(
  {
    // Use the slug ("ezio-01") as Mongo's natural _id so the public API
    // can keep returning a stable string id for each product.
    _id: { type: String },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: VALID_CATEGORIES, index: true },
    series: { type: String, required: true, index: true },
    medium: { type: String, default: null },
    size: { type: String, default: null },
    year: { type: String, default: null },
    edition: { type: String, default: "Original, 1 of 1" },
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
    // procedural placeholder (motif + palette) when null.
    imageUrl: { type: String, default: null },
    cloudinaryPublicId: { type: String, default: null },
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
