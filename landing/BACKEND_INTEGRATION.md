# Conexión de la landing con el backend TPP

> Guía para reemplazar los datos estáticos (`src/data/paquetes.js`) por datos
> reales del backend NestJS, sin tocar el diseño.

## Endpoints disponibles (públicos, sin auth)

El backend expone estos endpoints en `VITE`/`PUBLIC_API_URL` (en dev: `http://localhost:4000`):

| Método | Ruta | Devuelve |
|---|---|---|
| GET | `/api/public/packages` | Array de paquetes ACTIVOS |
| GET | `/api/public/packages/:slug` | Un paquete por slug (404 si no existe) |

### Forma de cada paquete (idéntica a `paquetes.js`)

```json
{
  "slug": "tarapoto-laguna-azul-7d6n",
  "nombre": "Tarapoto 7D/6N con noche en Laguna Azul",
  "categoria": "TARAPOTO ECONÓMICO",
  "precio": "S/ 589.00",
  "precioAntes": "S/ 829.00",
  "descuento": "-45%",
  "tag": "Imperdibles",
  "imagen": "https://...",
  "galeria": ["https://...", "..."],
  "incluye": ["Recogemos del Aeropuerto...", "..."]
}
```

Es **exactamente** la forma que ya usa `src/data/paquetes.js`, por diseño.

## Cómo conectar (Astro es estático → fetch en build time)

La landing usa `getStaticPaths()`, así que el fetch ocurre cuando corres
`npm run build` (no en el navegador del visitante). Eso es bueno: la landing
sigue siendo estática y rápida.

### 1. Variable de entorno

Crea `.env` en `landing/`:
```
PUBLIC_API_URL=http://localhost:4000
```
(en producción: `https://api.tppperu.com`)

### 2. Reemplazar `src/data/paquetes.js`

Cambia el array hardcodeado por un fetch. El resto del archivo
(`TAG_CLASES`, `tagClase`) se queda igual:

```js
const API = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

export async function getPaquetes() {
  const res = await fetch(`${API}/api/public/packages`);
  if (!res.ok) throw new Error('No se pudieron cargar los paquetes');
  return res.json();
}
```

### 3. En `index.astro` y `[slug].astro`

```astro
---
import { getPaquetes } from '../data/paquetes.js';
const paquetes = await getPaquetes();   // top-level await: corre en build
---
```

En `[slug].astro`, `getStaticPaths` debe ser async:

```js
export async function getStaticPaths() {
  const paquetes = await getPaquetes();
  return paquetes.map((paquete) => ({
    params: { slug: paquete.slug },
    props: { paquete },
  }));
}
```

### 4. Re-deploy cuando cambien los paquetes

Como es estático, al editar un paquete en el panel hay que **rebuild** de la
landing (`npm run build` + `firebase deploy`) para que el cambio se vea.
Si quieres que sea instantáneo, habría que pasar la landing a SSR — pero para
un catálogo que cambia poco, SSG + rebuild es lo correcto.

## Formulario de contacto (LISTO ✅)

El `ContactForm.astro` (nombre, teléfono, mensaje) se conecta a:

```
POST /api/public/leads
```

### Qué hace el backend con un lead
1. Normaliza el teléfono a E.164 (acepta "987654321", "+51 987...", etc.)
2. Crea/actualiza el Cliente (tag `lead-landing`)
3. Abre una Conversación en el panel de WhatsApp
4. **Envía un WhatsApp de bienvenida automático** al número del lead
   (si la sesión de WhatsApp está conectada)

### Request

```json
{
  "name": "María Quispe",
  "phone": "987654321",
  "message": "Me interesa Tarapoto 7D/6N para 2 personas",
  "packageSlug": "tarapoto-laguna-azul-7d6n"   // opcional
}
```

`name` (min 2) y `phone` (min 6) son obligatorios. `message` y `packageSlug`
son opcionales.

### Response

```json
{ "ok": true, "customerId": "...", "conversationId": "...", "welcomeSent": true }
```

### Cómo conectar el ContactForm.astro

El form es estático; hay que manejarlo con JS del lado cliente (el visitante
envía el form en runtime, no en build). Añade un `<script>` al componente:

```js
const API = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

document.querySelector('form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const payload = {
    name: f.querySelector('input[type=text]').value,
    phone: f.querySelector('input[type=tel]').value,
    message: f.querySelector('textarea').value,
  };
  const res = await fetch(`${API}/api/public/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res.ok) {
    // mostrar "¡Gracias! Te contactaremos pronto" y limpiar el form
    f.reset();
  } else {
    // mostrar error
  }
});
```

> Nota: este `<script>` corre en el navegador del visitante, así que necesita
> que el backend (`api.tppperu.com`) tenga CORS abierto para `/api/public/*`.
> Ya está configurado: el endpoint público acepta cualquier origen.

---
_Backend verificado:_
- `GET /api/public/packages` → 6 paquetes
- `POST /api/public/leads` → crea cliente + conversación + WhatsApp de bienvenida (`welcomeSent: true`)
