const router = require("express").Router();
const GrowerProfile = require("../models/GrowerProfile");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { auth, allowRoles } = require("../middleware/auth");

// GET /api/growers - Public list of local home growers
router.get("/", async (req, res, next) => {
  try {
    const filter = { isAcceptingOrders: true };
    if (req.query.neighborhood) {
      filter.neighborhood = new RegExp(String(req.query.neighborhood).trim(), "i");
    }

    const profiles = await GrowerProfile.find(filter)
      .populate("userId", "name neighborhood bio phone")
      .sort({ verificationStatus: -1, createdAt: -1 });

    res.json({ success: true, count: profiles.length, growers: profiles });
  } catch (err) {
    next(err);
  }
});

// GET /api/growers/earnings - Grower earnings dashboard
router.get("/earnings", auth, allowRoles("grower", "admin"), async (req, res, next) => {
  try {
    const growerId = req.user._id;

    // Find all orders containing this grower's items
    const orders = await Order.find({ "items.growerId": growerId });

    let grossSales = 0;
    let pendingSales = 0;
    let completedSales = 0;
    let totalItemsSold = 0;
    let surplusRescuedKg = 0;

    const completedOrders = [];
    const pendingOrders = [];

    for (const order of orders) {
      const myItems = order.items.filter(i => String(i.growerId) === String(growerId));
      const orderGrowerTotal = myItems.reduce((sum, item) => sum + item.itemSubtotal, 0);

      grossSales += orderGrowerTotal;

      if (order.status === "delivered") {
        completedSales += orderGrowerTotal;
        completedOrders.push(order);
        totalItemsSold += myItems.reduce((sum, i) => sum + i.quantity, 0);
      } else if (order.status !== "cancelled") {
        pendingSales += orderGrowerTotal;
        pendingOrders.push(order);
      }
    }

    // Platform fee calculation: transparent community fee of 5% for app maintenance
    const platformFeeRate = 0.05;
    const estimatedPlatformFees = Math.round(completedSales * platformFeeRate);
    const netEarnings = Math.max(0, completedSales - estimatedPlatformFees);

    res.json({
      success: true,
      summary: {
        completedSales,
        pendingSales,
        grossSales,
        estimatedPlatformFees,
        platformFeePercentage: "5%",
        netEarnings,
        totalItemsSold,
        totalOrdersCount: orders.length,
        completedOrdersCount: completedOrders.length,
        pendingOrdersCount: pendingOrders.length
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/growers/:id - Single grower details + their produce listings
router.get("/:id", async (req, res, next) => {
  try {
    // ID could be GrowerProfile._id or userId
    let profile = await GrowerProfile.findById(req.params.id).populate("userId", "name neighborhood bio phone");
    if (!profile) {
      profile = await GrowerProfile.findOne({ userId: req.params.id }).populate("userId", "name neighborhood bio phone");
    }

    if (!profile) {
      return res.status(404).json({ success: false, message: "Grower profile not found." });
    }

    const products = await Product.find({ growerId: profile.userId._id, active: true }).sort({ createdAt: -1 });

    res.json({
      success: true,
      grower: profile,
      products
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/growers/profile - Update grower garden profile
router.patch("/profile", auth, allowRoles("grower", "admin"), async (req, res, next) => {
  try {
    let profile = await GrowerProfile.findOne({ userId: req.user._id });
    if (!profile) {
      profile = new GrowerProfile({
        userId: req.user._id,
        gardenName: `${req.user.name}'s Garden`,
        neighborhood: req.user.neighborhood || "Neighborhood"
      });
    }

    const allowed = ["gardenName", "gardenType", "gardenDescription", "neighborhood", "growingPractices", "isAcceptingOrders"];
    for (const f of allowed) {
      if (req.body[f] !== undefined) {
        profile[f] = req.body[f];
      }
    }

    await profile.save();
    res.json({ success: true, message: "Garden profile updated!", profile });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
