const express = require('express')
const authenticateToken = require('../middleware/auth')
const {
	getAllTransfers,
	getTransferById,
	createTransfer,
	validateTransfer,
	cancelTransfer
} = require('../controllers/transfers')

const router = express.Router()

router.get('/', authenticateToken, getAllTransfers)
router.get('/:id', authenticateToken, getTransferById)
router.post('/', authenticateToken, createTransfer)
router.post('/:id/validate', authenticateToken, validateTransfer)
router.post('/:id/cancel', authenticateToken, cancelTransfer)

module.exports = router
