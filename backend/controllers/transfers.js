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

const getAllTransfers = async (req, res) => {
	try {
		const { status } = req.query
		const hasReference = await hasColumn('transfers', 'reference')
		let query = hasReference
			? `SELECT t.*, u.name AS created_by_name
			   FROM transfers t
			   LEFT JOIN users u ON t.created_by = u.id`
			: `SELECT t.*, 'TRF/' || LPAD(CAST(t.id AS TEXT), 3, '0') AS reference,
					  u.name AS created_by_name
			   FROM transfers t
			   LEFT JOIN users u ON t.created_by = u.id`
		const params = []

		if (status) {
			params.push(status)
			query += ` WHERE t.status = $${params.length}`
		}

		query += ' ORDER BY t.id DESC'
		const result = await pool.query(query, params)
		return res.json({ success: true, data: result.rows, total: result.rowCount })
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

const getTransferById = async (req, res) => {
	try {
		const { id } = req.params
		const hasReference = await hasColumn('transfers', 'reference')
		const transferQuery = hasReference
			? 'SELECT * FROM transfers WHERE id = $1'
			: "SELECT t.*, 'TRF/' || LPAD(CAST(t.id AS TEXT), 3, '0') AS reference FROM transfers t WHERE id = $1"

		const transferResult = await pool.query(transferQuery, [id])
		if (transferResult.rowCount === 0) {
			return res.status(404).json({ success: false, message: 'Transfer not found' })
		}

		const itemsResult = await pool.query(
			`SELECT ti.*, p.name AS product_name, p.sku
			 FROM transfer_items ti
			 JOIN products p ON ti.product_id = p.id
			 WHERE ti.transfer_id = $1`,
			[id]
		)

		return res.json({
			success: true,
			data: {
				...transferResult.rows[0],
				items: itemsResult.rows
			}
		})
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

const createTransfer = async (req, res) => {
	let client
	try {
		const { source_location, destination_location, items = [] } = req.body

		if (!source_location || !destination_location || !Array.isArray(items) || items.length === 0) {
			return res.status(400).json({ success: false, message: 'source_location, destination_location and items are required' })
		}

		const countResult = await pool.query('SELECT COUNT(*) FROM transfers')
		const generatedReference = `TRF/${String(parseInt(countResult.rows[0].count, 10) + 1).padStart(3, '0')}`
		const hasReference = await hasColumn('transfers', 'reference')

		client = await pool.connect()
		await client.query('BEGIN')

		const transferResult = hasReference
			? await client.query(
					`INSERT INTO transfers (reference, source_location, destination_location, status, created_by)
					 VALUES ($1, $2, $3, 'DRAFT', $4)
					 RETURNING *`,
					[generatedReference, source_location, destination_location, req.user.id]
			  )
			: await client.query(
					`INSERT INTO transfers (source_location, destination_location, status, created_by)
					 VALUES ($1, $2, 'DRAFT', $3)
					 RETURNING *`,
					[source_location, destination_location, req.user.id]
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
				reference: transfer.reference || generatedReference || formatReference('TRF', transfer.id),
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

const validateTransfer = async (req, res) => {
	let client
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
		if (itemsResult.rowCount === 0) {
			return res.status(400).json({ success: false, message: 'Transfer has no items' })
		}

		client = await pool.connect()
		await client.query('BEGIN')

		await client.query("UPDATE transfers SET status = 'DONE' WHERE id = $1", [id])

		for (const item of itemsResult.rows) {
			await client.query(
				`INSERT INTO stock_movements
				 (product_id, source_location, destination_location, quantity, movement_type)
				 VALUES ($1, $2, $3, $4, 'TRANSFER')`,
				[item.product_id, transfer.source_location, transfer.destination_location, item.quantity]
			)

			const sourceUpdate = await client.query(
				`UPDATE inventory
				 SET quantity = quantity - $1
				 WHERE product_id = $2 AND location_id = $3 AND quantity >= $1
				 RETURNING *`,
				[item.quantity, item.product_id, transfer.source_location]
			)

			if (sourceUpdate.rowCount === 0) {
				throw new Error('Insufficient stock for product ' + item.product_id)
			}

			await client.query(
				`INSERT INTO inventory (product_id, location_id, quantity)
				 VALUES ($1, $2, $3)
				 ON CONFLICT (product_id, location_id)
				 DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity`,
				[item.product_id, transfer.destination_location, item.quantity]
			)
		}

		await client.query('COMMIT')
		return res.json({ success: true, data: { id: transfer.id, status: 'DONE' } })
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

		const result = await pool.query("UPDATE transfers SET status = 'CANCELLED' WHERE id = $1 RETURNING *", [id])
		return res.json({ success: true, data: result.rows[0] })
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

module.exports = {
	getAllTransfers,
	getTransferById,
	createTransfer,
	validateTransfer,
	cancelTransfer
}
