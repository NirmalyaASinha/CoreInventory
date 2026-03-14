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
				totalProducts: Number(totalProductsResult.rows[0].count),
				lowStock: Number(lowStockResult.rows[0].count),
				outOfStock: Number(outOfStockResult.rows[0].count),
				pendingReceipts: Number(pendingReceiptsResult.rows[0].count),
				pendingDeliveries: Number(pendingDeliveriesResult.rows[0].count),
				transfersScheduled: Number(transfersScheduledResult.rows[0].count)
			}
		})
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' })
	}
}

module.exports = {
	getDashboard
}
