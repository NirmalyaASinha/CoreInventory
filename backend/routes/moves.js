const express = require('express')
const authenticateToken = require('../middleware/auth')
const { getMoveHistory } = require('../controllers/moves')

const router = express.Router()

router.get('/', authenticateToken, getMoveHistory)

module.exports = router
