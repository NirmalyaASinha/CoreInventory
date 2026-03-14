const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
const API_ORIGIN = isLocalHost ? 'http://localhost:5000' : 'https://coreinventory-bjqx.onrender.com'
const API_URL = API_ORIGIN + '/api'

function getToken() {
	return localStorage.getItem('token')
}

function getHeaders() {
	return {
		'Content-Type': 'application/json',
		Authorization: 'Bearer ' + getToken()
	}
}

async function apiFetch(endpoint, options = {}) {
	const res = await fetch(API_URL + endpoint, {
		...options,
		headers: {
			...getHeaders(),
			...(options.headers || {})
		}
	})

	let data
	try {
		data = await res.json()
	} catch (err) {
		data = { success: false, message: 'Invalid server response' }
	}

	if (res.status === 401) {
		localStorage.removeItem('token')
		localStorage.removeItem('user')
		window.location.href = '/pages/login.html'
		return
	}

	return data
}

export const api = {
	register: (body) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
	login: (body) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
	sendOtp: (body) => apiFetch('/auth/otp/send', { method: 'POST', body: JSON.stringify(body) }),
	verifyOtp: (body) => apiFetch('/auth/otp/verify', { method: 'POST', body: JSON.stringify(body) }),

	getDashboard: () => apiFetch('/dashboard'),

	getProducts: () => apiFetch('/products'),
	getProduct: (id) => apiFetch('/products/' + id),
	createProduct: (body) => apiFetch('/products', { method: 'POST', body: JSON.stringify(body) }),
	updateProduct: (id, body) => apiFetch('/products/' + id, { method: 'PATCH', body: JSON.stringify(body) }),
	getProductStock: (id) => apiFetch('/products/' + id + '/stock'),

	getCategories: () => apiFetch('/categories'),
	createCategory: (body) => apiFetch('/categories', { method: 'POST', body: JSON.stringify(body) }),

	getReceipts: (status) => apiFetch('/receipts' + (status ? '?status=' + status : '')),
	getReceipt: (id) => apiFetch('/receipts/' + id),
	createReceipt: (body) => apiFetch('/receipts', { method: 'POST', body: JSON.stringify(body) }),
	validateReceipt: (id) => apiFetch('/receipts/' + id + '/validate', { method: 'POST' }),
	cancelReceipt: (id) => apiFetch('/receipts/' + id + '/cancel', { method: 'POST' }),

	getDeliveries: (status) => apiFetch('/deliveries' + (status ? '?status=' + status : '')),
	getDelivery: (id) => apiFetch('/deliveries/' + id),
	createDelivery: (body) => apiFetch('/deliveries', { method: 'POST', body: JSON.stringify(body) }),
	validateDelivery: (id) => apiFetch('/deliveries/' + id + '/validate', { method: 'POST' }),
	cancelDelivery: (id) => apiFetch('/deliveries/' + id + '/cancel', { method: 'POST' }),

	getTransfers: (status) => apiFetch('/transfers' + (status ? '?status=' + status : '')),
	getTransfer: (id) => apiFetch('/transfers/' + id),
	createTransfer: (body) => apiFetch('/transfers', { method: 'POST', body: JSON.stringify(body) }),
	validateTransfer: (id) => apiFetch('/transfers/' + id + '/validate', { method: 'POST' }),
	cancelTransfer: (id) => apiFetch('/transfers/' + id + '/cancel', { method: 'POST' }),

	getInventory: (filters) => apiFetch('/inventory' + (filters ? '?' + new URLSearchParams(filters).toString() : '')),
	adjustInventory: (body) => apiFetch('/inventory/adjust', { method: 'POST', body: JSON.stringify(body) }),

	getMoves: (filters) => apiFetch('/moves' + (filters ? '?' + new URLSearchParams(filters).toString() : '')),

	getWarehouses: () => apiFetch('/warehouses'),
	createWarehouse: (body) => apiFetch('/warehouses', { method: 'POST', body: JSON.stringify(body) }),
	getLocations: (warehouseId) => apiFetch('/warehouses/' + warehouseId + '/locations'),
	createLocation: (warehouseId, body) => apiFetch('/warehouses/' + warehouseId + '/locations', { method: 'POST', body: JSON.stringify(body) })
	,
	getUsers: async () => {
		const res = await fetch(API_ORIGIN + '/test-users', {
			headers: getHeaders()
		})
		const data = await res.json()
		if (res.status === 401) {
			localStorage.removeItem('token')
			localStorage.removeItem('user')
			window.location.href = '/pages/login.html'
			return
		}
		if (Array.isArray(data)) {
			return { success: true, data, total: data.length }
		}
		return data
	}
}
