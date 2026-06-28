import mongoose from "mongoose";

import { VALID_MOTIFS } from "./Product.js";

const workSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    motif: {
      type: String,
      enum: [...VALID_MOTIFS, "", null],
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
    // Optional uploaded photo of the piece. When set, it's shown instead of
    // the procedural motif/palette placeholder on /about.
    imageUrl: { type: String, default: null },
    publicId: { type: String, default: null },
  },
  { _id: false }
);

const journeyYearSchema = new mongoose.Schema(
  {
    year: { type: String, required: true, trim: true },
    chapter: { type: String, default: "" },
    note: { type: String, default: "" },
    works: { type: [workSchema], default: [] },
  },
  { _id: false }
);

const aboutSchema = new mongoose.Schema(
  {
    // Singleton: there is exactly one About document, with id "main".
    _id: { type: String, default: "main" },
    bio: {
      // Display name shown as the big title on /about (e.g. "Zaid Ikram").
      name: { type: String, default: "" },
      hero: { type: String, default: "" },
      intro: { type: String, default: "" },
      // Free-form paragraphs ("How I began" body).
      beginnings: { type: [String], default: [] },
    },
    journey: { type: [journeyYearSchema], default: [] },
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

export const About = mongoose.model("About", aboutSchema);

// Helper used by routes + seed: get-or-create the singleton.
export async function getAbout() {
  let doc = await About.findById("main");
  if (!doc) doc = await About.create({ _id: "main" });
  return doc;
}
