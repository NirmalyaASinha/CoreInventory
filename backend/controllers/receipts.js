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

const getAllReceipts = async (req, res) => {
	try {
		const { status } = req.query
		const hasReference = await hasColumn('receipts', 'reference')
		let query = hasReference
			? `SELECT r.*, u.name AS created_by_name
			   FROM receipts r
			   LEFT JOIN users u ON r.created_by = u.id`
			: `SELECT r.*, 'REC/' || LPAD(CAST(r.id AS TEXT), 3, '0') AS reference,
					  u.name AS created_by_name
			   FROM receipts r
			   LEFT JOIN users u ON r.created_by = u.id`
		const params = []

		if (status) {
			params.push(status)
			query += ` WHERE r.status = $${params.length}`
		}

		query += ' ORDER BY r.id DESC'
		const result = await pool.query(query, params)
		return res.json({ success: true, data: result.rows, total: result.rowCount })
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

const getReceiptById = async (req, res) => {
	try {
		const { id } = req.params
		const hasReference = await hasColumn('receipts', 'reference')

		const receiptQuery = hasReference
			? 'SELECT * FROM receipts WHERE id = $1'
			: "SELECT r.*, 'REC/' || LPAD(CAST(r.id AS TEXT), 3, '0') AS reference FROM receipts r WHERE id = $1"

		const receiptResult = await pool.query(receiptQuery, [id])
		if (receiptResult.rowCount === 0) {
			return res.status(404).json({ success: false, message: 'Receipt not found' })
		}

		const itemsResult = await pool.query(
			`SELECT ri.*, p.name AS product_name, p.sku
			 FROM receipt_items ri
			 JOIN products p ON ri.product_id = p.id
			 WHERE ri.receipt_id = $1`,
			[id]
		)

		return res.json({
			success: true,
			data: {
				...receiptResult.rows[0],
				items: itemsResult.rows
			}
		})
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

const createReceipt = async (req, res) => {
	let client
	try {
		const { supplier_name, items = [] } = req.body
		const createdBy = req.user.id

		if (!supplier_name || !Array.isArray(items) || items.length === 0) {
			return res.status(400).json({ success: false, message: 'supplier_name and at least one item are required' })
		}

		const countResult = await pool.query('SELECT COUNT(*) FROM receipts')
		const generatedReference = `REC/${String(parseInt(countResult.rows[0].count, 10) + 1).padStart(3, '0')}`
		const hasReference = await hasColumn('receipts', 'reference')

		client = await pool.connect()
		await client.query('BEGIN')

		const receiptResult = hasReference
			? await client.query(
					`INSERT INTO receipts (reference, supplier_name, status, created_by)
					 VALUES ($1, $2, 'DRAFT', $3)
					 RETURNING *`,
					[generatedReference, supplier_name, createdBy]
			  )
			: await client.query(
					`INSERT INTO receipts (supplier_name, status, created_by)
					 VALUES ($1, 'DRAFT', $2)
					 RETURNING *`,
					[supplier_name, createdBy]
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
				reference: receipt.reference || generatedReference || formatReference('REC', receipt.id),
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

const updateReceipt = async (req, res) => {
	try {
		const { id } = req.params
		const { supplier_name } = req.body
		const result = await pool.query('UPDATE receipts SET supplier_name = $1 WHERE id = $2 RETURNING *', [supplier_name, id])

		if (result.rowCount === 0) {
			return res.status(404).json({ success: false, message: 'Receipt not found' })
		}

		return res.json({ success: true, data: result.rows[0] })
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

const validateReceipt = async (req, res) => {
	let client
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
			return res.status(400).json({ success: false, message: 'Cannot validate cancelled' })
		}

		const itemsResult = await pool.query('SELECT * FROM receipt_items WHERE receipt_id = $1', [id])
		if (itemsResult.rowCount === 0) {
			return res.status(400).json({ success: false, message: 'Receipt has no items' })
		}

		client = await pool.connect()
		await client.query('BEGIN')

		await client.query("UPDATE receipts SET status = 'DONE' WHERE id = $1", [id])

		for (const item of itemsResult.rows) {
			let locationId = item.location_id || null
			if (!locationId) {
				const fallbackLocation = await client.query('SELECT id FROM locations ORDER BY id ASC LIMIT 1')
				if (fallbackLocation.rowCount === 0) {
					throw new Error('No locations found for receipt validation')
				}
				locationId = fallbackLocation.rows[0].id
			}

			await client.query(
				`INSERT INTO stock_movements
				 (product_id, destination_location, quantity, movement_type)
				 VALUES ($1, $2, $3, 'IN')`,
				[item.product_id, locationId, item.quantity]
			)

			await client.query(
				`INSERT INTO inventory (product_id, location_id, quantity)
				 VALUES ($1, $2, $3)
				 ON CONFLICT (product_id, location_id)
				 DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity`,
				[item.product_id, locationId, item.quantity]
			)
		}

		await client.query('COMMIT')
		return res.json({ success: true, data: { id: receipt.id, status: 'DONE' } })
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

		const result = await pool.query("UPDATE receipts SET status = 'CANCELLED' WHERE id = $1 RETURNING *", [id])
		return res.json({ success: true, data: result.rows[0] })
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
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
