const pool = require('../db')

const getAllDeliveries = async (req, res) => {
	try {
		const { status } = req.query

		let query = 'SELECT * FROM deliveries'
		const params = []

		if (status) {
			query += ' WHERE status = $1'
			params.push(status)
		}

		query += ' ORDER BY id DESC'

		const result = await pool.query(query, params)
		return res.json({ success: true, data: result.rows, total: result.rowCount })
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to fetch deliveries' })
	}
}

const getDeliveryById = async (req, res) => {
	try {
		const { id } = req.params

		const deliveryResult = await pool.query('SELECT * FROM deliveries WHERE id = $1', [id])
		if (deliveryResult.rowCount === 0) {
			return res.status(404).json({ success: false, message: 'Delivery not found' })
		}

		const itemsResult = await pool.query('SELECT * FROM delivery_items WHERE delivery_id = $1', [id])

		return res.json({
			success: true,
			data: {
				...deliveryResult.rows[0],
				items: itemsResult.rows
			}
		})
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to fetch delivery' })
	}
}

const createDelivery = async (req, res) => {
	const client = await pool.connect()

	try {
		const { customer_name, items } = req.body

		await client.query('BEGIN')

		const deliveryResult = await client.query(
			'INSERT INTO deliveries (customer_name, status, created_by) VALUES ($1, $2, $3) RETURNING *',
			[customer_name, 'DRAFT', req.user.id]
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
				items: insertedItems
			}
		})
	} catch (error) {
		await client.query('ROLLBACK')
		return res.status(500).json({ success: false, message: 'Failed to create delivery' })
	} finally {
		client.release()
	}
}

const updateDelivery = async (req, res) => {
	try {
		const { id } = req.params
		const { customer_name } = req.body

		const result = await pool.query(
			'UPDATE deliveries SET customer_name = $1 WHERE id = $2 RETURNING *',
			[customer_name, id]
		)

		if (result.rowCount === 0) {
			return res.status(404).json({ success: false, message: 'Delivery not found' })
		}

		return res.json({ success: true, data: result.rows[0] })
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to update delivery' })
	}
}

const validateDelivery = async (req, res) => {
	const client = await pool.connect()

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

		await client.query('BEGIN')

		const updatedDeliveryResult = await client.query(
			"UPDATE deliveries SET status = 'DONE' WHERE id = $1 RETURNING *",
			[id]
		)

		for (const item of itemsResult.rows) {
			await client.query(
				'INSERT INTO stock_movements (product_id, source_location, destination_location, quantity, movement_type) VALUES ($1, $2, $3, $4, $5)',
				[item.product_id, 1, null, item.quantity, 'OUT']
			)

			await client.query(
				'UPDATE inventory SET quantity = quantity - $1 WHERE product_id = $2',
				[item.quantity, item.product_id]
			)
		}

		await client.query('COMMIT')

		return res.json({ success: true, data: updatedDeliveryResult.rows[0] })
	} catch (error) {
		await client.query('ROLLBACK')
		return res.status(500).json({ success: false, message: 'Failed to validate delivery' })
	} finally {
		client.release()
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

		const updatedResult = await pool.query(
			"UPDATE deliveries SET status = 'CANCELLED' WHERE id = $1 RETURNING *",
			[id]
		)

		return res.json({ success: true, data: updatedResult.rows[0] })
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to cancel delivery' })
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
