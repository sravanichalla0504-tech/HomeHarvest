const express = require("express");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { checkDBHealth } = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const growerRoutes = require("./routes/growerRoutes");
const orderRoutes = require("./routes/orderRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const adminRoutes = require("./routes/adminRoutes");
const impactRoutes = require("./routes/impactRoutes");

const app = express();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows inline script evaluation for vanilla pages & external unsplash photos
    crossOriginEmbedderPolicy: false
  })
);

// Body parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Rate limiter for API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  message: { success: false, message: "Too many requests. Please try again later." }
});
app.use("/api", apiLimiter);

// Serve static frontend files
app.use(express.static(path.join(__dirname, "../client")));

// GET /api/health - Health & Database status endpoint
app.get("/api/health", (req, res) => {
  const dbHealth = checkDBHealth();
  const isHealthy = dbHealth.connected;

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    status: isHealthy ? "healthy" : "degraded",
    message: isHealthy ? "HomeHarvest server and database operational." : "HomeHarvest server running but MongoDB is disconnected.",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database: dbHealth
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/growers", growerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/impact", impactRoutes);

// Fallback 404 handler for unknown API endpoints
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, message: `API endpoint '${req.method} ${req.originalUrl}' not found.` });
});

// Serve 404 page for unmatched browser routes
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "../client/404.html"));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || "An unexpected server error occurred."
  });
});

module.exports = app;
