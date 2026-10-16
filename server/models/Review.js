const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    growerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be between 1 and 5"],
      max: [5, "Rating must be between 1 and 5"]
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 600,
      default: ""
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// One review per customer per order per grower
reviewSchema.index({ customerId: 1, orderId: 1, growerId: 1 }, { unique: true });
reviewSchema.index({ growerId: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
