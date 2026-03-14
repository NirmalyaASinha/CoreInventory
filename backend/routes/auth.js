const express = require('express')
const { register, login, sendOtp, verifyOtp } = require('../controllers/auth')

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.post('/otp/send', sendOtp)
router.post('/otp/verify', verifyOtp)

module.exports = router
