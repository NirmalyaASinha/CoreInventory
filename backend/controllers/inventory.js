const pool = require('../db')

const getInventory = async (req, res) => {
	try {
		const { product_id, location_id } = req.query
		const params = []
		const conditions = []

		let query = `SELECT i.*, p.name AS product_name, p.sku,
							l.name AS location_name, w.name AS warehouse_name,
							p.reorder_level,
							CASE WHEN i.quantity <= p.reorder_level
								 THEN true ELSE false END AS is_low_stock
					 FROM inventory i
					 JOIN products p ON i.product_id = p.id
					 JOIN locations l ON i.location_id = l.id
					 JOIN warehouses w ON l.warehouse_id = w.id`

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

		query += ' ORDER BY i.id DESC'
		const result = await pool.query(query, params)
		return res.json({ success: true, data: result.rows, total: result.rowCount })
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

const adjustInventory = async (req, res) => {
	let client
	try {
		const { product_id, location_id, adjusted_quantity } = req.body
		client = await pool.connect()
		await client.query('BEGIN')

		const currentResult = await client.query(
			'SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2 FOR UPDATE',
			[product_id, location_id]
		)

		if (currentResult.rowCount === 0) {
			throw new Error('Inventory record not found')
		}

		const previousQuantity = Number(currentResult.rows[0].quantity)
		const movementQuantity = Number(adjusted_quantity) - previousQuantity

		const updatedResult = await client.query(
			'UPDATE inventory SET quantity = $1 WHERE product_id = $2 AND location_id = $3 RETURNING *',
			[adjusted_quantity, product_id, location_id]
		)

		await client.query(
			'INSERT INTO stock_adjustments (product_id, location_id, adjusted_quantity) VALUES ($1, $2, $3)',
			[product_id, location_id, adjusted_quantity]
		)

		await client.query(
			`INSERT INTO stock_movements
			 (product_id, source_location, quantity, movement_type)
			 VALUES ($1, $2, $3, 'ADJUSTMENT')`,
			[product_id, location_id, movementQuantity]
		)

		await client.query('COMMIT')
		return res.json({ success: true, data: updatedResult.rows[0] })
	} catch (err) {
		if (client) {
			await client.query('ROLLBACK')
		}
		return res.status(500).json({ success: false, message: err.message })
	} finally {
		if (client) {
			client.release()
		}
	}
}

module.exports = {
	getInventory,
	adjustInventory
}
