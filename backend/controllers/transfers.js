const pool = require('../db')

const getAllTransfers = async (req, res) => {
	try {
		const { status } = req.query

		let query = 'SELECT * FROM transfers'
		const params = []

		if (status) {
			query += ' WHERE status = $1'
			params.push(status)
		}

		query += ' ORDER BY id DESC'

		const result = await pool.query(query, params)
		return res.json({ success: true, data: result.rows, total: result.rowCount })
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to fetch transfers' })
	}
}

const getTransferById = async (req, res) => {
	try {
		const { id } = req.params

		const transferResult = await pool.query('SELECT * FROM transfers WHERE id = $1', [id])
		if (transferResult.rowCount === 0) {
			return res.status(404).json({ success: false, message: 'Transfer not found' })
		}

		const itemsResult = await pool.query('SELECT * FROM transfer_items WHERE transfer_id = $1', [id])

		return res.json({
			success: true,
			data: {
				...transferResult.rows[0],
				items: itemsResult.rows
			}
		})
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to fetch transfer' })
	}
}

const createTransfer = async (req, res) => {
	const client = await pool.connect()

	try {
		const { source_location, destination_location, items } = req.body

		await client.query('BEGIN')

		const transferResult = await client.query(
			'INSERT INTO transfers (source_location, destination_location, status, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
			[source_location, destination_location, 'DRAFT', req.user.id]
		)

		const transfer = transferResult.rows[0]
		const insertedItems = []

		for (const item of items) {
			const itemResult = await client.query(
				'INSERT INTO transfer_items (transfer_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *',
				[transfer.id, item.product_id, item.quantity]
			)
			insertedItems.push(itemResult.rows[0])
		}

		await client.query('COMMIT')

		return res.status(201).json({
			success: true,
			data: {
				...transfer,
				items: insertedItems
			}
		})
	} catch (error) {
		await client.query('ROLLBACK')
		return res.status(500).json({ success: false, message: 'Failed to create transfer' })
	} finally {
		client.release()
	}
}

const validateTransfer = async (req, res) => {
	const client = await pool.connect()

	try {
		const { id } = req.params

		const transferResult = await pool.query('SELECT * FROM transfers WHERE id = $1', [id])
		if (transferResult.rowCount === 0) {
			return res.status(404).json({ success: false, message: 'Transfer not found' })
		}

		const transfer = transferResult.rows[0]

		if (transfer.status === 'DONE') {
			return res.status(400).json({ success: false, message: 'Already validated' })
		}

		if (transfer.status === 'CANCELLED') {
			return res.status(400).json({ success: false, message: 'Cannot validate cancelled' })
		}

		const itemsResult = await pool.query('SELECT * FROM transfer_items WHERE transfer_id = $1', [id])

		await client.query('BEGIN')

		const updatedTransferResult = await client.query(
			"UPDATE transfers SET status = 'DONE' WHERE id = $1 RETURNING *",
			[id]
		)

		for (const item of itemsResult.rows) {
			await client.query(
				'INSERT INTO stock_movements (product_id, source_location, destination_location, quantity, movement_type) VALUES ($1, $2, $3, $4, $5)',
				[item.product_id, transfer.source_location, transfer.destination_location, item.quantity, 'TRANSFER']
			)

			await client.query(
				'UPDATE inventory SET quantity = quantity - $1 WHERE product_id = $2 AND location_id = $3',
				[item.quantity, item.product_id, transfer.source_location]
			)

			await client.query(
				`INSERT INTO inventory (product_id, location_id, quantity)
				 VALUES ($1, $2, $3)
				 ON CONFLICT (product_id, location_id)
				 DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity`,
				[item.product_id, transfer.destination_location, item.quantity]
			)
		}

		await client.query('COMMIT')

		return res.json({ success: true, data: updatedTransferResult.rows[0] })
	} catch (error) {
		await client.query('ROLLBACK')
		return res.status(500).json({ success: false, message: 'Failed to validate transfer' })
	} finally {
		client.release()
	}
}

const cancelTransfer = async (req, res) => {
	try {
		const { id } = req.params

		const transferResult = await pool.query('SELECT * FROM transfers WHERE id = $1', [id])
		if (transferResult.rowCount === 0) {
			return res.status(404).json({ success: false, message: 'Transfer not found' })
		}

		if (transferResult.rows[0].status === 'DONE') {
			return res.status(400).json({ success: false, message: 'Cannot cancel completed transfer' })
		}

		const updatedResult = await pool.query(
			"UPDATE transfers SET status = 'CANCELLED' WHERE id = $1 RETURNING *",
			[id]
		)

		return res.json({ success: true, data: updatedResult.rows[0] })
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to cancel transfer' })
	}
}

module.exports = {
	getAllTransfers,
	getTransferById,
	createTransfer,
	validateTransfer,
	cancelTransfer
}
