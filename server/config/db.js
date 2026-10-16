const mongoose = require("mongoose");

let isConnected = false;

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("⚠️ Warning: MONGODB_URI is not set in .env. Database operations will fail.");
    return false;
  }

  try {
    const conn = await mongoose.connect(uri);
    isConnected = true;
    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return true;
  } catch (error) {
    isConnected = false;
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  }
}

function checkDBHealth() {
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const state = mongoose.connection.readyState;
  return {
    connected: state === 1,
    readyState: state,
    statusText: state === 1 ? "connected" : state === 2 ? "connecting" : "disconnected",
    database: mongoose.connection.name || null
  };
}

module.exports = { connectDB, checkDBHealth };
