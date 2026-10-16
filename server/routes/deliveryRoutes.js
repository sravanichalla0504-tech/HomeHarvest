const router = require("express").Router();
const Delivery = require("../models/Delivery");
const Order = require("../models/Order");
const { auth, allowRoles } = require("../middleware/auth");

// GET /api/deliveries/available - Available pickup jobs for delivery partners
router.get("/available", auth, allowRoles("delivery", "admin"), async (req, res, next) => {
  try {
    // Deliveries that are unassigned and whose order is ready
    const deliveries = await Delivery.find({ status: "unassigned" })
      .populate({
        path: "orderId",
        match: { status: "ready" },
        populate: [
          { path: "customerId", select: "name phone neighborhood" },
          { path: "items.growerId", select: "name phone neighborhood address" }
        ]
      })
      .sort({ createdAt: -1 });

    // Filter out deliveries where order did not match status ready
    const available = deliveries.filter(d => d.orderId !== null);

    res.json({ success: true, count: available.length, deliveries: available });
  } catch (err) {
    next(err);
  }
});

// GET /api/deliveries/mine - Delivery partner's claimed/assigned tasks
router.get("/mine", auth, allowRoles("delivery", "admin"), async (req, res, next) => {
  try {
    const filter = req.user.role === "admin" ? {} : { deliveryPartnerId: req.user._id };

    const deliveries = await Delivery.find(filter)
      .populate({
        path: "orderId",
        populate: [
          { path: "customerId", select: "name phone neighborhood address" },
          { path: "items.growerId", select: "name phone neighborhood address" }
        ]
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: deliveries.length, deliveries });
  } catch (err) {
    next(err);
  }
});

// POST /api/deliveries/:id/accept - Delivery partner claims job
router.post("/:id/accept", auth, allowRoles("delivery"), async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ success: false, message: "Delivery dispatch not found." });

    if (delivery.deliveryPartnerId && String(delivery.deliveryPartnerId) !== String(req.user._id)) {
      return res.status(409).json({ success: false, message: "This delivery job has already been claimed by another partner." });
    }

    delivery.deliveryPartnerId = req.user._id;
    delivery.status = "accepted";
    delivery.acceptedAt = new Date();
    await delivery.save();

    res.json({ success: true, message: "Delivery claimed successfully!", delivery });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/deliveries/:id/status - Update delivery status (picked_up, delivered)
router.patch("/:id/status", auth, allowRoles("delivery", "admin"), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["picked_up", "delivered"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'picked_up' or 'delivered'." });
    }

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ success: false, message: "Delivery not found." });

    if (req.user.role !== "admin" && String(delivery.deliveryPartnerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "You are not assigned to this delivery." });
    }

    const order = await Order.findById(delivery.orderId);
    if (!order) return res.status(404).json({ success: false, message: "Associated order not found." });

    if (status === "picked_up") {
      delivery.status = "picked_up";
      delivery.pickedUpAt = new Date();
      order.status = "out_for_delivery";
      order.statusTimeline.out_for_delivery = new Date();
    } else if (status === "delivered") {
      delivery.status = "delivered";
      delivery.deliveredAt = new Date();
      order.status = "delivered";
      order.statusTimeline.delivered = new Date();
      order.paymentStatus = "paid";
    }

    await delivery.save();
    await order.save();

    res.json({
      success: true,
      message: `Delivery updated to ${status}.`,
      delivery,
      order
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
