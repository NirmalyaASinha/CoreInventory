const express = require('express')
const authenticateToken = require('../middleware/auth')
const { getDashboard } = require('../controllers/dashboard')

const router = express.Router()

router.get('/', authenticateToken, getDashboard)

module.exports = router
