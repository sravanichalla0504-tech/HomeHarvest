const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication required. Please log in." });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return res.status(401).json({ success: false, message: "Invalid session token." });
    }

    const secret = process.env.JWT_SECRET || "fallback_dev_secret_only";
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id).select("-passwordHash");
    if (!user) {
      return res.status(401).json({ success: false, message: "User account no longer exists." });
    }

    if (user.accountStatus === "suspended") {
      return res.status(403).json({ success: false, message: "Your account has been suspended. Please contact support." });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
    }
    return res.status(401).json({ success: false, message: "Invalid authentication credentials." });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${roles.join(", ")}] roles. Your role is '${req.user.role}'.`
      });
    }
    next();
  };
}

module.exports = { auth, allowRoles };
