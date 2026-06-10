// ============================================================
//  Datos centrales de paquetes — fuente única para el index y la
//  vista de detalle (/paquetes/[slug]).
//
//  EDITA AQUÍ tus datos reales. Cuando conectes el backend, este
//  archivo se reemplaza por un fetch que devuelva la misma forma.
//
//  Campos:
//    slug         → identificador para la URL (/paquetes/<slug>). Único.
//    nombre       → título del paquete
//    categoria    → para el breadcrumb "Paquetes > <categoria>"
//    precio       → precio actual (ej. 'S/ 589.00')
//    precioAntes  → precio tachado
//    descuento    → badge rojo (ej. '-45%') o null
//    tag          → etiqueta de esquina: 'Imperdibles' | 'Nuevo' | 'Cyber'
//    imagen       → foto de la card (URL o ruta /src para Image)
//    galeria      → fotos de la galería de miniaturas del detalle
//    incluye      → bullets de "¿Qué incluye en el paquete?"
// ============================================================

// Clases de color del tag de esquina según tipo.
export const TAG_CLASES = {
	Imperdibles: 'bg-[#f26304] text-white',
	Nuevo: 'bg-[#f4b13b] text-[#121110]',
	Cyber: 'bg-[#cc140d] text-white',
};

// Lista de "qué incluye" de ejemplo (compartida por ahora).
const INCLUYE_DEMO = [
	'Recogemos del Aeropuerto de Tarapoto al hotel ida y vuelta',
	'04 noches de Hotel Boutique Kovakii (Piscina y Aire acondicionado)',
	'4 días de Desayunos',
	'3 días de Almuerzos',
	'Tours Laguna Azul - Sauce',
	'Tours Alto Mayo - Moyobamba y Rioja',
	'Tours Cascadas de Carpishuyacu',
	'Tours Lamas Nativa - Castillo',
	'Tours Cataratas de Ahuashiyacu',
	'Entradas, guía y más',
];

// Galería de ejemplo (compartida por ahora).
const GALERIA_DEMO = [
	'https://images.unsplash.com/photo-1531168556467-80aace0d0144?w=600&q=80',
	'https://images.unsplash.com/photo-1437846972679-9e6e537be46e?w=600&q=80',
	'https://images.unsplash.com/photo-1518182170546-07661fd94144?w=600&q=80',
	'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=600&q=80',
	'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600&q=80',
	'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600&q=80',
];

export const paquetes = [
	{
		slug: 'tarapoto-laguna-azul-7d6n',
		nombre: 'Tarapoto 7D/6N con noche en Laguna Azul',
		categoria: 'TARAPOTO ECONÓMICO',
		precio: 'S/ 589.00',
		precioAntes: 'S/ 829.00',
		descuento: '-45%',
		tag: 'Imperdibles',
		imagen: 'https://images.unsplash.com/photo-1531168556467-80aace0d0144?w=500&q=80',
		galeria: GALERIA_DEMO,
		incluye: INCLUYE_DEMO,
	},
	{
		slug: 'cataratas-ahuashiyacu-4d3n',
		nombre: 'Cataratas de Ahuashiyacu 4D/3N full aventura',
		categoria: 'TARAPOTO',
		precio: 'S/ 749.00',
		precioAntes: 'S/ 980.00',
		descuento: '-24%',
		tag: 'Nuevo',
		imagen: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=500&q=80',
		galeria: GALERIA_DEMO,
		incluye: INCLUYE_DEMO,
	},
	{
		slug: 'alto-mayo-moyobamba-rioja-5d4n',
		nombre: 'Alto Mayo: Moyobamba y Rioja 5D/4N',
		categoria: 'TARAPOTO',
		precio: 'S/ 920.00',
		precioAntes: 'S/ 1,150.00',
		descuento: '-20%',
		tag: 'Cyber',
		imagen: 'https://images.unsplash.com/photo-1437846972679-9e6e537be46e?w=500&q=80',
		galeria: GALERIA_DEMO,
		incluye: INCLUYE_DEMO,
	},
	{
		slug: 'lamas-nativa-castillo-3d2n',
		nombre: 'Lamas Nativa y Castillo 3D/2N cultural',
		categoria: 'TARAPOTO ECONÓMICO',
		precio: 'S/ 459.00',
		precioAntes: 'S/ 620.00',
		descuento: '-26%',
		tag: 'Imperdibles',
		imagen: 'https://images.unsplash.com/photo-1518182170546-07661fd94144?w=500&q=80',
		galeria: GALERIA_DEMO,
		incluye: INCLUYE_DEMO,
	},
	{
		slug: 'sauce-laguna-azul-2d1n',
		nombre: 'Sauce y Laguna Azul 2D/1N escapada',
		categoria: 'TARAPOTO ECONÓMICO',
		precio: 'S/ 299.00',
		precioAntes: 'S/ 420.00',
		descuento: '-29%',
		tag: 'Nuevo',
		imagen: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=500&q=80',
		galeria: GALERIA_DEMO,
		incluye: INCLUYE_DEMO,
	},
	{
		slug: 'cancun-playa-del-carmen-6d5n',
		nombre: 'Cancún y Playa del Carmen 6D/5N todo incluido',
		categoria: 'INTERNACIONAL',
		precio: 'S/ 4,890.00',
		precioAntes: 'S/ 6,200.00',
		descuento: '-21%',
		tag: 'Cyber',
		imagen: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=500&q=80',
		galeria: GALERIA_DEMO,
		incluye: INCLUYE_DEMO,
	},
];

// Devuelve la clase de color del tag (con fallback a naranja).
export function tagClase(tag) {
	return TAG_CLASES[tag] ?? TAG_CLASES.Imperdibles;
}

// ============================================================
//  Conexión con el backend.
//  getPaquetes() intenta traer los paquetes reales de la API; si el
//  backend no responde (build sin API, caído, etc.), usa el array `paquetes`
//  de arriba como respaldo, así la landing nunca se rompe.
// ============================================================
const API = import.meta.env.PUBLIC_API_URL || '';

export async function getPaquetes() {
	if (!API) return paquetes;
	try {
		const res = await fetch(`${API}/api/public/packages`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = await res.json();
		return Array.isArray(data) && data.length ? data : paquetes;
	} catch (err) {
		console.warn('[paquetes] backend no disponible, usando datos locales:', err.message);
		return paquetes;
	}
}

export async function getPaquetePorSlug(slug) {
	const todos = await getPaquetes();
	return todos.find((p) => p.slug === slug) ?? null;
}
