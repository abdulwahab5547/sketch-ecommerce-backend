import mongoose from "mongoose";

export const VALID_ORDER_STATUSES = ["pending", "confirmed", "cancelled"];

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, default: null },
    title: { type: String, default: "" },
    price: { type: Number, default: 0 },
    qty: { type: Number, default: 1, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // Short human-friendly reference the customer uses to track the order.
    ref: { type: String, required: true, unique: true, index: true },
    customer: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      phone: { type: String, default: "" },
      address: { type: String, default: "" },
      city: { type: String, default: "" },
      country: { type: String, default: "" },
      notes: { type: String, default: "" },
    },
    items: { type: [orderItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paymentMethod: { type: String, default: "" },
    status: {
      type: String,
      enum: VALID_ORDER_STATUSES,
      default: "pending",
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

export const Order = mongoose.model("Order", orderSchema);
