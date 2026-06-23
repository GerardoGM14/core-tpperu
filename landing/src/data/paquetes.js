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

// --- Fotos reales de cada paquete (assets/paquetes/<slug>/) ---
// Astro optimiza estos imports; usamos .src para tener la ruta string
// (la landing consume `imagen`/`galeria` como strings: <img src>, data-*, etc.)
import lagunaAzulPortada from '../assets/paquetes/tarapoto-laguna-azul-7d6n/portada.jpg';
import lagunaAzulG1 from '../assets/paquetes/tarapoto-laguna-azul-7d6n/galeria-1.jpg';
import lagunaAzulG2 from '../assets/paquetes/tarapoto-laguna-azul-7d6n/galeria-2.jpg';
import lagunaAzulG3 from '../assets/paquetes/tarapoto-laguna-azul-7d6n/galeria-3.jpg';

import ahuashiyacuPortada from '../assets/paquetes/cataratas-ahuashiyacu-4d3n/portada.jpg';
import ahuashiyacuG1 from '../assets/paquetes/cataratas-ahuashiyacu-4d3n/galeria-1.jpg';
import ahuashiyacuG2 from '../assets/paquetes/cataratas-ahuashiyacu-4d3n/galeria-2.jpg';
import ahuashiyacuG3 from '../assets/paquetes/cataratas-ahuashiyacu-4d3n/galeria-3.jpg';
import ahuashiyacuG4 from '../assets/paquetes/cataratas-ahuashiyacu-4d3n/galeria-4.jpg';

import altoMayoPortada from '../assets/paquetes/alto-mayo-moyobamba-rioja-5d4n/portada.jpg';
import altoMayoG1 from '../assets/paquetes/alto-mayo-moyobamba-rioja-5d4n/galeria-1.jpg';
import altoMayoG2 from '../assets/paquetes/alto-mayo-moyobamba-rioja-5d4n/galeria-2.jpg';
import altoMayoG3 from '../assets/paquetes/alto-mayo-moyobamba-rioja-5d4n/galeria-3.jpg';
import altoMayoG4 from '../assets/paquetes/alto-mayo-moyobamba-rioja-5d4n/galeria-4.jpg';
import altoMayoG5 from '../assets/paquetes/alto-mayo-moyobamba-rioja-5d4n/galeria-5.jpg';

import lamasPortada from '../assets/paquetes/lamas-nativa-castillo-3d2n/portada.jpg';
import lamasG1 from '../assets/paquetes/lamas-nativa-castillo-3d2n/galeria-1.jpg';
import lamasG2 from '../assets/paquetes/lamas-nativa-castillo-3d2n/galeria-2.jpg';
import lamasG3 from '../assets/paquetes/lamas-nativa-castillo-3d2n/galeria-3.jpg';
import lamasG4 from '../assets/paquetes/lamas-nativa-castillo-3d2n/galeria-4.jpg';
import lamasG5 from '../assets/paquetes/lamas-nativa-castillo-3d2n/galeria-5.jpg';

import puntaCanaPortada from '../assets/paquetes/punta-cana-6d5n/portada.jpg';
import puntaCanaG1 from '../assets/paquetes/punta-cana-6d5n/galeria-1.jpg';
import puntaCanaG2 from '../assets/paquetes/punta-cana-6d5n/galeria-2.jpg';
import puntaCanaG3 from '../assets/paquetes/punta-cana-6d5n/galeria-3.jpg';
import puntaCanaG4 from '../assets/paquetes/punta-cana-6d5n/galeria-4.jpg';

import sauceResortPortada from '../assets/paquetes/tarapoto-sauce-resort-4d3n/portada.jpg';
import sauceResortG1 from '../assets/paquetes/tarapoto-sauce-resort-4d3n/galeria-1.jpg';
import sauceResortG2 from '../assets/paquetes/tarapoto-sauce-resort-4d3n/galeria-2.jpg';
import sauceResortG3 from '../assets/paquetes/tarapoto-sauce-resort-4d3n/galeria-3.jpg';
import sauceResortG4 from '../assets/paquetes/tarapoto-sauce-resort-4d3n/galeria-4.jpg';
import sauceResortG5 from '../assets/paquetes/tarapoto-sauce-resort-4d3n/galeria-5.jpg';

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

export const paquetes = [
	{
		slug: 'tarapoto-laguna-azul-7d6n',
		nombre: 'Tarapoto 7D/6N con noche en Laguna Azul',
		categoria: 'TARAPOTO ECONÓMICO',
		precio: 'S/ 589.00',
		precioAntes: 'S/ 829.00',
		descuento: '-45%',
		tag: 'Imperdibles',
		imagen: lagunaAzulPortada.src,
		galeria: [lagunaAzulG1.src, lagunaAzulG2.src, lagunaAzulG3.src],
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
		imagen: ahuashiyacuPortada.src,
		galeria: [ahuashiyacuG1.src, ahuashiyacuG2.src, ahuashiyacuG3.src, ahuashiyacuG4.src],
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
		imagen: altoMayoPortada.src,
		galeria: [altoMayoG1.src, altoMayoG2.src, altoMayoG3.src, altoMayoG4.src, altoMayoG5.src],
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
		imagen: lamasPortada.src,
		galeria: [lamasG1.src, lamasG2.src, lamasG3.src, lamasG4.src, lamasG5.src],
		incluye: INCLUYE_DEMO,
	},
	{
		slug: 'punta-cana-6d5n',
		nombre: 'Paquete Punta Cana 6D/5N todo incluido',
		categoria: 'INTERNACIONAL',
		precio: 'S/ 2,999.00',
		precioAntes: 'S/ 3,800.00',
		descuento: '-21%',
		tag: 'Nuevo',
		imagen: puntaCanaPortada.src,
		galeria: [puntaCanaG1.src, puntaCanaG2.src, puntaCanaG3.src, puntaCanaG4.src],
		incluye: INCLUYE_DEMO,
	},
	{
		slug: 'tarapoto-sauce-resort-4d3n',
		nombre: 'Paquete Tarapoto 4D/3N con una noche en Sauce Resort',
		categoria: 'TARAPOTO',
		precio: 'S/ 749.00',
		precioAntes: 'S/ 980.00',
		descuento: '-24%',
		tag: 'Cyber',
		imagen: sauceResortPortada.src,
		galeria: [sauceResortG1.src, sauceResortG2.src, sauceResortG3.src, sauceResortG4.src, sauceResortG5.src],
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
