require("dotenv").config();
const app = require("./app");
const { connectDB } = require("./config/db");

const PORT = process.env.PORT || 3000;

async function startServer() {
  console.log("?? Starting HomeHarvest platform...");

  if (!process.env.JWT_SECRET) {
    console.warn("?? Warning: JWT_SECRET not found in .env. Using fallback.");
  }

  if (process.env.MONGODB_URI) {
    try {
      await connectDB();
    } catch (err) {
      console.warn("?? Continuing server startup in degraded mode (MongoDB unavailable).");
    }
  } else {
    console.warn("?? MONGODB_URI is missing. Set it in .env file.");
  }

  const server = app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🌿 HomeHarvest Server is active!`);
    console.log(`?? URL: http://localhost:${PORT}`);
    console.log(`?? Health check: http://localhost:${PORT}/api/health`);
    console.log(`======================================================\n`);
  });

  const shutdown = () => {
    console.log("\nShutting down HomeHarvest server...");
    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer();
