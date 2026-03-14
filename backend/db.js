const { Pool } = require('pg')

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: { rejectUnauthorized: false }
})

pool
	.connect()
	.then((client) => {
		console.log('Database connected successfully')
		client.release()
	})
	.catch((error) => {
		console.error('Database connection failed:', error.message)
	})

module.exports = pool
