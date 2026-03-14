const pool = require('../db')

const getMoveHistory = async (req, res) => {
	try {
		const { product_id, type, from, to } = req.query

		let query = `SELECT sm.*, p.name as product_name, p.sku,
												sl.name as source_location_name,
												dl.name as destination_location_name
								 FROM stock_movements sm
								 JOIN products p ON sm.product_id = p.id
								 LEFT JOIN locations sl ON sm.source_location = sl.id
								 LEFT JOIN locations dl ON sm.destination_location = dl.id`

		const conditions = []
		const params = []

		if (product_id) {
			params.push(product_id)
			conditions.push(`sm.product_id = $${params.length}`)
		}

		if (type) {
			params.push(type)
			conditions.push(`sm.movement_type = $${params.length}`)
		}

		if (from) {
			params.push(from)
			conditions.push(`sm.created_at >= $${params.length}`)
		}

		if (to) {
			params.push(to)
			conditions.push(`sm.created_at <= $${params.length}`)
		}

		if (conditions.length > 0) {
			query += ` WHERE ${conditions.join(' AND ')}`
		}

		query += ' ORDER BY sm.id DESC'

		const result = await pool.query(query, params)

		return res.json({ success: true, data: result.rows, total: result.rowCount })
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to fetch move history' })
	}
}

module.exports = {
	getMoveHistory
}
