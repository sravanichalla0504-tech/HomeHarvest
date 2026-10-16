/**
 * HomeHarvest Frontend API Client & Global Helpers
 */

const API = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem("hh_token");
    const headers = {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(endpoint, { ...options, headers });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 && token) {
          // Token expired or invalid
          console.warn("Session expired. Logging out.");
          logout(false);
          throw new Error("Your session has expired. Please log in again.");
        }
        throw new Error(data.message || data.errors?.[0]?.msg || `Request failed (${response.status})`);
      }

      return data;
    } catch (err) {
      showToast(err.message || "Network error. Please try again.", "error");
      throw err;
    }
  },

  get(url) { return this.request(url, { method: "GET" }); },
  post(url, body) { return this.request(url, { method: "POST", body: JSON.stringify(body) }); },
  patch(url, body) { return this.request(url, { method: "PATCH", body: JSON.stringify(body) }); },
  delete(url) { return this.request(url, { method: "DELETE" }); }
};

// ==========================================
// Authentication & Session
// ==========================================
function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("hh_user") || "null");
  } catch {
    return null;
  }
}

function saveSession(data) {
  if (data.token) localStorage.setItem("hh_token", data.token);
  if (data.user) localStorage.setItem("hh_user", JSON.stringify(data.user));
  if (data.growerProfile) localStorage.setItem("hh_grower", JSON.stringify(data.growerProfile));
}

function logout(redirect = true) {
  localStorage.removeItem("hh_token");
  localStorage.removeItem("hh_user");
  localStorage.removeItem("hh_grower");
  showToast("Logged out successfully.", "info");
  if (redirect) {
    setTimeout(() => { location.href = "/"; }, 500);
  }
}

// ==========================================
// Toast Notification Utility
// ==========================================
function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icon = type === "success" ? "?" : type === "error" ? "??" : "??";
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHTML(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==========================================
// Shopping Cart Helpers (Local Storage)
// ==========================================
function getCart() {
  try {
    return JSON.parse(localStorage.getItem("hh_cart") || "[]");
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem("hh_cart", JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(product, quantity = 1) {
  const cart = getCart();
  const existing = cart.find(item => item.productId === (product._id || product.id));

  if (existing) {
    existing.quantity += quantity;
    if (existing.quantity > product.quantity && !product.isPreOrder) {
      existing.quantity = product.quantity;
      showToast(`Adjusted to maximum available stock (${product.quantity})`, "info");
    } else {
      showToast(`Updated ${product.name} quantity in cart (${existing.quantity})`, "success");
    }
  } else {
    cart.push({
      productId: product._id || product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      image: product.image,
      quantity: Math.min(quantity, product.quantity > 0 ? product.quantity : 1),
      maxStock: product.quantity,
      isPreOrder: product.isPreOrder
    });
    showToast(`Added ${product.name} to your basket!`, "success");
  }

  saveCart(cart);
}

function getCartCount() {
  const cart = getCart();
  return cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
}

function updateCartBadge() {
  const badge = document.getElementById("cartCountBadge");
  if (badge) {
    const count = getCartCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-block" : "none";
  }
}

// ==========================================
// Formatting & Sanitization
// ==========================================
function escapeHTML(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function formatPrice(amount) {
  return `₹${Number(amount || 0).toFixed(0)}`;
}

function formatDate(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });
}
