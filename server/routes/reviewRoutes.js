const router = require("express").Router();
const Review = require("../models/Review");
const Order = require("../models/Order");
const { auth, allowRoles } = require("../middleware/auth");

// POST /api/reviews - Add verified review
router.post("/", auth, allowRoles("customer"), async (req, res, next) => {
  try {
    const { orderId, growerId, rating, comment } = req.body;

    if (!orderId || !growerId || !rating) {
      return res.status(400).json({ success: false, message: "OrderId, growerId, and rating (1-5) are required." });
    }

    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be an integer between 1 and 5." });
    }

    // Verify order exists, was placed by customer, is delivered, and contains grower's item
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    if (String(order.customerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "You can only review orders that you placed." });
    }

    if (order.status !== "delivered") {
      return res.status(400).json({
        success: false,
        message: "Reviews can only be submitted after your harvest order has been delivered."
      });
    }

    const hasGrowerItem = order.items.some(i => String(i.growerId) === String(growerId));
    if (!hasGrowerItem) {
      return res.status(400).json({ success: false, message: "This order did not include produce from the specified grower." });
    }

    // Check if duplicate review already submitted
    const existing = await Review.findOne({ customerId: req.user._id, orderId, growerId });
    if (existing) {
      return res.status(409).json({ success: false, message: "You have already reviewed this grower for this order." });
    }

    const review = await Review.create({
      customerId: req.user._id,
      growerId,
      orderId,
      rating: numRating,
      comment: String(comment || "").trim(),
      isVerifiedPurchase: true
    });

    res.status(201).json({
      success: true,
      message: "Thank you for your verified harvest review!",
      review
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reviews/grower/:growerId - Get verified reviews for a grower
router.get("/grower/:growerId", async (req, res, next) => {
  try {
    const reviews = await Review.find({ growerId: req.params.growerId })
      .populate("customerId", "name neighborhood")
      .sort({ createdAt: -1 });

    const total = reviews.length;
    const avgRating = total > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1) : 0;

    res.json({
      success: true,
      count: total,
      averageRating: Number(avgRating),
      reviews
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
