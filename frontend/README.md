# CoreInventory

CoreInventory is an inventory management backend built with Node.js, Express, and PostgreSQL (Neon).

## Backend Features

- JWT authentication (register, login)
- Email OTP verification (SendGrid)
- Product and category management
- Warehouse and location management
- Stock receipts (incoming)
- Stock deliveries (outgoing)
- Internal stock transfers
- Inventory adjustment and stock movement ledger
- Dashboard summary metrics

## Tech Stack

- Node.js
- Express.js
- PostgreSQL (`pg`)
- JWT (`jsonwebtoken`)
- Password hashing (`bcryptjs`)
- Email OTP (`@sendgrid/mail`)

## Project Structure

```text
backend/
├── index.js
├── db.js
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
```

## Environment Variables

Create `backend/.env`:

```env
PORT=5000
DATABASE_URL=your_neon_database_url
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
OTP_EXPIRY=300
FRONTEND_URL=http://localhost:5173
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_API_KEY_ID=your_sendgrid_key_id
SENDGRID_FROM_EMAIL=your_verified_sender@example.com
```

## Run Locally

```bash
cd backend
npm install
npm run dev
```

Server runs at:

`http://localhost:5000`

Base API path:

`http://localhost:5000/api`

## API Modules

### Auth (public)

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/otp/send`
- `POST /api/auth/otp/verify`

### Products (protected)

- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `PATCH /api/products/:id`
- `GET /api/products/:id/stock`

### Categories (protected)

- `GET /api/categories`
- `POST /api/categories`

### Receipts (protected)

- `GET /api/receipts`
- `GET /api/receipts/:id`
- `POST /api/receipts`
- `PATCH /api/receipts/:id`
- `POST /api/receipts/:id/validate`
- `POST /api/receipts/:id/cancel`

### Deliveries (protected)

- `GET /api/deliveries`
- `GET /api/deliveries/:id`
- `POST /api/deliveries`
- `PATCH /api/deliveries/:id`
- `POST /api/deliveries/:id/validate`
- `POST /api/deliveries/:id/cancel`

### Transfers (protected)

- `GET /api/transfers`
- `GET /api/transfers/:id`
- `POST /api/transfers`
- `POST /api/transfers/:id/validate`
- `POST /api/transfers/:id/cancel`

### Inventory and Movement (protected)

- `GET /api/inventory`
- `POST /api/inventory/adjust`
- `GET /api/moves`

### Warehouses (protected)

- `GET /api/warehouses`
- `POST /api/warehouses`
- `GET /api/warehouses/:id/locations`
- `POST /api/warehouses/:id/locations`

### Dashboard (protected)

- `GET /api/dashboard`

## Important Notes

- `backend/.env` is ignored by git (`backend/.gitignore`)
- Use only a verified sender email in SendGrid
- Ensure Neon DB schema is created before running API flows
