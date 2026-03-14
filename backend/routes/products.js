const express = require('express')
const authenticateToken = require('../middleware/auth')
const {
	getAllProducts,
	getProductById,
	createProduct,
	updateProduct,
	getProductStock
} = require('../controllers/products')

const router = express.Router()

router.get('/', authenticateToken, getAllProducts)
router.get('/:id', authenticateToken, getProductById)
router.post('/', authenticateToken, createProduct)
router.patch('/:id', authenticateToken, updateProduct)
router.get('/:id/stock', authenticateToken, getProductStock)

module.exports = router
