const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const pool = require('../db')

const otpStore = {}

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  },
  tls: {
    ciphers: 'SSLv3'
  }
})

const register = async (req, res) => {
	try {
		const { name, email, password, role } = req.body

		if (!name || !email || !password || !role) {
			return res.status(400).json({ success: false, message: 'name, email, password and role are required' })
		}

		const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email])
		if (existingUser.rowCount > 0) {
			return res.status(400).json({ success: false, message: 'Email already registered' })
		}

		const passwordHash = await bcrypt.hash(password, 10)

		const result = await pool.query(
			'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
			[name, email, passwordHash, role]
		)

		return res.status(201).json({ success: true, data: result.rows[0] })
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to register user' })
	}
}

const login = async (req, res) => {
	try {
		const { email, password } = req.body

		if (!email || !password) {
			return res.status(400).json({ success: false, message: 'email and password are required' })
		}

		const result = await pool.query(
			'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
			[email]
		)

		if (result.rowCount === 0) {
			return res.status(401).json({ success: false, message: 'Invalid credentials' })
		}

		const user = result.rows[0]
		const isPasswordValid = await bcrypt.compare(password, user.password_hash)

		if (!isPasswordValid) {
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
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to login' })
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

		await transporter.sendMail({
			from: `"CoreInventory" <${process.env.MAIL_USER}>`,
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
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to send OTP' })
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

		return res.json({ success: true, message: 'OTP verified' })
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Failed to verify OTP' })
	}
}

module.exports = {
	register,
	login,
	sendOtp,
	verifyOtp
}
