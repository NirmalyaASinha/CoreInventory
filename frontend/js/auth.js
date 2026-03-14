export function checkAuth() {
	const token = localStorage.getItem('token')
	if (!token) {
		window.location.href = '/pages/login.html'
		return null
	}
	return JSON.parse(localStorage.getItem('user') || '{}')
}

export function loadUserInfo() {
	const user = checkAuth()
	if (!user) return
	const nameEl = document.getElementById('sidebar-user-name') || document.getElementById('user-name')
	const roleEl = document.getElementById('sidebar-user-role') || document.getElementById('user-role')
	if (nameEl) nameEl.textContent = user.name || '-'
	if (roleEl) roleEl.textContent = user.role || '-'
	return user
}

export function requireAdmin() {
	const user = checkAuth()
	if (!user) return null
	if (user.role !== 'admin') {
		window.location.href = '/pages/dashboard-staff.html'
		return null
	}
	return user
}

export function redirectToRoleDashboard(user) {
	if (!user) return
	if (user.role === 'admin') {
		window.location.href = '/pages/dashboard-admin.html'
		return
	}
	window.location.href = '/pages/dashboard-staff.html'
}

export function logout() {
	localStorage.removeItem('token')
	localStorage.removeItem('user')
	window.location.href = '/pages/login.html'
}
