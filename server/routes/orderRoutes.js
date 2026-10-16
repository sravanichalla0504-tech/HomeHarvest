const router = require("express").Router();
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Delivery = require("../models/Delivery");
const GrowerProfile = require("../models/GrowerProfile");
const { auth, allowRoles } = require("../middleware/auth");

// State transition rules
const ALLOWED_TRANSITIONS = {
  placed: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: []
};

// Helper to safely decrement stock atomically (works on Standalone & Replica Set)
async function decrementStockSafely(items) {
  const decremented = [];
  try {
    for (const item of items) {
      const qty = Number(item.quantity);
      // Atomic condition: decrement only if quantity >= qty and active
      const updated = await Product.findOneAndUpdate(
        { _id: item.productId, quantity: { $gte: qty }, active: true },
        { $inc: { quantity: -qty } },
        { new: true }
      );

      if (!updated) {
        throw new Error(`Insufficient stock or unavailable item: ${item.name || item.productId}`);
      }
      decremented.push({ productId: item.productId, quantity: qty });
    }
    return true;
  } catch (err) {
    // Compensating rollback for any already decremented products
    for (const d of decremented) {
      await Product.findByIdAndUpdate(d.productId, { $inc: { quantity: d.quantity } });
    }
    throw err;
  }
}

// POST /api/orders - Place order
router.post("/", auth, allowRoles("customer"), async (req, res, next) => {
  try {
    const { items, deliveryAddress, deliveryPhone = "", deliveryNotes = "" } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Your cart is empty. Please add items." });
    }

    if (items.length > 50) {
      return res.status(400).json({ success: false, message: "Order limit exceeded." });
    }

    if (!String(deliveryAddress || "").trim()) {
      return res.status(400).json({ success: false, message: "Delivery address is required." });
    }

    // 1. Fetch live product info and compute authoritative pricing
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const qty = parseInt(item.quantity, 10);
      if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
        return res.status(400).json({ success: false, message: "Invalid quantity specified for produce." });
      }

      const product = await Product.findById(item.productId);
      if (!product || !product.active) {
        return res.status(400).json({ success: false, message: `Produce "${item.name || 'item'}" is currently unavailable.` });
      }

      if (product.quantity < qty && !product.isPreOrder) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.quantity} ${product.unit} available for ${product.name}. Please adjust quantity.`
        });
      }

      const itemSubtotal = product.price * qty;
      subtotal += itemSubtotal;

      orderItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        unit: product.unit,
        quantity: qty,
        itemSubtotal,
        growerId: product.growerId
      });
    }

    // Fixed hyperlocal community delivery fee
    const deliveryFee = 30;
    const totalAmount = subtotal + deliveryFee;

    // 2. Perform atomic stock decrement with rollback guard
    await decrementStockSafely(orderItems);

    // 3. Create Order
    const order = await Order.create({
      customerId: req.user._id,
      items: orderItems,
      deliveryAddress: String(deliveryAddress).trim(),
      deliveryPhone: String(deliveryPhone || req.user.phone || "").trim(),
      deliveryNotes: String(deliveryNotes || "").trim(),
      subtotal,
      deliveryFee,
      totalAmount,
      paymentMethod: "cash_on_delivery",
      paymentStatus: "pending",
      status: "placed",
      statusTimeline: { placed: new Date() }
    });

    // 4. Create Delivery Dispatch entry
    await Delivery.create({
      orderId: order._id,
      status: "unassigned",
      deliveryAddress: order.deliveryAddress,
      deliveryNotes: order.deliveryNotes
    });

    res.status(201).json({
      success: true,
      message: "Order placed successfully! Delivery partner will be assigned when the harvest is ready.",
      order
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || "Failed to place order." });
  }
});

// GET /api/orders/mine - Filter orders by user role
router.get("/mine", auth, async (req, res, next) => {
  try {
    let filter = {};

    if (req.user.role === "customer") {
      filter = { customerId: req.user._id };
    } else if (req.user.role === "grower") {
      filter = { "items.growerId": req.user._id };
    } else if (req.user.role === "delivery") {
      // Find orders assigned to this delivery partner
      const deliveries = await Delivery.find({ deliveryPartnerId: req.user._id });
      const orderIds = deliveries.map(d => d.orderId);
      filter = { _id: { $in: orderIds } };
    } else if (req.user.role === "admin") {
      filter = {};
    }

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

// GET /api/orders/:id - Single order details with ownership verification
router.get("/:id", auth, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customerId", "name email phone neighborhood")
      .populate("items.growerId", "name phone neighborhood")
      .populate("items.productId", "image name unit");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    // Ownership check
    const isCustomer = String(order.customerId._id) === String(req.user._id);
    const isGrower = order.items.some(i => i.growerId && String(i.growerId._id) === String(req.user._id));
    const delivery = await Delivery.findOne({ orderId: order._id }).populate("deliveryPartnerId", "name phone");
    const isDeliveryPartner = delivery && delivery.deliveryPartnerId && String(delivery.deliveryPartnerId._id) === String(req.user._id);
    const isAdmin = req.user.role === "admin";

    if (!isCustomer && !isGrower && !isDeliveryPartner && !isAdmin) {
      return res.status(403).json({ success: false, message: "You do not have permission to view this order." });
    }

    res.json({
      success: true,
      order,
      delivery,
      canCancel: isCustomer ? order.status === "placed" : ["grower", "admin"].includes(req.user.role) && !["delivered", "cancelled"].includes(order.status)
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/orders/:id/status - Status transitions
router.patch("/:id/status", auth, async (req, res, next) => {
  try {
    const { status, cancellationReason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found." });

    const currentStatus = order.status;
    const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];

    if (!allowedNext.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid transition: cannot move from '${currentStatus}' to '${status}'. Allowed: ${allowedNext.join(", ")}`
      });
    }

    // Role-specific permission checks
    const isCustomer = String(order.customerId) === String(req.user._id);
    const isGrower = order.items.some(i => String(i.growerId) === String(req.user._id));
    const delivery = await Delivery.findOne({ orderId: order._id });
    const isDeliveryPartner = delivery && delivery.deliveryPartnerId && String(delivery.deliveryPartnerId) === String(req.user._id);
    const isAdmin = req.user.role === "admin";

    if (status === "cancelled") {
      if (isCustomer && currentStatus !== "placed") {
        return res.status(403).json({ success: false, message: "Customers can only cancel orders while status is 'placed'." });
      }
      if (!isCustomer && !isGrower && !isAdmin) {
        return res.status(403).json({ success: false, message: "You are not authorized to cancel this order." });
      }

      // Restock inventory on cancellation
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, { $inc: { quantity: item.quantity } });
      }
      order.cancellationReason = cancellationReason || (isCustomer ? "Cancelled by customer" : "Cancelled by grower/admin");
    } else if (["accepted", "preparing", "ready"].includes(status)) {
      if (!isGrower && !isAdmin) {
        return res.status(403).json({ success: false, message: "Only the grower or admin can update preparation status." });
      }
      if (status === "ready" && delivery) {
        delivery.status = delivery.deliveryPartnerId ? "assigned" : "unassigned";
        await delivery.save();
      }
    } else if (["out_for_delivery", "delivered"].includes(status)) {
      if (!isDeliveryPartner && !isAdmin) {
        return res.status(403).json({ success: false, message: "Only assigned delivery partner or admin can update delivery progress." });
      }
      if (status === "delivered") {
        order.paymentStatus = "paid";
        if (delivery) {
          delivery.status = "delivered";
          delivery.deliveredAt = new Date();
          await delivery.save();
        }
      }
    }

    order.status = status;
    order.statusTimeline[status] = new Date();
    await order.save();

    res.json({
      success: true,
      message: `Order status updated to ${status}.`,
      order
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
