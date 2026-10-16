const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    growerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    name: {
      type: String,
      required: [true, "Produce name is required"],
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 600,
      default: ""
    },
    category: {
      type: String,
      enum: ["Leafy Greens", "Vegetables", "Herbs", "Root Vegetables", "Gourds", "Seasonal Specials"],
      default: "Vegetables"
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"]
    },
    originalPrice: {
      type: Number,
      min: 0,
      default: null
    },
    isSurplus: {
      type: Boolean,
      default: false
    },
    isPreOrder: {
      type: Boolean,
      default: false
    },
    expectedHarvestDate: {
      type: Date,
      default: null
    },
    unit: {
      type: String,
      required: true,
      default: "500 g"
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, "Quantity cannot be negative"],
      default: 0
    },
    image: {
      type: String,
      default: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80"
    },
    harvestDate: {
      type: Date,
      default: Date.now
    },
    growingMethod: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "Natural home compost, zero synthetic pesticides"
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

productSchema.index({ name: "text", description: "text", category: "text" });
productSchema.index({ growerId: 1, active: 1 });
productSchema.index({ category: 1, active: 1 });

module.exports = mongoose.model("Product", productSchema);
