import mongoose from "mongoose";

// One slide of the homepage hero carousel.
const heroSlideSchema = new mongoose.Schema(
  {
    eyebrow: { type: String, default: "" },
    title: { type: String, default: "" },
    titleMeta: { type: String, default: "" },
    lede: { type: String, default: "" },
    ctaLabel: { type: String, default: "" },
    href: { type: String, default: "" },
    imageUrl: { type: String, default: null },
    publicId: { type: String, default: null },
  },
  { _id: false }
);

const stepSchema = new mongoose.Schema(
  {
    num: { type: String, default: "" },
    title: { type: String, required: true, trim: true },
    desc: { type: String, default: "" },
  },
  { _id: false }
);

const socialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    href: { type: String, default: "" },
  },
  { _id: false }
);

// One figure in the homepage hero stat row ("142 / originals sold").
const heroStatSchema = new mongoose.Schema(
  {
    num: { type: String, default: "" },
    label: { type: String, default: "" },
  },
  { _id: false }
);

// One manual payment option shown at checkout (JazzCash, bank transfer, …).
const paymentMethodSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    accountName: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    extra: { type: String, default: "" },
  },
  { _id: false }
);

const settingsSchema = new mongoose.Schema(
  {
    // Singleton: exactly one Settings document, id "main".
    _id: { type: String, default: "main" },

    hero: {
      slides: { type: [heroSlideSchema], default: [] },
      // The little stat row under the carousel.
      stats: { type: [heroStatSchema], default: [] },
    },

    // "Selected work" section.
    work: {
      eyebrow: { type: String, default: "Selected work" },
      title: { type: String, default: "" },
      lede: { type: String, default: "" },
      // Specific products to feature (by id). Empty → falls back to the 3 most
      // recent products.
      productIds: { type: [String], default: [] },
    },

    // The pull-quote ("I draw the figures…").
    quote: {
      text: { type: String, default: "" },
      attribution: { type: String, default: "" },
    },

    // Homepage process section.
    process: {
      eyebrow: { type: String, default: "The process" },
      title: { type: String, default: "" },
      steps: { type: [stepSchema], default: [] },
    },

    // Global contact + socials.
    contactEmail: { type: String, default: "" },
    socials: { type: [socialSchema], default: [] },

    // Footer copyright + sign-off (e.g. "© 2026 {brandName} · {tagline}").
    footer: {
      brandName: { type: String, default: "" },
      tagline: { type: String, default: "" },
      note: { type: String, default: "" },
    },

    // Portfolio page (/portfolio) intro copy. The gallery itself is the
    // product catalogue; this is just the heading + lede above it.
    portfolio: {
      eyebrow: { type: String, default: "" },
      title: { type: String, default: "" },
      lede: { type: String, default: "" },
    },

    // Commissions page (/commissions) copy: heading, lede, and the
    // "how it works" steps.
    commissions: {
      eyebrow: { type: String, default: "" },
      title: { type: String, default: "" },
      lede: { type: String, default: "" },
      steps: { type: [String], default: [] },
    },

    // Manual-payment checkout config.
    payment: {
      // WhatsApp / phone number the customer sends their payment screenshot to.
      whatsapp: { type: String, default: "" },
      instructions: { type: String, default: "" },
      methods: { type: [paymentMethodSchema], default: [] },
    },
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

export const Settings = mongoose.model("Settings", settingsSchema);

export async function getSettings() {
  let doc = await Settings.findById("main");
  if (!doc) doc = await Settings.create({ _id: "main" });
  return doc;
}
