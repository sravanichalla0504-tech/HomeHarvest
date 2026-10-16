const mongoose = require("mongoose");

const growerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    gardenName: {
      type: String,
      required: [true, "Garden name is required"],
      trim: true,
      maxlength: 120
    },
    gardenType: {
      type: String,
      enum: ["Terrace Garden", "Balcony Garden", "Backyard Garden", "Community Plot"],
      default: "Terrace Garden"
    },
    gardenDescription: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },
    neighborhood: {
      type: String,
      required: [true, "Neighborhood is required"],
      trim: true,
      maxlength: 100
    },
    growingPractices: {
      type: [String],
      default: ["Homemade Compost", "No Synthetic Pesticides", "Manual Weed Removal"]
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending"
    },
    verificationEvidence: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },
    verificationNotes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },
    totalSurplusRescuedKg: {
      type: Number,
      default: 0,
      min: 0
    },
    isAcceptingOrders: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

growerProfileSchema.index({ neighborhood: 1, verificationStatus: 1 });

module.exports = mongoose.model("GrowerProfile", growerProfileSchema);
