import { logout } from '/js/auth.js'

function initials(name) {
	const value = (name || 'U').trim()
	return value ? value[0].toUpperCase() : 'U'
}

function linksForRole(role) {
	const commonOps = [
		{ label: 'Receipts', href: '/pages/receipts.html' },
		{ label: 'Deliveries', href: '/pages/deliveries.html' },
		{ label: 'Transfers', href: '/pages/move-history.html?type=TRANSFER' }
	]

	if (role === 'admin') {
		return [
			{ label: 'Dashboard', href: '/pages/dashboard-admin.html', key: 'dashboard' },
			{ label: 'Operations', key: 'operations', children: commonOps },
			{ label: 'Stock', href: '/pages/inventory.html', key: 'inventory' },
			{ label: 'Move History', href: '/pages/move-history.html', key: 'moves' },
			{
				label: 'Products',
				key: 'products',
				children: [
					{ label: 'All Products', href: '/pages/products.html' },
					{ label: 'Categories', href: '/pages/products.html#categories' }
				]
			},
			{
				label: 'Settings',
				key: 'settings',
				children: [
					{ label: 'Warehouses', href: '/pages/settings.html' },
					{ label: 'Locations', href: '/pages/settings.html#locations' }
				]
			},
			{
				label: 'Admin',
				key: 'admin',
				children: [{ label: 'Manage Users', href: '/pages/users-admin.html' }]
			}
		]
	}

	return [
		{ label: 'Dashboard', href: '/pages/dashboard-staff.html', key: 'dashboard' },
		{ label: 'Operations', key: 'operations', children: commonOps },
		{ label: 'Stock / Inventory', href: '/pages/inventory.html', key: 'inventory' },
		{ label: 'Move History', href: '/pages/move-history.html', key: 'moves' }
	]
}

function navItem(item, activeKey) {
	if (!item.children) {
		const active = item.key === activeKey ? 'active' : ''
		return `<a class="sidebar-link ${active}" href="${item.href}">${item.label}</a>`
	}

	const children = item.children
		.map((child) => `<a class="sidebar-sublink" href="${child.href}">${child.label}</a>`)
		.join('')
	return `<div class="sidebar-group"><div class="sidebar-group-title">${item.label}</div>${children}</div>`
}

export function renderAppShell({ title, activeKey }) {
	const user = JSON.parse(localStorage.getItem('user') || '{}')
	const role = user.role || 'staff'
	const root = document.getElementById('app')
	const navMarkup = linksForRole(role).map((item) => navItem(item, activeKey)).join('')
	const today = new Date().toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: '2-digit'
	})

	root.innerHTML = `
		<aside class="sidebar">
			<div class="brand">CoreInventory</div>
			<div class="brand-sub">Inventory Management</div>
			<nav class="sidebar-nav">${navMarkup}</nav>
			<div class="sidebar-profile">
				<div class="profile-avatar" id="sidebar-avatar">${initials(user.name)}</div>
				<div class="profile-meta">
					<div id="sidebar-user-name">${user.name || 'User'}</div>
					<div id="sidebar-user-role" class="role-badge role-${role}">${role}</div>
				</div>
				<a class="profile-link" href="#" id="profile-link">My Profile</a>
				<button class="danger-btn" id="logout-btn" type="button">Logout</button>
			</div>
		</aside>
		<section class="page-wrap">
			<header class="page-topbar">
				<div>
					<h1>${title}</h1>
					<div class="muted">${today}</div>
				</div>
				<div class="top-actions">
					<button type="button" class="secondary">Alerts</button>
					<div class="top-user">${user.name || 'User'}</div>
				</div>
			</header>
			<main id="page-content"></main>
		</section>
		<dialog id="profile-modal" class="profile-modal">
			<div class="card">
				<h3>My Profile</h3>
				<p><strong>Name:</strong> ${user.name || '-'}</p>
				<p><strong>Email:</strong> ${user.email || '-'}</p>
				<p><strong>Role:</strong> ${user.role || 'staff'}</p>
				<p><strong>Member Since:</strong> ${user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</p>
				<div class="inline-actions">
					<button type="button" id="close-profile">Close</button>
				</div>
			</div>
		</dialog>
	`

	document.getElementById('logout-btn').addEventListener('click', logout)
	const profileModal = document.getElementById('profile-modal')
	document.getElementById('profile-link').addEventListener('click', (event) => {
		event.preventDefault()
		profileModal.showModal()
	})
	document.getElementById('close-profile').addEventListener('click', () => profileModal.close())

	return document.getElementById('page-content')
}
