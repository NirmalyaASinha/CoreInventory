const express = require('express')
const { register, login, sendOtp, verifyOtp, getUsers } = require('../controllers/auth')
const authenticateToken = require('../middleware/auth')

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.post('/otp/send', sendOtp)
router.post('/otp/verify', verifyOtp)
router.get('/users', authenticateToken, getUsers)

module.exports = router
