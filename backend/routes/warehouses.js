const express = require('express')
const authenticateToken = require('../middleware/auth')
const {
	getAllWarehouses,
	createWarehouse,
	getWarehouseLocations,
	createLocation
} = require('../controllers/warehouses')

const router = express.Router()

router.get('/', authenticateToken, getAllWarehouses)
router.post('/', authenticateToken, createWarehouse)
router.get('/:id/locations', authenticateToken, getWarehouseLocations)
router.post('/:id/locations', authenticateToken, createLocation)

module.exports = router
