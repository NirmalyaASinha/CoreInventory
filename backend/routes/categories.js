const express = require('express')
const authenticateToken = require('../middleware/auth')
const { getAllCategories, createCategory } = require('../controllers/categories')

const router = express.Router()

router.get('/', authenticateToken, getAllCategories)
router.post('/', authenticateToken, createCategory)

module.exports = router
