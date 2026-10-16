require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const GrowerProfile = require("../models/GrowerProfile");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Delivery = require("../models/Delivery");
const Review = require("../models/Review");

async function seed() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/homeharvest";
  console.log(`[MongoDB] Connecting to: ${uri}`);
  await mongoose.connect(uri);

  console.log("[Clean] Clearing previous demo data...");
  await Promise.all([
    User.deleteMany({}),
    GrowerProfile.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
    Delivery.deleteMany({}),
    Review.deleteMany({})
  ]);

  console.log("[Users] Creating demo users with secure bcrypt hashes...");
  const adminHash = await bcrypt.hash("Admin@123", 12);
  const growerHash = await bcrypt.hash("Grower@123", 12);
  const customerHash = await bcrypt.hash("Customer@123", 12);
  const deliveryHash = await bcrypt.hash("Delivery@123", 12);

  const admin = await User.create({
    name: "HomeHarvest Admin",
    email: "admin@homeharvest.local",
    passwordHash: adminHash,
    role: "admin",
    phone: "9876543210",
    neighborhood: "Central City",
    address: "Admin HQ, Bengaluru",
    bio: "HomeHarvest Community Operations & Verification Desk"
  });

  const grower1 = await User.create({
    name: "Priya Sharma",
    email: "priya@homeharvest.local",
    passwordHash: growerHash,
    role: "grower",
    phone: "9876543211",
    neighborhood: "Indiranagar",
    address: "#42, 6th Cross, 12th Main, Indiranagar, Bengaluru",
    bio: "Terrace gardener with 5+ years of experience cultivating heirloom vegetables using organic compost."
  });

  const grower2 = await User.create({
    name: "Anita Rao",
    email: "anita@homeharvest.local",
    passwordHash: growerHash,
    role: "grower",
    phone: "9876543212",
    neighborhood: "Koramangala",
    address: "#88, 4th Block, Koramangala, Bengaluru",
    bio: "Urban gardener growing leafy greens, native herbs, and seasonal gourds in sunlit balcony containers."
  });

  const customer = await User.create({
    name: "Sneha Patel",
    email: "sneha@homeharvest.local",
    passwordHash: customerHash,
    role: "customer",
    phone: "9876543213",
    neighborhood: "Indiranagar",
    address: "#15, Defence Colony, Indiranagar, Bengaluru",
    bio: "Passionate about clean eating and supporting neighborhood home gardeners."
  });

  const deliveryPartner = await User.create({
    name: "Ramesh Kumar",
    email: "ramesh@homeharvest.local",
    passwordHash: deliveryHash,
    role: "delivery",
    phone: "9876543214",
    neighborhood: "Indiranagar",
    address: "Indiranagar Circle, Bengaluru",
    bio: "Hyperlocal electric scooter delivery partner dedicated to rapid garden-to-door deliveries."
  });

  console.log("[Growers] Creating verified grower profiles...");
  const profile1 = await GrowerProfile.create({
    userId: grower1._id,
    gardenName: "Priya's Terrace Greens",
    gardenType: "Terrace Garden",
    gardenDescription: "A flourishing 900 sq ft terrace garden in Indiranagar growing heirloom tomatoes, spinach, and crisp bell peppers. Fed exclusively with homemade fruit-peel bio-enzymes and vermicompost.",
    neighborhood: "Indiranagar",
    growingPractices: ["Homemade Vermicompost", "Neem Oil Pest Spray", "Rainwater Harvesting", "Zero Synthetic Chemicals"],
    verificationStatus: "verified",
    verificationEvidence: "Verified by neighborhood agricultural coordinator on 12-Oct-2026",
    verificationNotes: "Inspected terrace setup: pristine compost pits and zero chemical fertilizers.",
    totalSurplusRescuedKg: 24,
    isAcceptingOrders: true
  });

  const profile2 = await GrowerProfile.create({
    userId: grower2._id,
    gardenName: "Anita's Balcony Bounty",
    gardenType: "Balcony Garden",
    gardenDescription: "Sunlit balcony garden packed with vertical trellises of ridge gourd, fragrant mint, heirloom curry leaves, and coriander.",
    neighborhood: "Koramangala",
    growingPractices: ["Kitchen Waste Compost", "Pesticide-Free", "Companion Planting"],
    verificationStatus: "verified",
    verificationEvidence: "Verified garden visit on 14-Oct-2026",
    verificationNotes: "Healthy container plants with natural pest barriers.",
    totalSurplusRescuedKg: 14,
    isAcceptingOrders: true
  });

  console.log("[Products] Creating vegetable listings...");
  const p1 = await Product.create({
    growerId: grower1._id,
    name: "Heirloom Cherry Tomatoes",
    description: "Vine-ripened, naturally sweet cherry tomatoes handpicked on the morning of delivery. Rich in antioxidants and bursting with flavor.",
    category: "Vegetables",
    price: 60,
    unit: "500 g",
    quantity: 12,
    image: "https://images.unsplash.com/photo-1546470427-e26264be0b11?auto=format&fit=crop&w=600&q=80",
    harvestDate: new Date(),
    growingMethod: "Terrace composted soil, zero chemical pesticides",
    active: true
  });

  const p2 = await Product.create({
    growerId: grower1._id,
    name: "Fresh Country Spinach (Palak)",
    description: "Tender, iron-rich spinach leaves harvested fresh. Never stored in cold storage; retains maximum chlorophyll and crunch.",
    category: "Leafy Greens",
    price: 35,
    unit: "250 g bunch",
    quantity: 15,
    image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80",
    harvestDate: new Date(),
    growingMethod: "Grown in nutrient-dense organic potting mix",
    active: true
  });

  const p3 = await Product.create({
    growerId: grower2._id,
    name: "Tender Ridge Gourd (Turai)",
    description: "Crisp and juicy ridge gourd grown along balcony trellises with abundant natural sunlight.",
    category: "Gourds",
    price: 50,
    unit: "500 g",
    quantity: 8,
    image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=600&q=80",
    harvestDate: new Date(),
    growingMethod: "Vertical container trellis, rain-fed",
    active: true
  });

  const p4 = await Product.create({
    growerId: grower2._id,
    name: "Surplus Harvest: Fresh Mint & Coriander Combo",
    description: "Excess harvest from our flourishing balcony planters! Heavily aromatic and crisp. Rescued from going to waste at 40% discount.",
    category: "Herbs",
    price: 24,
    originalPrice: 40,
    isSurplus: true,
    unit: "Combo bunch",
    quantity: 10,
    image: "https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?auto=format&fit=crop&w=600&q=80",
    harvestDate: new Date(),
    growingMethod: "Balcony micro-herb bed, zero synthetic sprays",
    active: true
  });

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 3);
  const p5 = await Product.create({
    growerId: grower1._id,
    name: "Pre-Order: Crisp Yellow Bell Peppers",
    description: "Maturing beautifully in our terrace greenhouse! Reserve your box now for harvest in 3 days. Limited yield of only 10 portions.",
    category: "Vegetables",
    price: 85,
    isPreOrder: true,
    expectedHarvestDate: futureDate,
    unit: "500 g",
    quantity: 10,
    image: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=600&q=80",
    harvestDate: futureDate,
    growingMethod: "Drip-irrigated terrace pots, organic soil",
    active: true
  });

  const p6 = await Product.create({
    growerId: grower2._id,
    name: "Aromatic Curry Leaves (Kadi Patta)",
    description: "Intensely fragrant heirloom curry leaves from a mature balcony tree. Perfect for authentic tempering.",
    category: "Herbs",
    price: 20,
    unit: "100 g bunch",
    quantity: 20,
    image: "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&w=600&q=80",
    harvestDate: new Date(),
    growingMethod: "Heirloom potted shrub, cow dung compost",
    active: true
  });

  console.log("[Orders] Creating sample completed order with delivery...");
  const order1 = await Order.create({
    customerId: customer._id,
    items: [
      {
        productId: p1._id,
        name: p1.name,
        price: p1.price,
        unit: p1.unit,
        quantity: 2,
        itemSubtotal: 120,
        growerId: grower1._id
      },
      {
        productId: p2._id,
        name: p2.name,
        price: p2.price,
        unit: p2.unit,
        quantity: 1,
        itemSubtotal: 35,
        growerId: grower1._id
      }
    ],
    deliveryAddress: customer.address,
    deliveryPhone: customer.phone,
    deliveryNotes: "Please ring the bell at ground floor.",
    subtotal: 155,
    deliveryFee: 30,
    totalAmount: 185,
    paymentMethod: "cash_on_delivery",
    paymentStatus: "paid",
    status: "delivered",
    statusTimeline: {
      placed: new Date(Date.now() - 3600000 * 5),
      accepted: new Date(Date.now() - 3600000 * 4),
      preparing: new Date(Date.now() - 3600000 * 3),
      ready: new Date(Date.now() - 3600000 * 2),
      out_for_delivery: new Date(Date.now() - 3600000 * 1),
      delivered: new Date()
    }
  });

  await Delivery.create({
    orderId: order1._id,
    deliveryPartnerId: deliveryPartner._id,
    status: "delivered",
    pickupAddress: grower1.address,
    deliveryAddress: customer.address,
    deliveryNotes: "Customer received in person.",
    assignedAt: new Date(Date.now() - 3600000 * 2),
    acceptedAt: new Date(Date.now() - 3600000 * 2),
    pickedUpAt: new Date(Date.now() - 3600000 * 1),
    deliveredAt: new Date()
  });

  console.log("[Reviews] Creating verified customer review...");
  await Review.create({
    customerId: customer._id,
    growerId: grower1._id,
    orderId: order1._id,
    rating: 5,
    comment: "The cherry tomatoes were incredibly sweet and fresh, plucked just hours before delivery! Knowing it was grown by Priya right in Indiranagar makes it so special.",
    isVerifiedPurchase: true
  });

  console.log("\n============================================================");
  console.log("[Success] Database seeding completed successfully!");
  console.log("============================================================");
  console.log("Credentials:");
  console.log("   Admin:    admin@homeharvest.local   / Admin@123");
  console.log("   Grower:   priya@homeharvest.local   / Grower@123");
  console.log("   Grower 2: anita@homeharvest.local   / Grower@123");
  console.log("   Customer: sneha@homeharvest.local   / Customer@123");
  console.log("   Delivery: ramesh@homeharvest.local  / Delivery@123");
  console.log("============================================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
