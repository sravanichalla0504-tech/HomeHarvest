const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 80
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"]
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"]
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: ""
    },
    role: {
      type: String,
      enum: ["customer", "grower", "delivery", "admin"],
      default: "customer"
    },
    neighborhood: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ""
    },
    address: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ""
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },
    accountStatus: {
      type: String,
      enum: ["active", "suspended"],
      default: "active"
    }
  },
  { timestamps: true }
);

// Method to return user info safe from leaking password
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    _id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    neighborhood: this.neighborhood,
    address: this.address,
    bio: this.bio,
    accountStatus: this.accountStatus,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model("User", userSchema);
