const pool = require('../db')

const getAllReceipts = async (req, res) => {
	try {
		const { status } = req.query

		let query = 'SELECT * FROM receipts'
		const params = []

		if (status) {
			query += ' WHERE status = $1'
			params.push(status)
		}

		query += ' ORDER BY id DESC'

		const result = await pool.query(query, params)
		return res.json({ success: true, data: result.rows, total: result.rowCount })
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to fetch receipts' })
	}
}

const getReceiptById = async (req, res) => {
	try {
		const { id } = req.params

		const receiptResult = await pool.query('SELECT * FROM receipts WHERE id = $1', [id])

		if (receiptResult.rowCount === 0) {
			return res.status(404).json({ success: false, message: 'Receipt not found' })
		}

		const itemsResult = await pool.query('SELECT * FROM receipt_items WHERE receipt_id = $1', [id])

		return res.json({
			success: true,
			data: {
				...receiptResult.rows[0],
				items: itemsResult.rows
			}
		})
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to fetch receipt' })
	}
}

const createReceipt = async (req, res) => {
	const client = await pool.connect()

	try {
		const { supplier_name, items } = req.body

		await client.query('BEGIN')

		const receiptResult = await client.query(
			'INSERT INTO receipts (supplier_name, status, created_by) VALUES ($1, $2, $3) RETURNING *',
			[supplier_name, 'DRAFT', req.user.id]
		)

		const receipt = receiptResult.rows[0]
		const insertedItems = []

		for (const item of items) {
			const itemResult = await client.query(
				'INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *',
				[receipt.id, item.product_id, item.quantity]
			)
			insertedItems.push(itemResult.rows[0])
		}

		await client.query('COMMIT')

		return res.status(201).json({
			success: true,
			data: {
				...receipt,
				items: insertedItems
			}
		})
	} catch (error) {
		await client.query('ROLLBACK')
		return res.status(500).json({ success: false, message: 'Failed to create receipt' })
	} finally {
		client.release()
	}
}

const updateReceipt = async (req, res) => {
	try {
		const { id } = req.params
		const { supplier_name } = req.body

		const result = await pool.query(
			'UPDATE receipts SET supplier_name = $1 WHERE id = $2 RETURNING *',
			[supplier_name, id]
		)

		if (result.rowCount === 0) {
			return res.status(404).json({ success: false, message: 'Receipt not found' })
		}

		return res.json({ success: true, data: result.rows[0] })
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to update receipt' })
	}
}

const validateReceipt = async (req, res) => {
	const client = await pool.connect()

	try {
		const { id } = req.params

		const receiptResult = await pool.query('SELECT * FROM receipts WHERE id = $1', [id])

		if (receiptResult.rowCount === 0) {
			return res.status(404).json({ success: false, message: 'Receipt not found' })
		}

		const receipt = receiptResult.rows[0]

		if (receipt.status === 'DONE') {
			return res.status(400).json({ success: false, message: 'Already validated' })
		}

		if (receipt.status === 'CANCELLED') {
			return res.status(400).json({ success: false, message: 'Cannot validate cancelled receipt' })
		}

		const itemsResult = await pool.query('SELECT * FROM receipt_items WHERE receipt_id = $1', [id])

		await client.query('BEGIN')

		const updatedReceiptResult = await client.query(
			"UPDATE receipts SET status = 'DONE' WHERE id = $1 RETURNING *",
			[id]
		)

		for (const item of itemsResult.rows) {
			await client.query(
				'INSERT INTO stock_movements (product_id, source_location, destination_location, quantity, movement_type) VALUES ($1, $2, $3, $4, $5)',
				[item.product_id, null, 1, item.quantity, 'IN']
			)

			await client.query(
				`INSERT INTO inventory (product_id, location_id, quantity)
				 VALUES ($1, $2, $3)
				 ON CONFLICT (product_id, location_id)
				 DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity`,
				[item.product_id, 1, item.quantity]
			)
		}

		await client.query('COMMIT')

		return res.json({ success: true, data: updatedReceiptResult.rows[0] })
	} catch (error) {
		await client.query('ROLLBACK')
		return res.status(500).json({ success: false, message: 'Failed to validate receipt' })
	} finally {
		client.release()
	}
}

const cancelReceipt = async (req, res) => {
	try {
		const { id } = req.params

		const receiptResult = await pool.query('SELECT * FROM receipts WHERE id = $1', [id])

		if (receiptResult.rowCount === 0) {
			return res.status(404).json({ success: false, message: 'Receipt not found' })
		}

		if (receiptResult.rows[0].status === 'DONE') {
			return res.status(400).json({ success: false, message: 'Cannot cancel completed receipt' })
		}

		const updatedResult = await pool.query(
			"UPDATE receipts SET status = 'CANCELLED' WHERE id = $1 RETURNING *",
			[id]
		)

		return res.json({ success: true, data: updatedResult.rows[0] })
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to cancel receipt' })
	}
}

module.exports = {
	getAllReceipts,
	getReceiptById,
	createReceipt,
	updateReceipt,
	validateReceipt,
	cancelReceipt
}
