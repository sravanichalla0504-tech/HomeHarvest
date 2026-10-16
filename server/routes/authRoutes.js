const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const GrowerProfile = require("../models/GrowerProfile");
const { auth } = require("../middleware/auth");

// Validation helper
function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMsg = errors.array().map(e => e.msg).join(". ");
    res.status(400).json({ success: false, message: errorMsg, errors: errors.array() });
    return true;
  }
  return false;
}

// POST /api/auth/register
router.post(
  "/register",
  [
    body("name").trim().isLength({ min: 2, max: 80 }).withMessage("Name must be between 2 and 80 characters"),
    body("email").trim().isEmail().normalizeEmail().withMessage("Please enter a valid email address"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters long"),
    body("role")
      .optional()
      .isIn(["customer", "grower", "delivery"])
      .withMessage("Role must be customer, grower, or delivery"),
    body("phone").optional().trim().isLength({ max: 20 }),
    body("neighborhood").optional().trim().isLength({ max: 100 }),
    body("address").optional().trim().isLength({ max: 300 }),
    body("gardenName").optional().trim().isLength({ max: 120 }),
    body("gardenDescription").optional().trim().isLength({ max: 1000 })
  ],
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;

      const { name, email, password, role = "customer", phone = "", neighborhood = "", address = "", gardenName, gardenDescription } = req.body;

      // Ensure public registration cannot register admin
      if (role === "admin") {
        return res.status(403).json({ success: false, message: "Administrator accounts cannot be registered publicly." });
      }

      // Check existing email
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ success: false, message: "An account with this email address already exists." });
      }

      // Hash password securely
      const passwordHash = await bcrypt.hash(password, 12);

      const user = await User.create({
        name,
        email,
        passwordHash,
        role,
        phone,
        neighborhood,
        address
      });

      // If user registered as grower, initialize a GrowerProfile
      let growerProfile = null;
      if (role === "grower") {
        growerProfile = await GrowerProfile.create({
          userId: user._id,
          gardenName: gardenName || `${name}'s Garden`,
          gardenDescription: gardenDescription || "Fresh home-grown vegetables nurtured with organic compost and care.",
          neighborhood: neighborhood || "Local Community",
          growingPractices: ["Homemade Compost", "No Synthetic Chemicals", "Rainwater Harvesting"]
        });
      }

      const secret = process.env.JWT_SECRET || "fallback_dev_secret_only";
      const token = jwt.sign({ id: user._id, role: user.role }, secret, { expiresIn: "7d" });

      res.status(201).json({
        success: true,
        message: "Registration successful!",
        token,
        user: user.toSafeObject(),
        growerProfile
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  "/login",
  [
    body("email").trim().isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required")
  ],
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;

      const email = String(req.body.email || "").toLowerCase().trim();
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(401).json({ success: false, message: "Incorrect email or password." });
      }

      const passwordValid = await bcrypt.compare(String(req.body.password || ""), user.passwordHash);
      if (!passwordValid) {
        return res.status(401).json({ success: false, message: "Incorrect email or password." });
      }

      if (user.accountStatus === "suspended") {
        return res.status(403).json({ success: false, message: "Your account has been suspended. Please contact admin." });
      }

      const secret = process.env.JWT_SECRET || "fallback_dev_secret_only";
      const token = jwt.sign({ id: user._id, role: user.role }, secret, { expiresIn: "7d" });

      let growerProfile = null;
      if (user.role === "grower") {
        growerProfile = await GrowerProfile.findOne({ userId: user._id });
      }

      res.json({
        success: true,
        message: "Welcome back!",
        token,
        user: user.toSafeObject(),
        growerProfile
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
router.get("/me", auth, async (req, res, next) => {
  try {
    let growerProfile = null;
    if (req.user.role === "grower") {
      growerProfile = await GrowerProfile.findOne({ userId: req.user._id });
    }
    res.json({
      success: true,
      user: req.user.toSafeObject(),
      growerProfile
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/profile
router.patch(
  "/profile",
  auth,
  [
    body("name").optional().trim().isLength({ min: 2, max: 80 }),
    body("phone").optional().trim().isLength({ max: 20 }),
    body("neighborhood").optional().trim().isLength({ max: 100 }),
    body("address").optional().trim().isLength({ max: 300 }),
    body("bio").optional().trim().isLength({ max: 500 })
  ],
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;

      const allowed = ["name", "phone", "neighborhood", "address", "bio"];
      const user = await User.findById(req.user._id);

      for (const field of allowed) {
        if (req.body[field] !== undefined) {
          user[field] = req.body[field];
        }
      }

      await user.save();

      // If neighborhood was updated and user is grower, update grower profile too
      if (user.role === "grower" && req.body.neighborhood) {
        await GrowerProfile.findOneAndUpdate(
          { userId: user._id },
          { neighborhood: req.body.neighborhood }
        );
      }

      res.json({
        success: true,
        message: "Profile updated successfully",
        user: user.toSafeObject()
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
