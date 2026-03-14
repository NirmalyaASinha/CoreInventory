const express = require('express')
const authenticateToken = require('../middleware/auth')
const { getInventory, adjustInventory } = require('../controllers/inventory')

const router = express.Router()

router.get('/', authenticateToken, getInventory)
router.post('/adjust', authenticateToken, adjustInventory)

module.exports = router
