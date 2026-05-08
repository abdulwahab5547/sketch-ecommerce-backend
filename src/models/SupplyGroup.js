import mongoose from "mongoose";

export const VALID_GLYPHS = ["pencil", "paper", "eraser", "ink", "tool"];

const itemSchema = new mongoose.Schema(
  {
    brand: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    spec: { type: String, default: null },
    note: { type: String, default: null },
  },
  { _id: false }
);

const supplyGroupSchema = new mongoose.Schema(
  {
    // Slug ("pencils", "paper", "erasers"…) used in API + as scroll anchor.
    _id: { type: String },
    title: { type: String, required: true, trim: true },
    glyph: { type: String, enum: VALID_GLYPHS, default: "tool" },
    intro: { type: String, default: "" },
    items: { type: [itemSchema], default: [] },
    // Lower order numbers display first; ties broken by createdAt.
    order: { type: Number, default: 100 },
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

export const SupplyGroup = mongoose.model("SupplyGroup", supplyGroupSchema);
