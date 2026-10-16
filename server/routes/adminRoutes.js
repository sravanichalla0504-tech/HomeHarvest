const router = require("express").Router();
const User = require("../models/User");
const GrowerProfile = require("../models/GrowerProfile");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Delivery = require("../models/Delivery");
const { auth, allowRoles } = require("../middleware/auth");

// All admin routes strictly enforce role "admin"
router.use(auth, allowRoles("admin"));

// GET /api/admin/overview - High-level metrics
router.get("/overview", async (req, res, next) => {
  try {
    const [totalUsers, totalProducts, totalOrders, pendingVerifications] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      GrowerProfile.countDocuments({ verificationStatus: "pending" })
    ]);

    const usersByRole = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } }
    ]);

    const orderStats = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalSales: { $sum: "$totalAmount" }
        }
      }
    ]);

    const deliveredOrders = orderStats.find(s => s._id === "delivered");
    const totalDeliveredRevenue = deliveredOrders ? deliveredOrders.totalSales : 0;

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalProducts,
        totalOrders,
        pendingVerifications,
        totalDeliveredRevenue,
        usersByRole: usersByRole.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
        orderStats: orderStats.reduce((acc, curr) => ({ ...acc, [curr._id]: { count: curr.count, sales: curr.totalSales } }), {})
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users - User directory
router.get("/users", async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role && req.query.role !== "all") filter.role = req.query.role;
    if (req.query.q) {
      filter.$or = [
        { name: { $regex: req.query.q, $options: "i" } },
        { email: { $regex: req.query.q, $options: "i" } },
        { neighborhood: { $regex: req.query.q, $options: "i" } }
      ];
    }

    const users = await User.find(filter).select("-passwordHash").sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/status - Suspend or activate user
router.patch("/users/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'active' or 'suspended'." });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    if (user.role === "admin" && String(user._id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: "Administrators cannot suspend themselves." });
    }

    user.accountStatus = status;
    await user.save();

    res.json({ success: true, message: `User status changed to ${status}.`, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders - All orders
router.get("/orders", async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status && req.query.status !== "all") filter.status = req.query.status;

    const orders = await Order.find(filter)
      .populate("customerId", "name email phone neighborhood")
      .populate("items.growerId", "name phone neighborhood")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/growers/:id/verification - Verify or reject grower
router.patch("/growers/:id/verification", async (req, res, next) => {
  try {
    const { verificationStatus, verificationNotes } = req.body;
    if (!["verified", "rejected", "pending"].includes(verificationStatus)) {
      return res.status(400).json({ success: false, message: "Status must be verified, rejected, or pending." });
    }

    let profile = await GrowerProfile.findById(req.params.id);
    if (!profile) {
      profile = await GrowerProfile.findOne({ userId: req.params.id });
    }

    if (!profile) return res.status(404).json({ success: false, message: "Grower profile not found." });

    profile.verificationStatus = verificationStatus;
    if (verificationNotes !== undefined) profile.verificationNotes = verificationNotes;
    await profile.save();

    res.json({ success: true, message: `Grower marked as ${verificationStatus}.`, profile });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/deliveries/assign - Manual delivery partner assignment
router.post("/deliveries/assign", async (req, res, next) => {
  try {
    const { orderId, deliveryPartnerId } = req.body;
    if (!orderId || !deliveryPartnerId) {
      return res.status(400).json({ success: false, message: "orderId and deliveryPartnerId are required." });
    }

    const partner = await User.findOne({ _id: deliveryPartnerId, role: "delivery" });
    if (!partner) return res.status(404).json({ success: false, message: "Delivery partner not found." });

    let delivery = await Delivery.findOne({ orderId });
    if (!delivery) {
      const order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ success: false, message: "Order not found." });
      delivery = new Delivery({
        orderId,
        deliveryAddress: order.deliveryAddress
      });
    }

    delivery.deliveryPartnerId = partner._id;
    delivery.status = "assigned";
    delivery.assignedAt = new Date();
    await delivery.save();

    res.json({ success: true, message: `Assigned delivery to ${partner.name}.`, delivery });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
