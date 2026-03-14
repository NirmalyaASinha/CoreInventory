const pool = require('../db')

const getDashboard = async (req, res) => {
	try {
		const [
			totalProductsResult,
			lowStockResult,
			outOfStockResult,
			pendingReceiptsResult,
			pendingDeliveriesResult,
			transfersScheduledResult
		] = await Promise.all([
			pool.query('SELECT COUNT(*) FROM products'),
			pool.query(
				`SELECT COUNT(*) FROM products p
				 JOIN inventory i ON p.id = i.product_id
				 WHERE i.quantity <= p.reorder_level AND i.quantity > 0`
			),
			pool.query('SELECT COUNT(*) FROM inventory WHERE quantity = 0'),
			pool.query("SELECT COUNT(*) FROM receipts WHERE status IN ('DRAFT','WAITING','READY')"),
			pool.query("SELECT COUNT(*) FROM deliveries WHERE status IN ('DRAFT','WAITING','READY')"),
			pool.query("SELECT COUNT(*) FROM transfers WHERE status IN ('DRAFT','WAITING','READY')")
		])

		return res.json({
			success: true,
			data: {
				totalProducts: parseInt(totalProductsResult.rows[0].count, 10),
				lowStock: parseInt(lowStockResult.rows[0].count, 10),
				outOfStock: parseInt(outOfStockResult.rows[0].count, 10),
				pendingReceipts: parseInt(pendingReceiptsResult.rows[0].count, 10),
				pendingDeliveries: parseInt(pendingDeliveriesResult.rows[0].count, 10),
				transfersScheduled: parseInt(transfersScheduledResult.rows[0].count, 10)
			}
		})
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

module.exports = {
	getDashboard
}
