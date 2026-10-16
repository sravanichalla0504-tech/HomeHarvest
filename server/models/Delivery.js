const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true
    },
    deliveryPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    status: {
      type: String,
      enum: ["unassigned", "assigned", "accepted", "picked_up", "delivered"],
      default: "unassigned"
    },
    pickupAddress: {
      type: String,
      default: ""
    },
    deliveryAddress: {
      type: String,
      required: true
    },
    deliveryNotes: {
      type: String,
      default: ""
    },
    assignedAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    pickedUpAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null }
  },
  { timestamps: true }
);

deliverySchema.index({ deliveryPartnerId: 1, status: 1 });

module.exports = mongoose.model("Delivery", deliverySchema);
