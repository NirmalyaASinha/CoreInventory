const pool = require('../db')

const getAllProducts = async (req, res) => {
	try {
		const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC')
		return res.json({ success: true, data: result.rows, total: result.rowCount })
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to fetch products' })
	}
}

const getProductById = async (req, res) => {
	try {
		const { id } = req.params
		const result = await pool.query('SELECT * FROM products WHERE id = $1', [id])

		if (result.rowCount === 0) {
			return res.status(404).json({ success: false, message: 'Product not found' })
		}

		return res.json({ success: true, data: result.rows[0] })
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to fetch product' })
	}
}

const createProduct = async (req, res) => {
	const client = await pool.connect()

	try {
		const { name, sku, category_id, unit, reorder_level, initialStock, location_id } = req.body

		await client.query('BEGIN')

		const productResult = await client.query(
			'INSERT INTO products (name, sku, category_id, unit, reorder_level) VALUES ($1, $2, $3, $4, $5) RETURNING *',
			[name, sku, category_id, unit, reorder_level]
		)

		const newProduct = productResult.rows[0]

		if (initialStock != null && location_id != null) {
			await client.query(
				'INSERT INTO inventory (product_id, location_id, quantity) VALUES ($1, $2, $3)',
				[newProduct.id, location_id, initialStock]
			)
		}

		await client.query('COMMIT')

		return res.status(201).json({ success: true, data: newProduct })
	} catch (error) {
		await client.query('ROLLBACK')
		return res.status(500).json({ success: false, message: 'Failed to create product' })
	} finally {
		client.release()
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
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to update product' })
	}
}

const getProductStock = async (req, res) => {
	try {
		const { id } = req.params

		const result = await pool.query(
			`SELECT i.*, l.name as location_name, w.name as warehouse_name
			 FROM inventory i
			 JOIN locations l ON i.location_id = l.id
			 JOIN warehouses w ON l.warehouse_id = w.id
			 WHERE i.product_id = $1`,
			[id]
		)

		return res.json({ success: true, data: result.rows })
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to fetch product stock' })
	}
}

module.exports = {
	getAllProducts,
	getProductById,
	createProduct,
	updateProduct,
	getProductStock
}
