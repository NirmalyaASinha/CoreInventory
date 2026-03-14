const pool = require('../db')

const getMoveHistory = async (req, res) => {
	try {
		const { product_id, type, from, to } = req.query

		let query = `SELECT sm.*, p.name AS product_name, p.sku,
								sl.name AS source_name,
								dl.name AS destination_name
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
			params.push(new Date(from + 'T00:00:00.000Z'))
			conditions.push(`sm.created_at >= $${params.length}`)
		}

		if (to) {
			params.push(new Date(to + 'T23:59:59.999Z'))
			conditions.push(`sm.created_at <= $${params.length}`)
		}

		if (conditions.length > 0) {
			query += ` WHERE ${conditions.join(' AND ')}`
		}

		query += ' ORDER BY sm.id DESC'

		const result = await pool.query(query, params)

		return res.json({ success: true, data: result.rows, total: result.rowCount })
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

module.exports = {
	getMoveHistory
}
