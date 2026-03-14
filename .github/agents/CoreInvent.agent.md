================================================================
  COREINVENTORY — BACKEND PROMPT FOR GITHUB COPILOT (VS CODE)
================================================================

Project     : CoreInventory — Inventory Management System
My Role     : Backend only — Node.js + Express + pg (no Prisma)
Database    : PostgreSQL hosted on Neon
              Connection via process.env.DATABASE_URL
              Tables already created by Aadil
Folder      : CoreInventory/backend/

================================================================
  FOLDER STRUCTURE
================================================================

backend/
├── index.js
├── db.js
├── .env
├── .env.example
├── .gitignore
├── middleware/
│   └── auth.js
├── routes/
│   ├── auth.js
│   ├── products.js
│   ├── categories.js
│   ├── receipts.js
│   ├── deliveries.js
│   ├── transfers.js
│   ├── inventory.js
│   ├── moves.js
│   ├── warehouses.js
│   └── dashboard.js
└── controllers/
    ├── auth.js
    ├── products.js
    ├── categories.js
    ├── receipts.js
    ├── deliveries.js
    ├── transfers.js
    ├── inventory.js
    ├── moves.js
    ├── warehouses.js
    └── dashboard.js

================================================================
  db.js — DATABASE CONNECTION
================================================================

const { Pool } = require('pg')
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})
module.exports = pool

================================================================
  index.js — EXPRESS APP
================================================================

require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express()

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))
app.use(express.json())

// mount all routes here

app.listen(process.env.PORT || 5000)

================================================================
  .env VARIABLES
================================================================

PORT=5000
DATABASE_URL=postgresql://...neon.tech/coreinventory
JWT_SECRET=any_long_random_string
JWT_EXPIRES_IN=7d
OTP_EXPIRY=300
FRONTEND_URL=http://localhost:5173

================================================================
  .env.example — PUSH THIS TO GITHUB (no real values)
================================================================

PORT=5000
DATABASE_URL=your_neon_url_here
JWT_SECRET=any_long_random_string
JWT_EXPIRES_IN=7d
OTP_EXPIRY=300
FRONTEND_URL=your_frontend_url_here

================================================================
  .gitignore
================================================================

.env
node_modules/

================================================================
  middleware/auth.js — JWT PROTECT MIDDLEWARE
================================================================

- Read Authorization: Bearer <token> from request header
- Verify using process.env.JWT_SECRET
- Attach decoded user to req.user
- Return 401 if token is missing or invalid

================================================================
  RESPONSE SHAPE — every route must follow this exactly
================================================================

// Success — single object
res.json({ success: true, data: { } })

// Success — list
res.json({ success: true, data: [ ], total: count })

// Error
res.status(4xx).json({ success: false, message: "..." })

================================================================
  DATABASE TABLES AND EXACT COLUMN NAMES
================================================================

USERS               id, name, email, password_hash, role, created_at
CATEGORIES          id, name, description
WAREHOUSES          id, name, short_code, address
LOCATIONS           id, warehouse_id, name
PRODUCTS            id, name, sku, category_id, unit, reorder_level, created_at
RECEIPTS            id, reference, supplier_name, status, created_by
RECEIPT_ITEMS       id, receipt_id, product_id, quantity
DELIVERIES          id, reference, customer_name, status, created_by
DELIVERY_ITEMS      id, delivery_id, product_id, quantity
TRANSFERS           id, reference, source_location, destination_location, status
TRANSFER_ITEMS      id, transfer_id, product_id, quantity
INVENTORY           id, product_id, location_id, quantity
STOCK_MOVEMENTS     id, product_id, source_location, destination_location,
                    quantity, movement_type
STOCK_ADJUSTMENTS   id, product_id, location_id, adjusted_quantity

================================================================
  ALL API ENDPOINTS
================================================================

----------------------------------------------------------------
AUTH — no token required on these routes
----------------------------------------------------------------

POST   /api/auth/register
POST   /api/auth/login          returns JWT token
POST   /api/auth/otp/send
POST   /api/auth/otp/verify

----------------------------------------------------------------
PRODUCTS — token required on all
----------------------------------------------------------------

GET    /api/products
GET    /api/products/:id
POST   /api/products            also insert into INVENTORY
                                if initial stock is provided
PATCH  /api/products/:id
GET    /api/products/:id/stock  returns quantity from INVENTORY

----------------------------------------------------------------
CATEGORIES — token required on all
----------------------------------------------------------------

GET    /api/categories
POST   /api/categories

----------------------------------------------------------------
RECEIPTS — token required on all
----------------------------------------------------------------

GET    /api/receipts             supports ?status= filter
GET    /api/receipts/:id         include receipt_items in response
POST   /api/receipts             create receipt with items[]
PATCH  /api/receipts/:id

POST   /api/receipts/:id/validate
       → set status = DONE
       → insert rows into STOCK_MOVEMENTS (movement_type = IN)
       → increase quantity in INVENTORY for each item
       → all in one db transaction

POST   /api/receipts/:id/cancel  set status = CANCELLED

----------------------------------------------------------------
DELIVERIES — token required on all
----------------------------------------------------------------

GET    /api/deliveries           supports ?status= filter
GET    /api/deliveries/:id       include delivery_items in response
POST   /api/deliveries           create delivery with items[]
PATCH  /api/deliveries/:id

POST   /api/deliveries/:id/validate
       → set status = DONE
       → insert rows into STOCK_MOVEMENTS (movement_type = OUT)
       → decrease quantity in INVENTORY for each item
       → all in one db transaction

POST   /api/deliveries/:id/cancel  set status = CANCELLED

----------------------------------------------------------------
TRANSFERS — token required on all
----------------------------------------------------------------

GET    /api/transfers            supports ?status= filter
GET    /api/transfers/:id        include transfer_items in response
POST   /api/transfers            create transfer with items[]

POST   /api/transfers/:id/validate
       → set status = DONE
       → insert rows into STOCK_MOVEMENTS (movement_type = TRANSFER)
       → decrease INVENTORY at source_location
       → increase INVENTORY at destination_location
       → all in one db transaction

POST   /api/transfers/:id/cancel  set status = CANCELLED

----------------------------------------------------------------
INVENTORY — token required on all
----------------------------------------------------------------

GET    /api/inventory            supports ?product_id= ?location_id= filters

POST   /api/inventory/adjust
       → update quantity in INVENTORY
       → insert row into STOCK_ADJUSTMENTS
       → insert row into STOCK_MOVEMENTS (movement_type = ADJUSTMENT)

----------------------------------------------------------------
MOVE HISTORY — token required
----------------------------------------------------------------

GET    /api/moves                supports ?product_id= ?type= ?from= ?to= filters

----------------------------------------------------------------
WAREHOUSES — token required on all
----------------------------------------------------------------

GET    /api/warehouses
POST   /api/warehouses
GET    /api/warehouses/:id/locations
POST   /api/warehouses/:id/locations

----------------------------------------------------------------
DASHBOARD — token required
----------------------------------------------------------------

GET    /api/dashboard
       returns:
       totalProducts       COUNT from products
       lowStock            COUNT where inventory.quantity <= products.reorder_level
       outOfStock          COUNT where inventory.quantity = 0
       pendingReceipts     COUNT from receipts where status IN (DRAFT,WAITING,READY)
       pendingDeliveries   COUNT from deliveries where status IN (DRAFT,WAITING,READY)
       transfersScheduled  COUNT from transfers where status IN (DRAFT,WAITING,READY)

================================================================
  CRITICAL RULES
================================================================

1.  validate() endpoints must use db transactions — all or nothing
2.  Never return password_hash in any response — ever
3.  All protected routes use authenticateToken middleware
4.  Auth routes (register, login, otp) do NOT use middleware
5.  CORS origin reads from process.env.FRONTEND_URL
6.  All errors caught with try/catch — return { success: false, message }
7.  Reference numbers auto-generated: REC/001, DEL/001, TRF/001
8.  Status values:    DRAFT | WAITING | READY | DONE | CANCELLED
9.  Movement types:   IN | OUT | TRANSFER | ADJUSTMENT
10. User roles:       admin | staff

================================================================
  PACKAGES TO INSTALL
================================================================

npm install express pg dotenv cors bcryptjs jsonwebtoken
npm install --save-dev nodemon

================================================================
  package.json SCRIPTS
================================================================

"scripts": {
  "start": "node index.js",
  "dev":   "nodemon index.js"
}

================================================================
  BUILD ORDER — one file at a time
================================================================

1.  db.js
2.  index.js
3.  middleware/auth.js
4.  routes/auth.js        + controllers/auth.js
5.  routes/products.js    + controllers/products.js
6.  routes/categories.js  + controllers/categories.js
7.  routes/receipts.js    + controllers/receipts.js
8.  routes/deliveries.js  + controllers/deliveries.js
9.  routes/transfers.js   + controllers/transfers.js
10. routes/inventory.js   + controllers/inventory.js
11. routes/moves.js       + controllers/moves.js
12. routes/warehouses.js  + controllers/warehouses.js
13. routes/dashboard.js   + controllers/dashboard.js

