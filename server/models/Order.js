const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  unit: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  itemSubtotal: { type: Number, required: true },
  growerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
});

const orderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    items: [orderItemSchema],
    deliveryAddress: {
      type: String,
      required: [true, "Delivery address is required"],
      maxlength: 500
    },
    deliveryPhone: {
      type: String,
      trim: true,
      maxlength: 25,
      default: ""
    },
    deliveryNotes: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ""
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    deliveryFee: {
      type: Number,
      required: true,
      default: 30,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery"],
      default: "cash_on_delivery"
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending"
    },
    status: {
      type: String,
      enum: ["placed", "accepted", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"],
      default: "placed"
    },
    statusTimeline: {
      placed: { type: Date, default: Date.now },
      accepted: { type: Date, default: null },
      preparing: { type: Date, default: null },
      ready: { type: Date, default: null },
      out_for_delivery: { type: Date, default: null },
      delivered: { type: Date, default: null },
      cancelled: { type: Date, default: null }
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ""
    }
  },
  { timestamps: true }
);

orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ "items.growerId": 1, status: 1 });

module.exports = mongoose.model("Order", orderSchema);
