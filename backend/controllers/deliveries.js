const pool = require('../db')

const hasColumn = async (tableName, columnName) => {
	const result = await pool.query(
		`SELECT EXISTS (
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = 'public'
			  AND table_name = $1
			  AND column_name = $2
		) AS has_column`,
		[tableName, columnName]
	)
	return result.rows[0].has_column
}

const formatReference = (prefix, id) => `${prefix}/${String(id).padStart(3, '0')}`

const getAllDeliveries = async (req, res) => {
	try {
		const { status } = req.query
		const hasReference = await hasColumn('deliveries', 'reference')
		let query = hasReference
			? `SELECT d.*, u.name AS created_by_name
			   FROM deliveries d
			   LEFT JOIN users u ON d.created_by = u.id`
			: `SELECT d.*, 'DEL/' || LPAD(CAST(d.id AS TEXT), 3, '0') AS reference,
					  u.name AS created_by_name
			   FROM deliveries d
			   LEFT JOIN users u ON d.created_by = u.id`
		const params = []

		if (status) {
			params.push(status)
			query += ` WHERE d.status = $${params.length}`
		}

		query += ' ORDER BY d.id DESC'
		const result = await pool.query(query, params)
		return res.json({ success: true, data: result.rows, total: result.rowCount })
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

const getDeliveryById = async (req, res) => {
	try {
		const { id } = req.params
		const hasReference = await hasColumn('deliveries', 'reference')
		const deliveryQuery = hasReference
			? 'SELECT * FROM deliveries WHERE id = $1'
			: "SELECT d.*, 'DEL/' || LPAD(CAST(d.id AS TEXT), 3, '0') AS reference FROM deliveries d WHERE id = $1"

		const deliveryResult = await pool.query(deliveryQuery, [id])
		if (deliveryResult.rowCount === 0) {
			return res.status(404).json({ success: false, message: 'Delivery not found' })
		}

		const itemsResult = await pool.query(
			`SELECT di.*, p.name AS product_name, p.sku
			 FROM delivery_items di
			 JOIN products p ON di.product_id = p.id
			 WHERE di.delivery_id = $1`,
			[id]
		)

		return res.json({
			success: true,
			data: {
				...deliveryResult.rows[0],
				items: itemsResult.rows
			}
		})
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

const createDelivery = async (req, res) => {
	let client
	try {
		const { customer_name, items = [] } = req.body

		if (!customer_name || !Array.isArray(items) || items.length === 0) {
			return res.status(400).json({ success: false, message: 'customer_name and at least one item are required' })
		}

		const countResult = await pool.query('SELECT COUNT(*) FROM deliveries')
		const generatedReference = `DEL/${String(parseInt(countResult.rows[0].count, 10) + 1).padStart(3, '0')}`
		const hasReference = await hasColumn('deliveries', 'reference')

		client = await pool.connect()
		await client.query('BEGIN')

		const deliveryResult = hasReference
			? await client.query(
					`INSERT INTO deliveries (reference, customer_name, status, created_by)
					 VALUES ($1, $2, 'DRAFT', $3)
					 RETURNING *`,
					[generatedReference, customer_name, req.user.id]
			  )
			: await client.query(
					`INSERT INTO deliveries (customer_name, status, created_by)
					 VALUES ($1, 'DRAFT', $2)
					 RETURNING *`,
					[customer_name, req.user.id]
			  )

		const delivery = deliveryResult.rows[0]
		const insertedItems = []

		for (const item of items) {
			const itemResult = await client.query(
				'INSERT INTO delivery_items (delivery_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *',
				[delivery.id, item.product_id, item.quantity]
			)
			insertedItems.push(itemResult.rows[0])
		}

		await client.query('COMMIT')
		return res.status(201).json({
			success: true,
			data: {
				...delivery,
				reference: delivery.reference || generatedReference || formatReference('DEL', delivery.id),
				items: insertedItems
			}
		})
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

const updateDelivery = async (req, res) => {
	try {
		const { id } = req.params
		const { customer_name } = req.body
		const result = await pool.query('UPDATE deliveries SET customer_name = $1 WHERE id = $2 RETURNING *', [customer_name, id])

		if (result.rowCount === 0) {
			return res.status(404).json({ success: false, message: 'Delivery not found' })
		}

		return res.json({ success: true, data: result.rows[0] })
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

const validateDelivery = async (req, res) => {
	let client
	try {
		const { id } = req.params

		const deliveryResult = await pool.query('SELECT * FROM deliveries WHERE id = $1', [id])
		if (deliveryResult.rowCount === 0) {
			return res.status(404).json({ success: false, message: 'Delivery not found' })
		}

		const delivery = deliveryResult.rows[0]
		if (delivery.status === 'DONE') {
			return res.status(400).json({ success: false, message: 'Already validated' })
		}
		if (delivery.status === 'CANCELLED') {
			return res.status(400).json({ success: false, message: 'Cannot validate cancelled' })
		}

		const itemsResult = await pool.query('SELECT * FROM delivery_items WHERE delivery_id = $1', [id])
		if (itemsResult.rowCount === 0) {
			return res.status(400).json({ success: false, message: 'Delivery has no items' })
		}

		client = await pool.connect()
		await client.query('BEGIN')

		await client.query("UPDATE deliveries SET status = 'DONE' WHERE id = $1", [id])

		for (const item of itemsResult.rows) {
			let sourceLocation = item.location_id || null
			if (!sourceLocation) {
				const sourceResult = await client.query(
					`SELECT location_id
					 FROM inventory
					 WHERE product_id = $1 AND quantity >= $2
					 ORDER BY quantity DESC, location_id ASC
					 LIMIT 1`,
					[item.product_id, item.quantity]
				)
				if (sourceResult.rowCount === 0) {
					throw new Error('Insufficient stock for product ' + item.product_id)
				}
				sourceLocation = sourceResult.rows[0].location_id
			}

			await client.query(
				`INSERT INTO stock_movements
				 (product_id, source_location, quantity, movement_type)
				 VALUES ($1, $2, $3, 'OUT')`,
				[item.product_id, sourceLocation, item.quantity]
			)

			const updateResult = await client.query(
				`UPDATE inventory
				 SET quantity = quantity - $1
				 WHERE product_id = $2 AND location_id = $3 AND quantity >= $1
				 RETURNING *`,
				[item.quantity, item.product_id, sourceLocation]
			)

			if (updateResult.rowCount === 0) {
				throw new Error('Insufficient stock for product ' + item.product_id)
			}
		}

		await client.query('COMMIT')
		return res.json({ success: true, data: { id: delivery.id, status: 'DONE' } })
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

const cancelDelivery = async (req, res) => {
	try {
		const { id } = req.params
		const deliveryResult = await pool.query('SELECT * FROM deliveries WHERE id = $1', [id])
		if (deliveryResult.rowCount === 0) {
			return res.status(404).json({ success: false, message: 'Delivery not found' })
		}

		if (deliveryResult.rows[0].status === 'DONE') {
			return res.status(400).json({ success: false, message: 'Cannot cancel completed delivery' })
		}

		const result = await pool.query("UPDATE deliveries SET status = 'CANCELLED' WHERE id = $1 RETURNING *", [id])
		return res.json({ success: true, data: result.rows[0] })
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

module.exports = {
	getAllDeliveries,
	getDeliveryById,
	createDelivery,
	updateDelivery,
	validateDelivery,
	cancelDelivery
}
