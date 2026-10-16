const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const Product = require("../models/Product");
const User = require("../models/User");
const GrowerProfile = require("../models/GrowerProfile");
const { auth, allowRoles } = require("../middleware/auth");

// GET /api/products - Browse products with search, category, surplus, pre-order, neighborhood filters
router.get("/", async (req, res, next) => {
  try {
    const filter = { active: true };

    // Search query
    if (req.query.q) {
      const q = String(req.query.q).trim();
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } }
      ];
    }

    // Category filter
    if (req.query.category && req.query.category !== "all") {
      filter.category = String(req.query.category);
    }

    // Surplus Harvest Rescue filter
    if (req.query.isSurplus === "true") {
      filter.isSurplus = true;
    }

    // Pre-orders filter
    if (req.query.isPreOrder === "true") {
      filter.isPreOrder = true;
    }

    // In stock filter (by default show only in-stock or pre-orders)
    if (req.query.inStockOnly !== "false") {
      filter.$or = filter.$or
        ? [{ $and: [{ $or: filter.$or }, { $or: [{ quantity: { $gt: 0 } }, { isPreOrder: true }] }] }]
        : [{ quantity: { $gt: 0 } }, { isPreOrder: true }];
    }

    // Sorting
    let sort = { createdAt: -1 };
    if (req.query.sort === "price_asc") sort = { price: 1 };
    else if (req.query.sort === "price_desc") sort = { price: -1 };
    else if (req.query.sort === "harvest_recent") sort = { harvestDate: -1 };
    else if (req.query.sort === "name_asc") sort = { name: 1 };

    let products = await Product.find(filter)
      .populate("growerId", "name neighborhood phone")
      .sort(sort)
      .limit(100);

    // Neighborhood filter (in-memory post-populate or grower query)
    if (req.query.neighborhood && req.query.neighborhood !== "all") {
      const targetNeighborhood = String(req.query.neighborhood).toLowerCase();
      products = products.filter(
        p => p.growerId && p.growerId.neighborhood && p.growerId.neighborhood.toLowerCase().includes(targetNeighborhood)
      );
    }

    res.json({
      success: true,
      count: products.length,
      products
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/mine - Grower's own products
router.get("/mine", auth, allowRoles("grower", "admin"), async (req, res, next) => {
  try {
    const filter = req.user.role === "admin" ? {} : { growerId: req.user._id };
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: products.length, products });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id - Single product details
router.get("/:id", async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate("growerId", "name neighborhood bio phone");
    if (!product) {
      return res.status(404).json({ success: false, message: "Produce item not found." });
    }

    let growerProfile = null;
    if (product.growerId) {
      growerProfile = await GrowerProfile.findOne({ userId: product.growerId._id });
    }

    res.json({
      success: true,
      product,
      growerProfile
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/products - Create listing
router.post(
  "/",
  auth,
  allowRoles("grower", "admin"),
  [
    body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Produce name is required (2-100 chars)"),
    body("price").isFloat({ min: 0 }).withMessage("Valid price is required"),
    body("quantity").isInt({ min: 0 }).withMessage("Quantity must be a positive integer or zero"),
    body("unit").trim().notEmpty().withMessage("Unit is required (e.g. 500 g, 1 kg)"),
    body("category").optional().trim(),
    body("description").optional().trim().isLength({ max: 600 }),
    body("image").optional().trim(),
    body("growingMethod").optional().trim().isLength({ max: 200 }),
    body("isSurplus").optional().isBoolean(),
    body("originalPrice").optional().isFloat({ min: 0 }),
    body("isPreOrder").optional().isBoolean(),
    body("expectedHarvestDate").optional().isISO8601()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array().map(e => e.msg).join(". ") });
      }

      const {
        name,
        description = "",
        category = "Vegetables",
        price,
        originalPrice = null,
        isSurplus = false,
        isPreOrder = false,
        expectedHarvestDate = null,
        unit = "500 g",
        quantity = 0,
        image,
        harvestDate,
        growingMethod
      } = req.body;

      const product = await Product.create({
        growerId: req.user._id,
        name,
        description,
        category,
        price: Number(price),
        originalPrice: originalPrice ? Number(originalPrice) : null,
        isSurplus: Boolean(isSurplus),
        isPreOrder: Boolean(isPreOrder),
        expectedHarvestDate: expectedHarvestDate ? new Date(expectedHarvestDate) : null,
        unit,
        quantity: Number(quantity),
        image: image || "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80",
        harvestDate: harvestDate ? new Date(harvestDate) : new Date(),
        growingMethod: growingMethod || "Natural home compost, zero synthetic pesticides",
        active: true
      });

      res.status(201).json({ success: true, message: "Produce listing created successfully!", product });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/products/:id - Update product
router.patch("/:id", auth, allowRoles("grower", "admin"), async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Produce not found." });

    if (req.user.role !== "admin" && String(product.growerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "You can only edit your own produce listings." });
    }

    const fields = [
      "name",
      "description",
      "category",
      "price",
      "originalPrice",
      "isSurplus",
      "isPreOrder",
      "expectedHarvestDate",
      "unit",
      "quantity",
      "image",
      "harvestDate",
      "growingMethod",
      "active"
    ];

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (f === "price" || f === "originalPrice" || f === "quantity") {
          product[f] = Number(req.body[f]);
        } else {
          product[f] = req.body[f];
        }
      }
    }

    await product.save();
    res.json({ success: true, message: "Produce updated successfully!", product });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id - Delete product
router.delete("/:id", auth, allowRoles("grower", "admin"), async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Produce not found." });

    if (req.user.role !== "admin" && String(product.growerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "You can only delete your own produce listings." });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Produce listing deleted." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
