import mongoose from "mongoose";

export const VALID_COMMISSION_STATUSES = ["new", "replied", "closed"];

const commissionSchema = new mongoose.Schema(
  {
    // Short readable reference, e.g. "CM-7K2QF9".
    ref: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: "" },
    // What they want drawn (free text, e.g. "Car", "Anime character").
    subject: { type: String, default: "" },
    budget: { type: String, default: "" },
    deadline: { type: String, default: "" },
    message: { type: String, default: "" },
    status: {
      type: String,
      enum: VALID_COMMISSION_STATUSES,
      default: "new",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

export const Commission = mongoose.model("Commission", commissionSchema);
