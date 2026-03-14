const express = require('express')
const authenticateToken = require('../middleware/auth')
const {
	getAllReceipts,
	getReceiptById,
	createReceipt,
	updateReceipt,
	validateReceipt,
	cancelReceipt
} = require('../controllers/receipts')

const router = express.Router()

router.get('/', authenticateToken, getAllReceipts)
router.get('/:id', authenticateToken, getReceiptById)
router.post('/', authenticateToken, createReceipt)
router.patch('/:id', authenticateToken, updateReceipt)
router.post('/:id/validate', authenticateToken, validateReceipt)
router.post('/:id/cancel', authenticateToken, cancelReceipt)

module.exports = router
