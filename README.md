# 🌿 HomeHarvest

> **"Grown at Home. Delivered Fresh."**

HomeHarvest is a hyperlocal marketplace connecting women and home gardeners who grow fresh vegetables in terraces, balconies, and backyard gardens with nearby households. The platform empowers home growers to earn sustainable income, cuts community food waste, and makes hyperlocal, fresh produce accessible with doorstep delivery.

---

## 🚀 Quick Start in VS Code

### 1. Open Project in VS Code
1. Open **VS Code**.
2. Click **File** > **Open Folder...** (or press `Ctrl + K, Ctrl + O`).
3. Select this folder:
   ```text
   C:\Users\srava\Downloads\HomeHarvest-code-bundle
   ```
4. Click **Select Folder**.

### 2. Verify Your Environment File (`.env`)
The `.env` file is already created in the project root with the following settings:
```ini
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/homeharvest
JWT_SECRET=homeharvest_super_secret_jwt_key_2026_local_dev_token
```

### 3. Install Dependencies
Open your integrated terminal in VS Code (`Ctrl + ~`) and run:
```bash
npm install
```

### 4. Seed Demo Data
To populate realistic home growers, fresh vegetables, surplus harvest rescue items, customer orders, and test accounts, run:
```bash
npm run seed
```

### 5. Start the Server
- **Development mode (auto-reloads on edits):**
  ```bash
  npm run dev
  ```
- **Standard production mode:**
  ```bash
  npm start
  ```

### 6. Open in Browser
Visit **[http://localhost:3000](http://localhost:3000)**

---

## 👥 Demo Accounts (Ready to Test)

After running `npm run seed`, you can instantly log in with any of these pre-configured accounts (or click the quick-login buttons on the login page):

| Role | Email | Password | What You Can Do |
|---|---|---|---|
| **Home Grower** | `priya@homeharvest.local` | `Grower@123` | Publish harvest listings, set surplus discounts, manage orders, view earnings |
| **Customer** | `sneha@homeharvest.local` | `Customer@123` | Browse vegetables, filter neighborhood, add to cart, checkout (COD), track order |
| **Delivery Partner** | `ramesh@homeharvest.local` | `Delivery@123` | Claim ready deliveries, mark picked up and delivered |
| **Administrator** | `admin@homeharvest.local` | `Admin@123` | Verify growers, moderate products, inspect all orders, platform overview |

---

## 🌟 Key Application Features

1. **Hyperlocal Vegetable Marketplace**: Browse fresh produce from neighborhood home gardens with distance/neighborhood filters.
2. **Surplus Harvest Rescue**: Special discounted badges for excess produce to prevent community food waste.
3. **Upcoming Harvest Pre-Orders**: Reserve future yields before harvest date.
4. **Transparent Growing Practices**: Self-reported organic & natural composting practices with administrative verification badges.
5. **Atomic Stock Protection**: Prevents overselling with server-side stock checks that work on both standalone MongoDB and replica sets.
6. **Order Lifecycle & Tracking**: Visual step-by-step progress tracking (`placed` → `accepted` → `preparing` → `ready` → `out_for_delivery` → `delivered`).
7. **Grower Earnings Dashboard**: Real financial visibility separating gross sales from estimated platform fees and net earnings.
8. **Verified Reviews**: Reviews can only be submitted by verified customers who completed an order for that specific grower.

---

## 📂 Project Structure

```text
HomeHarvest-code-bundle/
├── client/                     # Responsive Frontend (HTML5, CSS3, Vanilla JS)
│   ├── css/
│   │   └── style.css           # Premium organic design system (Forest green, cream)
│   ├── js/
│   │   ├── api.js              # Fetch client with JWT session & toasts
│   │   ├── navbar.js           # Dynamic navigation header & cart badge
│   │   ├── explore.js          # Search, filters, surplus toggle
│   │   ├── cart.js             # Cart management
│   │   ├── checkout.js         # Order placement & address capture
│   │   ├── dashboard.js        # Multi-role dispatcher
│   │   ├── grower.js           # Produce listing & order fulfillment
│   │   ├── delivery.js         # Delivery partner job board
│   │   └── admin.js            # Platform moderation & verification
│   ├── index.html              # Homepage & social mission
│   ├── explore.html            # Browse & filter produce
│   ├── product-details.html    # Product deep-dive & grower story
│   ├── register.html           # Multi-role registration
│   ├── login.html              # Login with demo quick-fills
│   ├── dashboard.html          # Role dashboard router
│   ├── grower-dashboard.html   # Grower management portal
│   ├── manage-product.html     # Add/edit vegetable listing
│   ├── cart.html               # Shopping cart
│   ├── checkout.html           # Checkout with Cash on Delivery
│   ├── orders.html             # Customer order history
│   ├── order-details.html      # Visual order timeline & review submission
│   ├── delivery-dashboard.html # Delivery partner dispatch board
│   ├── admin-dashboard.html    # Admin analytics & moderation
│   ├── profile.html            # User profile management
│   └── 404.html                # Friendly not-found page
├── server/                     # Node.js & Express REST API
│   ├── config/
│   │   └── db.js               # Mongoose connection with status check
│   ├── middleware/
│   │   └── auth.js             # JWT verification & role authorization
│   ├── models/
│   │   ├── User.js             # User accounts & roles
│   │   ├── GrowerProfile.js    # Garden description & verification status
│   │   ├── Product.js          # Produce catalog with surplus & harvest dates
│   │   ├── Order.js            # Customer orders & timeline
│   │   ├── Delivery.js         # Delivery dispatch & status
│   │   └── Review.js           # Verified customer reviews
│   ├── routes/
│   │   ├── authRoutes.js       # /api/auth (register, login, me, profile)
│   │   ├── productRoutes.js    # /api/products (browse, search, CRUD)
│   │   ├── growerRoutes.js     # /api/growers (profiles, earnings)
│   │   ├── orderRoutes.js      # /api/orders (atomic checkout, lifecycle)
│   │   ├── deliveryRoutes.js   # /api/deliveries (claim, pick up, deliver)
│   │   ├── reviewRoutes.js     # /api/reviews (verified customer feedback)
│   │   ├── adminRoutes.js      # /api/admin (stats, users, verification)
│   │   └── impactRoutes.js     # /api/impact (food waste rescued metrics)
│   ├── scripts/
│   │   └── seed.js             # Database seeding script
│   ├── app.js                  # Express application setup & middleware
│   └── server.js               # Entry point
├── tests/
│   └── api.test.js             # Automated API test suite
├── .env.example                # Example environment variables
├── .env                        # Active environment variables (gitignored)
├── .gitignore                  # Git exclusions
├── package.json                # Project dependencies & scripts
└── README.md                   # Complete documentation
```

---

## 🛠 Available NPM Scripts

| Command | Description |
|---|---|
| `npm run dev` | Runs application with `nodemon` for auto-reloading during development |
| `npm start` | Runs application with standard `node` |
| `npm run seed` | Seeds database with demo accounts, vegetables, and sample orders |
| `npm test` | Runs the automated backend API test suite |

---

## 🔌 API Reference Highlights

- **Health Check:** `GET /api/health` — Checks server and active MongoDB connection.
- **Auth:**
  - `POST /api/auth/register` — Register customer, grower, or delivery partner.
  - `POST /api/auth/login` — Authenticate and receive JWT.
  - `GET /api/auth/me` — Fetch current user session.
- **Products:**
  - `GET /api/products` — Browse with filters (`q`, `category`, `neighborhood`, `isSurplus`, `sort`).
  - `GET /api/products/:id` — Single product details.
  - `POST /api/products` — Create listing (Grower/Admin only).
  - `PATCH /api/products/:id` — Update listing (Owner only).
  - `DELETE /api/products/:id` — Delete listing (Owner only).
- **Orders:**
  - `POST /api/orders` — Place order with atomic stock validation.
  - `GET /api/orders/mine` — Order history for customer, grower, or admin.
  - `GET /api/orders/:id` — Single order tracking and details.
  - `PATCH /api/orders/:id/status` — Advance order state machine.
- **Deliveries:**
  - `GET /api/deliveries/available` — Unassigned ready orders for pickup.
  - `POST /api/deliveries/:id/accept` — Accept delivery job.
  - `PATCH /api/deliveries/:id/status` — Mark `picked_up` or `delivered`.
- **Admin:**
  - `GET /api/admin/overview` — Platform KPI statistics.
  - `GET /api/admin/users` — User directory with account status toggling.
  - `PATCH /api/admin/growers/:id/verification` — Approve or reject grower verification.

---

## 🛡 Security Practices

- **Zero Plaintext Passwords:** Hashed with `bcryptjs` (salt rounds: 12).
- **JWT Authorization:** Tokens signed with secret and checked via middleware.
- **Role-Based Access Control:** Separate roles for Customer, Home Grower, Delivery Partner, and Admin.
- **Server-Side Validation:** All prices, stock decrements, and order totals calculated on the backend using `express-validator` and Mongoose schema checks.
- **Safe DOM Rendering:** Front-end strictly avoids dangerous innerHTML injection from unsanitized user content.
- **HTTP Security Headers:** Protected with `helmet`.






---

## 📸 Application Screenshots

### Home Page
![HomeHarvest homepage](screenshots/01-homepage.png)

### Explore Vegetables
![Vegetable marketplace](screenshots/02-explore-vegetables.png)

### Login Page
![Login page](screenshots/03-login.png)

### GitHub Repository
![Public GitHub repository](screenshots/04-github-repository.png)

---

## 🎓 Learning Outcomes

- Developed a full-stack web application using HTML, CSS, JavaScript, Node.js, Express, and MongoDB.
- Learned REST API development and database integration.
- Practiced authentication, password hashing, and role-based access control.
- Learned Git and GitHub for source-code management and project documentation.

## 👨‍💻 Author

**Student Name:** [Your Full Name]  
**USN:** [Your USN]  
**Project:** HomeHarvest — Hyperlocal Home-Grown Vegetable Marketplace

## 📌 Project Status

Academic project prototype. Features and test results should be verified
against the running application before submission.
