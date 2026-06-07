// ============================================================
//  Carrito ("Mi maleta de viaje") — estado en localStorage.
//  Compartido por todas las páginas: añade items, sincroniza el
//  badge de la maletita del navbar y emite eventos para la vista
//  del carrito.
//
//  Forma de un item:
//    { slug, nombre, imagen, precio, precioAntes, descuento,
//      fecha, personas, cantidad }
//
//  Cuando se conecte el backend, reemplazar load/save por llamadas
//  a la API manteniendo la misma forma.
// ============================================================

const STORAGE_KEY = 'tpp_cart_v1';

// ---- Lectura / escritura ----
export function getCart() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

function saveCart(items) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
	// Notifica a la página actual (y a otras pestañas vía 'storage').
	document.dispatchEvent(new CustomEvent('cart:change', { detail: { items } }));
}

// ---- Total de unidades (suma de cantidades) ----
export function cartCount(items = getCart()) {
	return items.reduce((acc, it) => acc + (it.cantidad || 1), 0);
}

// ---- Añadir un paquete. Si ya existe (mismo slug+fecha), suma cantidad. ----
export function addToCart(item) {
	const items = getCart();
	const key = (it) => `${it.slug}__${it.fecha || ''}`;
	const existing = items.find((it) => key(it) === key(item));
	if (existing) {
		existing.cantidad = (existing.cantidad || 1) + (item.cantidad || 1);
	} else {
		items.push({ ...item, cantidad: item.cantidad || 1 });
	}
	saveCart(items);
	return items;
}

// ---- Cambiar la cantidad de un item por índice ----
export function setQuantity(index, cantidad) {
	const items = getCart();
	if (items[index]) {
		items[index].cantidad = Math.max(1, cantidad);
		saveCart(items);
	}
	return items;
}

// ---- Eliminar un item por índice ----
export function removeFromCart(index) {
	const items = getCart();
	items.splice(index, 1);
	saveCart(items);
	return items;
}

// ---- Parsea un precio 'S/ 1,234.56' → 1234.56 ----
export function parsePrice(str) {
	if (typeof str === 'number') return str;
	if (!str) return 0;
	const n = parseFloat(String(str).replace(/[^0-9.]/g, ''));
	return isNaN(n) ? 0 : n;
}

// ---- Formatea 1234.5 → 'S/ 1,234.50' ----
export function formatPrice(n) {
	return 'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---- Sincroniza el badge de la maletita del navbar ----
export function syncBadge() {
	const count = cartCount();
	document.querySelectorAll('[data-cart-badge]').forEach((el) => {
		el.textContent = String(count);
		el.classList.toggle('opacity-0', count === 0);
	});
}

// ---- Mini aviso (toast) en la esquina ----
export function toast(message) {
	let host = document.querySelector('[data-toast-host]');
	if (!host) {
		host = document.createElement('div');
		host.setAttribute('data-toast-host', '');
		host.className = 'fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end';
		document.body.appendChild(host);
	}
	const el = document.createElement('div');
	el.className = 'flex items-center gap-2 bg-[#191505] text-white font-body text-[15px] px-5 py-3 rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.3)] translate-y-2 opacity-0 transition-all duration-300';
	el.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#f4b13b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${message}</span>`;
	host.appendChild(el);
	requestAnimationFrame(() => { el.classList.remove('translate-y-2', 'opacity-0'); });
	setTimeout(() => {
		el.classList.add('translate-y-2', 'opacity-0');
		setTimeout(() => el.remove(), 300);
	}, 2200);
}

// ---- Inicialización común: sincroniza badge al cargar y en cada cambio ----
export function initCart() {
	syncBadge();
	document.addEventListener('cart:change', syncBadge);
	window.addEventListener('storage', (e) => { if (e.key === STORAGE_KEY) syncBadge(); });
}
