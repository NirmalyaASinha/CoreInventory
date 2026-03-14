const pool = require('../db')

const getAllCategories = async (req, res) => {
	try {
		const result = await pool.query('SELECT * FROM categories ORDER BY name ASC')
		return res.json({ success: true, data: result.rows, total: result.rowCount })
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

const createCategory = async (req, res) => {
	try {
		const { name, description } = req.body
		const result = await pool.query(
			'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
			[name, description]
		)

		return res.status(201).json({ success: true, data: result.rows[0] })
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

module.exports = {
	getAllCategories,
	createCategory
}
