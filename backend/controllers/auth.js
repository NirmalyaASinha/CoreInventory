const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const sgMail = require('@sendgrid/mail')
const pool = require('../db')

const otpStore = {}

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const register = async (req, res) => {
	try {
		// check Authorization header
		const authHeader = req.headers.authorization
		if (!authHeader) {
			return res.status(403).json({
				success: false,
				message: 'Registration is disabled. Contact your admin to create an account.'
			})
		}

		// if token provided, verify it and check admin role
		const token = authHeader.split(' ')[1]
		let decoded
		try {
			decoded = jwt.verify(token, process.env.JWT_SECRET)
		} catch (e) {
			return res.status(401).json({ success: false, message: 'Invalid token' })
		}

		if (decoded.role !== 'admin') {
			return res.status(403).json({
				success: false,
				message: 'Only admin can create new users'
			})
		}

		const { name, login_id: loginId, email, password, role } = req.body
		const resolvedName = (name || loginId || '').trim()
		const resolvedRole = role || 'staff'

		if (!resolvedName || !email || !password) {
			return res.status(400).json({ success: false, message: 'name, email and password are required' })
		}

		const existingUser = await pool.query(
			'SELECT id FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(name) = LOWER($2)',
			[email, resolvedName]
		)
		if (existingUser.rowCount > 0) {
			return res.status(400).json({ success: false, message: 'Email or login name already registered' })
		}

		const passwordHash = await bcrypt.hash(password, 10)

		const result = await pool.query(
			'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
			[resolvedName, email, passwordHash, resolvedRole]
		)

		return res.status(201).json({ success: true, data: result.rows[0] })
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

const login = async (req, res) => {
	try {
		const { email, login_id: loginId, password } = req.body
		const identifier = (email || loginId || '').trim()

		if (!identifier || !password) {
			return res.status(400).json({ success: false, message: 'email/login and password are required' })
		}

		const result = await pool.query(
			'SELECT id, name, email, password_hash, role FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(name) = LOWER($1) ORDER BY id DESC',
			[identifier]
		)

		if (result.rowCount === 0) {
			return res.status(401).json({ success: false, message: 'Invalid credentials' })
		}

		let user = null
		for (const candidate of result.rows) {
			const matches = await bcrypt.compare(password, candidate.password_hash)
			if (matches) {
				user = candidate
				break
			}
		}

		if (!user) {
			return res.status(401).json({ success: false, message: 'Invalid credentials' })
		}

		const token = jwt.sign(
			{ id: user.id, email: user.email, role: user.role },
			process.env.JWT_SECRET,
			{ expiresIn: process.env.JWT_EXPIRES_IN }
		)

		return res.json({
			success: true,
			data: {
				token,
				user: {
					id: user.id,
					name: user.name,
					email: user.email,
					role: user.role
				}
			}
		})
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

const sendOtp = async (req, res) => {
	try {
		const { email } = req.body

		if (!email) {
			return res.status(400).json({ success: false, message: 'email is required' })
		}

		const otp = Math.floor(100000 + Math.random() * 900000).toString()
		const expirySeconds = Number(process.env.OTP_EXPIRY || 300)
		const expiresAt = Date.now() + expirySeconds * 1000

		otpStore[email] = { otp, expiresAt }

		await sgMail.send({
			from: process.env.SENDGRID_FROM_EMAIL,
			to: email,
			subject: 'Your CoreInventory OTP Code',
			html: `
				<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:8px">
					<h2 style="color:#1d4ed8;margin-bottom:8px">CoreInventory</h2>
					<p style="color:#374151">Use the OTP below to verify your identity. It expires in <strong>${Math.floor(expirySeconds / 60)} minutes</strong>.</p>
					<div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#111827;text-align:center;padding:24px 0">${otp}</div>
					<p style="color:#6b7280;font-size:13px">If you did not request this, please ignore this email.</p>
				</div>`
		})

		return res.json({ success: true, data: { message: 'OTP sent to ' + email } })
	} catch (err) {
		console.error('Send OTP error:', err.response?.body || err.message)
		return res.status(500).json({ success: false, message: err.message })
	}
}

const verifyOtp = async (req, res) => {
	try {
		const { email, otp } = req.body

		if (!email || !otp) {
			return res.status(400).json({ success: false, message: 'Invalid or expired OTP' })
		}

		const record = otpStore[email]
		const isValid = record && record.otp === otp && Date.now() <= record.expiresAt

		if (!isValid) {
			return res.status(400).json({ success: false, message: 'Invalid or expired OTP' })
		}

		delete otpStore[email]

		return res.json({ success: true, data: { message: 'OTP verified' } })
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

const getUsers = async (req, res) => {
	try {
		if (req.user.role !== 'admin') {
			return res.status(403).json({
				success: false,
				message: 'Only admin can view all users'
			})
		}

		const result = await pool.query(
			`SELECT id, name, email, role, created_at
		   FROM users
		   ORDER BY created_at DESC`
		)

		return res.json({
			success: true,
			data: result.rows,
			total: result.rowCount
		})
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message })
	}
}

module.exports = {
	register,
	login,
	sendOtp,
	verifyOtp,
	getUsers
}
