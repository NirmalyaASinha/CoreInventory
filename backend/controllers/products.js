const pool = require('../db')

const getAllProducts = async (req, res) => {
	try {
		const result = await pool.query(
			`SELECT p.*, c.name AS category_name,
					COALESCE(SUM(i.quantity), 0) AS on_hand
			 FROM products p
			 LEFT JOIN categories c ON p.category_id = c.id
			 LEFT JOIN inventory i ON p.id = i.product_id
			 GROUP BY p.id, c.name
			 ORDER BY p.created_at DESC`
		)
		return res.json({ success: true, data: result.rows, total: result.rowCount })
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

const getProductById = async (req, res) => {
	try {
		const { id } = req.params
		const result = await pool.query(
			`SELECT p.*, c.name AS category_name
			 FROM products p
			 LEFT JOIN categories c ON p.category_id = c.id
			 WHERE p.id = $1`,
			[id]
		)

		if (result.rowCount === 0) {
			return res.status(404).json({ success: false, message: 'Product not found' })
		}

		return res.json({ success: true, data: result.rows[0] })
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

const createProduct = async (req, res) => {
	try {
		const { name, sku, category_id, unit, reorder_level, initialStock, location_id } = req.body
		const productResult = await pool.query(
			'INSERT INTO products (name, sku, category_id, unit, reorder_level) VALUES ($1, $2, $3, $4, $5) RETURNING *',
			[name, sku, category_id, unit, reorder_level]
		)

		const newProduct = productResult.rows[0]

		if (initialStock != null && location_id != null) {
			await pool.query(
				`INSERT INTO inventory (product_id, location_id, quantity)
				 VALUES ($1, $2, $3)
				 ON CONFLICT (product_id, location_id)
				 DO UPDATE SET quantity = EXCLUDED.quantity`,
				[newProduct.id, location_id, initialStock]
			)
		}

		return res.status(201).json({ success: true, data: newProduct })
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

const updateProduct = async (req, res) => {
	try {
		const { id } = req.params
		const { name, sku, category_id, unit, reorder_level } = req.body

		const result = await pool.query(
			'UPDATE products SET name = $1, sku = $2, category_id = $3, unit = $4, reorder_level = $5 WHERE id = $6 RETURNING *',
			[name, sku, category_id, unit, reorder_level, id]
		)

		if (result.rowCount === 0) {
			return res.status(404).json({ success: false, message: 'Product not found' })
		}

		return res.json({ success: true, data: result.rows[0] })
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

const getProductStock = async (req, res) => {
	try {
		const { id } = req.params

		const result = await pool.query(
			`SELECT i.quantity, l.name AS location_name,
					w.name AS warehouse_name
			 FROM inventory i
			 JOIN locations l ON i.location_id = l.id
			 JOIN warehouses w ON l.warehouse_id = w.id
			 WHERE i.product_id = $1`,
			[id]
		)

		return res.json({ success: true, data: result.rows, total: result.rowCount })
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

module.exports = {
	getAllProducts,
	getProductById,
	createProduct,
	updateProduct,
	getProductStock
}
