/**
 * Shared Dynamic Navbar & Footer Component for HomeHarvest
 */
document.addEventListener("DOMContentLoaded", () => {
  renderNavbar();
  renderFooter();
  updateCartBadge();
});

function renderNavbar() {
  const navContainer = document.querySelector(".navbar");
  if (!navContainer) return;

  const user = currentUser();
  const cartCount = getCartCount();

  let roleLinks = "";
  if (user) {
    if (user.role === "grower") {
      roleLinks = `
        <a href="/grower-dashboard.html">Grower Portal</a>
        <a href="/manage-product.html">Add Produce</a>
        <a href="/orders.html">Orders</a>
      `;
    } else if (user.role === "delivery") {
      roleLinks = `
        <a href="/delivery-dashboard.html">Delivery Jobs</a>
      `;
    } else if (user.role === "admin") {
      roleLinks = `
        <a href="/admin-dashboard.html">Admin Hub</a>
        <a href="/grower-dashboard.html">Grower Portal</a>
        <a href="/orders.html">Orders</a>
      `;
    } else {
      // Customer
      roleLinks = `
        <a href="/orders.html">My Orders</a>
      `;
    }
  }

  let authActions = "";
  if (user) {
    authActions = `
      <a href="/profile.html" class="btn btn-secondary btn-sm" title="View profile">
        👤 ${escapeHTML(user.name.split(" ")[0])} <span class="badge badge-verified" style="font-size:10px">${escapeHTML(user.role)}</span>
      </a>
      <button onclick="logout()" class="btn btn-sm btn-secondary" title="Logout">Log out</button>
    `;
  } else {
    authActions = `
      <a href="/login.html" class="btn btn-secondary btn-sm">Login</a>
      <a href="/register.html" class="btn btn-primary btn-sm">Join us</a>
    `;
  }

  navContainer.innerHTML = `
    <a href="/" class="nav-brand">
      <span class="sprout">🌱</span>
      <span>HomeHarvest</span>
    </a>

    <nav class="nav-links" id="navLinks">
      <a href="/index.html">Home</a>
      <a href="/explore.html">Explore Vegetables</a>
      ${roleLinks}
      <a href="/cart.html" style="position:relative;">
        Basket 🛒
        <span id="cartCountBadge" class="nav-badge" style="display:${cartCount > 0 ? 'inline-block' : 'none'}">${cartCount}</span>
      </a>
    </nav>

    <div class="nav-actions">
      ${authActions}
      <button class="mobile-toggle" aria-label="Toggle navigation" onclick="toggleMobileMenu()">☰</button>
    </div>
  `;
}

function toggleMobileMenu() {
  const navLinks = document.getElementById("navLinks");
  if (navLinks) {
    navLinks.classList.toggle("mobile-open");
  }
}

function renderFooter() {
  const footer = document.querySelector(".footer");
  if (!footer) return;

  footer.innerHTML = `
    <div class="footer-inner">
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:24px;">🌱</span>
        <div>
          <strong style="color:var(--primary); font-size:18px;">HomeHarvest</strong>
          <p style="font-size:13px; color:var(--text-muted);">Grown at Home. Delivered Fresh.</p>
        </div>
      </div>

      <div style="display:flex; gap:20px; font-size:13px; color:var(--text-muted); flex-wrap:wrap;">
        <a href="/explore.html">Browse Harvests</a>
        <a href="/register.html?role=grower">Become a Home Grower</a>
        <a href="/register.html?role=delivery">Delivery Partner</a>
        <a href="/explore.html?isSurplus=true">Surplus Rescue</a>
        <a href="/api/health" target="_blank">System Health</a>
      </div>

      <div class="footer-copy">
        © ${new Date().getFullYear()} HomeHarvest Hyperlocal Community. All rights reserved.
      </div>
    </div>
  `;
}
