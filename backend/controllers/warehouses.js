const pool = require('../db')

const getAllWarehouses = async (req, res) => {
	try {
		const result = await pool.query('SELECT * FROM warehouses ORDER BY name ASC')
		return res.json({ success: true, data: result.rows, total: result.rowCount })
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to fetch warehouses' })
	}
}

const createWarehouse = async (req, res) => {
	try {
		const { name, address } = req.body
		const result = await pool.query(
			'INSERT INTO warehouses (name, address) VALUES ($1, $2) RETURNING *',
			[name, address]
		)

		return res.status(201).json({ success: true, data: result.rows[0] })
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to create warehouse' })
	}
}

const getWarehouseLocations = async (req, res) => {
	try {
		const { id } = req.params
		const result = await pool.query('SELECT * FROM locations WHERE warehouse_id = $1', [id])

		return res.json({ success: true, data: result.rows, total: result.rowCount })
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to fetch warehouse locations' })
	}
}

const createLocation = async (req, res) => {
	try {
		const { id } = req.params
		const { name } = req.body

		const result = await pool.query(
			'INSERT INTO locations (warehouse_id, name) VALUES ($1, $2) RETURNING *',
			[id, name]
		)

		return res.status(201).json({ success: true, data: result.rows[0] })
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to create location' })
	}
}

module.exports = {
	getAllWarehouses,
	createWarehouse,
	getWarehouseLocations,
	createLocation
}
