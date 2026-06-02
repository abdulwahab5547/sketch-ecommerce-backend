import mongoose from "mongoose";

// One stage in the working process (Reference → Block-in → Render → Ship).
const stepSchema = new mongoose.Schema(
  {
    num: { type: String, default: "" },
    title: { type: String, required: true, trim: true },
    desc: { type: String, default: "" },
  },
  { _id: false }
);

// One thing that ships in the box alongside the artwork.
const shippedSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const studioSchema = new mongoose.Schema(
  {
    // Singleton: there is exactly one Studio document, with id "main".
    _id: { type: String, default: "main" },
    eyebrow: { type: String, default: "Inside the studio" },
    title: { type: String, default: "The Studio" },
    intro: { type: String, default: "" },
    process: { type: [stepSchema], default: [] },
    // What's shipped in the box alongside the original.
    shippedIntro: { type: String, default: "" },
    shipped: { type: [shippedSchema], default: [] },
    // Certificate of authenticity — image + caption. The image is uploaded to
    // Cloudinary (same endpoint the product form uses).
    certificateIntro: { type: String, default: "" },
    certificateImageUrl: { type: String, default: null },
    certificatePublicId: { type: String, default: null },
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

export const Studio = mongoose.model("Studio", studioSchema);

// Helper used by routes + seed: get-or-create the singleton.
export async function getStudio() {
  let doc = await Studio.findById("main");
  if (!doc) doc = await Studio.create({ _id: "main" });
  return doc;
}
