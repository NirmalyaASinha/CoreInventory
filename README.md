# CoreInventory 📦

> A modular, real-time Inventory Management System that replaces manual registers and Excel sheets with a centralized, easy-to-use web application.

---

## 🚀 Live Demo

| Service | URL |
|---|---|
| Frontend | https://core-inventory-iota.vercel.app/pages/login.html|
| Backend API | https://coreinventory-bjqx.onrender.com/|

### Test Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@coreinventory.com | password123 |
| Staff | anupam@coreinventory.com | password123 |

> Admin can create new users, manage warehouses, and view all data.
> Staff can perform daily operations — receipts, deliveries, transfers.

---

## 👥 Team

| Name | Role | Owns |
|---|---|---|
| Nirmalya | Backend Developer | Node.js + Express + Auth + All APIs |
| Anupam | Frontend Developer | HTML + CSS + JS + All UI pages |
| Aadil | Database Engineer | PostgreSQL + Neon + Schema design |

---

## 🛠 Tech Stack

### Frontend
- HTML5 + CSS3 + Vanilla JavaScript
- Lucide Icons
- Deployed on **Vercel**

### Backend
- Node.js + Express.js
- JWT Authentication
- bcryptjs password hashing
- SendGrid OTP email
- Deployed on **Render**

### Database
- PostgreSQL via `pg` driver
- Hosted on **Neon** (AWS cloud)
- 14 tables — fully relational schema

---

## ✨ Features

### 🔐 Authentication
- Email + Password login
- JWT token sessions (7 day expiry)
- OTP based password reset via SendGrid email
- Role based access — Admin and Staff see different dashboards
- Only Admin can create new user accounts
- Public registration disabled

### 📊 Dashboard
- **Admin dashboard** — full KPI overview, user management, warehouse control
- **Staff dashboard** — task focused, daily operations only
- Live counts: Total Products, Low Stock, Out of Stock, Pending Receipts, Pending Deliveries, Transfers Scheduled

### 📦 Products
- Create and update products
- SKU based search and smart filters
- Category management
- Unit of Measure
- Reorder level with low stock alerts
- Stock availability per location

### 📥 Receipts (Incoming Stock)
- Create receipt with supplier and product lines
- Validate → stock increases automatically
- Reference auto-generated: REC/001, REC/002...
- Status flow: DRAFT → WAITING → READY → DONE

### 📤 Deliveries (Outgoing Stock)
- Create delivery with customer and product lines
- Validate → stock decreases automatically
- Reference auto-generated: DEL/001, DEL/002...
- Status flow: DRAFT → WAITING → READY → DONE

### 🔄 Internal Transfers
- Move stock between warehouses or locations
- Validate → stock updated at both ends automatically
- Reference auto-generated: TRF/001, TRF/002...
- Every movement logged in the stock ledger

### ⚖️ Stock Adjustments
- Fix mismatches between recorded and physical count
- Select product and location
- Enter new counted quantity
- System auto-updates and logs the adjustment

### 📋 Move History (Stock Ledger)
- Complete log of every stock movement
- Filter by type: IN / OUT / TRANSFER / ADJUSTMENT
- Filter by date range and product

### 🏭 Warehouse Management
- Multi-warehouse support
- Multiple locations per warehouse
- Admin creates warehouses and locations

### 👤 User Management (Admin only)
- Admin creates staff accounts
- Role based access control
- Staff cannot access admin pages

---

## 📁 Project Structure

```
CoreInventory/
├── frontend/
│   ├── css/
│   ├── js/
│   │   ├── api.js                ← all API calls
│   │   └── auth.js               ← auth check + logout
│   ├── pages/
│   │   ├── login.html
│   │   ├── dashboard-admin.html
│   │   ├── dashboard-staff.html
│   │   ├── products.html
│   │   ├── receipts.html
│   │   ├── deliveries.html
│   │   ├── transfers.html
│   │   ├── inventory.html
│   │   ├── move-history.html
│   │   ├── settings.html
│   │   └── users-admin.html
│   └── index.html
│
├── backend/
│   ├── controllers/
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── categories.js
│   │   ├── receipts.js
│   │   ├── deliveries.js
│   │   ├── transfers.js
│   │   ├── inventory.js
│   │   ├── moves.js
│   │   ├── warehouses.js
│   │   └── dashboard.js
│   ├── middleware/
│   │   └── auth.js               ← JWT verify
│   ├── routes/
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── categories.js
│   │   ├── receipts.js
│   │   ├── deliveries.js
│   │   ├── transfers.js
│   │   ├── inventory.js
│   │   ├── moves.js
│   │   ├── warehouses.js
│   │   └── dashboard.js
│   ├── utils/
│   │   └── mailer.js             ← SendGrid OTP
│   ├── db.js                     ← PostgreSQL pool
│   ├── index.js                  ← Express entry
│   ├── .env.example
│   └── package.json
│
├── schema.sql                    ← full DB setup + seed data
└── README.md
```

---

## 🔌 API Reference

### Public endpoints (no token)
```
POST   /api/auth/login
POST   /api/auth/otp/send
POST   /api/auth/otp/verify
```

### Admin only
```
POST   /api/auth/register
GET    /api/auth/users
```

### Products
```
GET    /api/products
GET    /api/products/:id
POST   /api/products
PATCH  /api/products/:id
GET    /api/products/:id/stock
```

### Receipts
```
GET    /api/receipts?status=
GET    /api/receipts/:id
POST   /api/receipts
POST   /api/receipts/:id/validate
POST   /api/receipts/:id/cancel
```

### Deliveries
```
GET    /api/deliveries?status=
GET    /api/deliveries/:id
POST   /api/deliveries
POST   /api/deliveries/:id/validate
POST   /api/deliveries/:id/cancel
```

### Transfers
```
GET    /api/transfers?status=
GET    /api/transfers/:id
POST   /api/transfers
POST   /api/transfers/:id/validate
POST   /api/transfers/:id/cancel
```

### Inventory
```
GET    /api/inventory?product_id=&location_id=
POST   /api/inventory/adjust
```

### Move History
```
GET    /api/moves?type=&product_id=&from=&to=
```

### Warehouses
```
GET    /api/warehouses
POST   /api/warehouses
GET    /api/warehouses/:id/locations
POST   /api/warehouses/:id/locations
```

### Dashboard
```
GET    /api/dashboard
```

### Response shape
```json
{ "success": true,  "data": {} }
{ "success": true,  "data": [], "total": 0 }
{ "success": false, "message": "..." }
```

---

## ⚙️ Run Locally

### 1. Clone
```bash
git clone https://github.com/YOUR_USERNAME/CoreInventory.git
cd CoreInventory
```

### 2. Database setup
- Open **Neon** dashboard → SQL Editor
- Paste and run `schema.sql`
- All 14 tables + seed data created in one shot

### 3. Backend
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=5000
DATABASE_URL=your_neon_postgresql_url
JWT_SECRET=any_long_random_string
JWT_EXPIRES_IN=7d
OTP_EXPIRY=300
FRONTEND_URL=http://localhost:4173
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=your_verified_sender@example.com
```

```bash
npm run dev
# runs at http://localhost:5000
```

### 4. Frontend
```bash
cd frontend
npx serve .
# runs at http://localhost:4173
```

---

## 🗄️ Database Schema

| Layer | Tables |
|---|---|
| Foundation | users, categories, warehouses |
| Core | products, locations, receipts, deliveries, transfers |
| Line items | receipt_items, delivery_items, transfer_items |
| Stock engine | inventory, stock_movements, stock_adjustments |

---

## 🚢 Deployment

### Frontend → Vercel
```
Root directory : frontend
No build command needed (pure HTML/JS)
```

### Backend → Render
```
Root directory : backend
Build command  : npm install
Start command  : node index.js
Add all .env variables in Render dashboard
```

### After deploy — update two values
```
FRONTEND_URL  → your Vercel URL   (in Render env vars)
VITE_API_URL  → your Render URL   (in Vercel env vars)
```

---

## 🎨 Status Reference

| Status | Meaning |
|---|---|
| DRAFT | Created, not submitted |
| WAITING | Submitted, pending |
| READY | Approved, ready to process |
| DONE | Completed and validated |
| CANCELLED | Cancelled |

| Movement | Meaning |
|---|---|
| IN | Stock received from supplier |
| OUT | Stock dispatched to customer |
| TRANSFER | Moved between locations |
| ADJUSTMENT | Physical count correction |

---

## 🔒 Security

- `.env` is in `.gitignore` — never pushed to GitHub
- `password_hash` never returned in any API response
- All protected routes require valid JWT Bearer token
- Admin role enforced server-side — cannot be bypassed from frontend
- `DATABASE_URL` shared privately between team members only

---

## 📄 License

Built for hackathon submission.
All rights reserved © CoreInventory Team 2025.