const express = require('express')
const authenticateToken = require('../middleware/auth')
const {
	getAllDeliveries,
	getDeliveryById,
	createDelivery,
	updateDelivery,
	validateDelivery,
	cancelDelivery
} = require('../controllers/deliveries')

const router = express.Router()

router.get('/', authenticateToken, getAllDeliveries)
router.get('/:id', authenticateToken, getDeliveryById)
router.post('/', authenticateToken, createDelivery)
router.patch('/:id', authenticateToken, updateDelivery)
router.post('/:id/validate', authenticateToken, validateDelivery)
router.post('/:id/cancel', authenticateToken, cancelDelivery)

module.exports = router
