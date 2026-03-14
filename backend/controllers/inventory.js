const pool = require('../db')

const getInventory = async (req, res) => {
	try {
		const { product_id, location_id } = req.query

		let query = `SELECT i.*, p.name as product_name, p.sku,
												l.name as location_name, w.name as warehouse_name
								 FROM inventory i
								 JOIN products p ON i.product_id = p.id
								 JOIN locations l ON i.location_id = l.id
								 JOIN warehouses w ON l.warehouse_id = w.id`

		const conditions = []
		const params = []

		if (product_id) {
			params.push(product_id)
			conditions.push(`i.product_id = $${params.length}`)
		}

		if (location_id) {
			params.push(location_id)
			conditions.push(`i.location_id = $${params.length}`)
		}

		if (conditions.length > 0) {
			query += ` WHERE ${conditions.join(' AND ')}`
		}

		const result = await pool.query(query, params)
		return res.json({ success: true, data: result.rows, total: result.rowCount })
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to fetch inventory' })
	}
}

const adjustInventory = async (req, res) => {
	const client = await pool.connect()

	try {
		const { product_id, location_id, adjusted_quantity } = req.body

		await client.query('BEGIN')

		const updatedResult = await client.query(
			'UPDATE inventory SET quantity = $1 WHERE product_id = $2 AND location_id = $3 RETURNING *',
			[adjusted_quantity, product_id, location_id]
		)

		await client.query(
			'INSERT INTO stock_adjustments (product_id, location_id, adjusted_quantity) VALUES ($1, $2, $3)',
			[product_id, location_id, adjusted_quantity]
		)

		await client.query(
			'INSERT INTO stock_movements (product_id, source_location, quantity, movement_type) VALUES ($1, $2, $3, $4)',
			[product_id, location_id, adjusted_quantity, 'ADJUSTMENT']
		)

		await client.query('COMMIT')

		return res.json({ success: true, data: updatedResult.rows[0] })
	} catch (error) {
		await client.query('ROLLBACK')
		return res.status(500).json({ success: false, message: 'Failed to adjust inventory' })
	} finally {
		client.release()
	}
}

module.exports = {
	getInventory,
	adjustInventory
}
