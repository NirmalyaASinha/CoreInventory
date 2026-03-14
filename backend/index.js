require('dotenv').config()

const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const productRoutes = require('./routes/products')
const categoryRoutes = require('./routes/categories')
const receiptRoutes = require('./routes/receipts')
const deliveryRoutes = require('./routes/deliveries')
const transferRoutes = require('./routes/transfers')
const inventoryRoutes = require('./routes/inventory')
const moveRoutes = require('./routes/moves')
const warehouseRoutes = require('./routes/warehouses')
const dashboardRoutes = require('./routes/dashboard')

const app = express()

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/receipts', receiptRoutes)
app.use('/api/deliveries', deliveryRoutes)
app.use('/api/transfers', transferRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/moves', moveRoutes)
app.use('/api/warehouses', warehouseRoutes)
app.use('/api/dashboard', dashboardRoutes)

app.use((req, res) => {
	res.status(404).json({ success: false, message: 'Route not found' })
})

app.use((err, req, res, next) => {
	res.status(500).json({ success: false, message: err.message })
})

app.listen(process.env.PORT || 5000, () => {
	console.log('Server running on port', process.env.PORT || 5000)
})
