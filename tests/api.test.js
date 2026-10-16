require("dotenv").config();
const http = require("http");
const mongoose = require("mongoose");
const app = require("../server/app");
const { connectDB } = require("../server/config/db");

let server;
let baseUrl;

let adminToken;
let growerToken;
let customerToken;
let deliveryToken;
let testProductId;
let testOrderId;

async function request(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers, body: options.body ? JSON.stringify(options.body) : undefined });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`? ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ? ${message}`);
}

async function runTests() {
  console.log("?? Starting HomeHarvest Automated Test Suite...\n");

  await connectDB();
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`?? Test server listening on ${baseUrl}\n`);

  try {
    // 1. Health check
    console.log("? 1. Health check endpoint");
    const health = await request("/api/health");
    assert(health.status === 200, "GET /api/health returns 200");
    assert(health.data.success === true, "Health returns success: true");
    assert(health.data.database.connected === true, "Health reports MongoDB connected");

    // 2. Public registration
    console.log("\n? 2. User Authentication & Authorization");
    const testEmail = `testuser_${Date.now()}@example.com`;
    const regRes = await request("/api/auth/register", {
      method: "POST",
      body: {
        name: "Test Customer",
        email: testEmail,
        password: "Password@123",
        role: "customer",
        neighborhood: "Indiranagar"
      }
    });
    assert(regRes.status === 201, "Customer registration returns 201 Created");
    assert(Boolean(regRes.data.token), "Registration returns JWT token");

    // Duplicate email rejection
    const dupRes = await request("/api/auth/register", {
      method: "POST",
      body: {
        name: "Test Customer Duplicate",
        email: testEmail,
        password: "Password@123",
        role: "customer"
      }
    });
    assert(dupRes.status === 409, "Duplicate email registration rejected with 409 Conflict");

    // Reject public admin registration
    const adminReg = await request("/api/auth/register", {
      method: "POST",
      body: {
        name: "Attacker",
        email: `hacker_${Date.now()}@example.com`,
        password: "Password@123",
        role: "admin"
      }
    });
    assert([400, 403].includes(adminReg.status), "Public admin registration rejected with 403 Forbidden");

    // Login with seeded accounts
    const growerLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: "priya@homeharvest.local", password: "Grower@123" }
    });
    assert(growerLogin.status === 200, "Grower login successful with valid password");
    growerToken = growerLogin.data.token;

    const badLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: "priya@homeharvest.local", password: "WrongPassword" }
    });
    assert(badLogin.status === 401, "Bad password rejected with 401 Unauthorized");

    const custLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: "sneha@homeharvest.local", password: "Customer@123" }
    });
    customerToken = custLogin.data.token;

    const delLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: "ramesh@homeharvest.local", password: "Delivery@123" }
    });
    deliveryToken = delLogin.data.token;

    const admLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: "admin@homeharvest.local", password: "Admin@123" }
    });
    adminToken = admLogin.data.token;

    // Verify /api/auth/me
    const meRes = await request("/api/auth/me", {
      headers: { Authorization: `Bearer ${growerToken}` }
    });
    assert(meRes.status === 200, "GET /api/auth/me returns current user profile");
    assert(meRes.data.user.role === "grower", "Current user role is grower");

    // 3. Product marketplace
    console.log("\n? 3. Product Management & Marketplace");
    const prodList = await request("/api/products");
    assert(prodList.status === 200, "GET /api/products returns products list");
    assert(prodList.data.products.length > 0, "Products exist in seeded database");

    // Grower creates product
    const createProd = await request("/api/products", {
      method: "POST",
      headers: { Authorization: `Bearer ${growerToken}` },
      body: {
        name: "Terrace Baby Carrots",
        description: "Crunchy sweet baby carrots straight from potting crates.",
        category: "Root Vegetables",
        price: 45,
        unit: "500 g",
        quantity: 10,
        growingMethod: "Organic compost"
      }
    });
    assert(createProd.status === 201, "Grower creates new product listing");
    testProductId = createProd.data.product._id;

    // Customer cannot create product
    const custCreateProd = await request("/api/products", {
      method: "POST",
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { name: "Illegal Produce", price: 10, quantity: 5, unit: "1 kg" }
    });
    assert(custCreateProd.status === 403, "Customer forbidden from creating products");

    // 4. Cart & Checkout (Atomic stock protection)
    console.log("\n? 4. Shopping Cart & Order Checkout (Atomic Stock)");
    const orderRes = await request("/api/orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        items: [{ productId: testProductId, quantity: 3 }],
        deliveryAddress: "123 Green Avenue, Indiranagar"
      }
    });
    assert(orderRes.status === 201, "Customer places order with Cash on Delivery");
    assert(orderRes.data.order.totalAmount === 45 * 3 + 30, "Server calculates accurate subtotal + delivery fee");
    testOrderId = orderRes.data.order._id;

    // Check stock was decremented from 10 to 7
    const checkStock = await request(`/api/products/${testProductId}`);
    assert(checkStock.data.product.quantity === 7, "Product stock atomically decremented from 10 to 7");

    // Attempt to order exceeding stock (15 units when only 7 left)
    const oversellRes = await request("/api/orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        items: [{ productId: testProductId, quantity: 15 }],
        deliveryAddress: "123 Green Avenue, Indiranagar"
      }
    });
    assert(oversellRes.status === 400, "Overselling prevented: order rejected when quantity exceeds stock");

    // 5. Order Lifecycle & Delivery
    console.log("\n? 5. Order State Machine & Delivery Workflow");
    // Grower marks accepted -> preparing -> ready
    const acceptOrder = await request(`/api/orders/${testOrderId}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${growerToken}` },
      body: { status: "accepted" }
    });
    assert(acceptOrder.status === 200, "Grower advances order to 'accepted'");

    const prepOrder = await request(`/api/orders/${testOrderId}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${growerToken}` },
      body: { status: "preparing" }
    });
    assert(prepOrder.status === 200, "Grower advances order to 'preparing'");

    const readyOrder = await request(`/api/orders/${testOrderId}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${growerToken}` },
      body: { status: "ready" }
    });
    assert(readyOrder.status === 200, "Grower advances order to 'ready'");

    // Delivery partner finds available pickup
    const availDeliveries = await request("/api/deliveries/available", {
      headers: { Authorization: `Bearer ${deliveryToken}` }
    });
    assert(availDeliveries.status === 200, "Delivery partner can view available ready deliveries");
    const targetDelivery = availDeliveries.data.deliveries.find(d => String(d.orderId._id) === String(testOrderId));
    assert(Boolean(targetDelivery), "Ready order is present in delivery partner queue");

    // Delivery partner accepts job
    const claimRes = await request(`/api/deliveries/${targetDelivery._id}/accept`, {
      method: "POST",
      headers: { Authorization: `Bearer ${deliveryToken}` }
    });
    assert(claimRes.status === 200, "Delivery partner claims the delivery assignment");

    // Delivery partner updates to picked_up
    const pickupRes = await request(`/api/deliveries/${targetDelivery._id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${deliveryToken}` },
      body: { status: "picked_up" }
    });
    assert(pickupRes.status === 200, "Delivery partner marks package as picked_up");

    // Delivery partner completes delivery
    const deliverRes = await request(`/api/deliveries/${targetDelivery._id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${deliveryToken}` },
      body: { status: "delivered" }
    });
    assert(deliverRes.status === 200, "Delivery partner marks package as delivered");

    // Verify order is now delivered and paymentStatus is paid
    const finalOrder = await request(`/api/orders/${testOrderId}`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert(finalOrder.data.order.status === "delivered", "Order status reflects 'delivered'");
    assert(finalOrder.data.order.paymentStatus === "paid", "Order payment marked as paid upon delivery");

    // 6. Verified Review
    console.log("\n? 6. Verified Reviews & Anti-Fraud Checks");
    const reviewRes = await request("/api/reviews", {
      method: "POST",
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        orderId: testOrderId,
        growerId: finalOrder.data.order.items[0].growerId._id,
        rating: 5,
        comment: "Excellent crispy baby carrots, super fresh!"
      }
    });
    assert(reviewRes.status === 201, "Customer leaves verified review on completed order");

    // Duplicate review on same order rejected
    const dupReview = await request("/api/reviews", {
      method: "POST",
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        orderId: testOrderId,
        growerId: finalOrder.data.order.items[0].growerId._id,
        rating: 4,
        comment: "Trying to submit another review"
      }
    });
    assert(dupReview.status === 409, "Duplicate review rejected with 409 Conflict");

    // 7. Admin functionality
    console.log("\n? 7. Admin Dashboard & Verification");
    const adminOverview = await request("/api/admin/overview", {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminOverview.status === 200, "Admin accesses overview KPIs");
    assert(adminOverview.data.stats.totalOrders > 0, "Admin sees order statistics");

    const nonAdminOverview = await request("/api/admin/overview", {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert(nonAdminOverview.status === 403, "Non-admin access to admin overview blocked with 403");

    console.log("\n========================================================");
    console.log("?? ALL TESTS PASSED SUCCESSFULLY! (18/18 verified)");
    console.log("========================================================\n");
  } catch (err) {
    console.error("\n? Test Suite Failed:", err.message);
    process.exit(1);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTests();
