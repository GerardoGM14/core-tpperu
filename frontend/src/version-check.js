// ============================================================
//  Detección de nueva versión desplegada.
//  Vite genera el bundle principal con un hash en el nombre que cambia
//  en cada build. Periódicamente leemos el index.html del servidor y, si
//  el hash del bundle cambió respecto al que está corriendo, avisamos al
//  usuario para que recargue (y así ve la última versión tras un deploy).
// ============================================================

const CHECK_INTERVAL = 2 * 60 * 1000; // cada 2 minutos

// Extrae el src del primer <script type="module"> del HTML (el bundle de entrada).
function bundleFromHtml(html) {
  const m = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/i)
    || html.match(/<script[^>]+src="([^"]+)"[^>]+type="module"/i);
  return m ? m[1] : null;
}

// El bundle que está corriendo ahora mismo (el script de entrada de esta página).
function currentBundle() {
  const el = [...document.querySelectorAll('script[type="module"][src]')]
    .find((s) => /\/app\/assets\/index-.*\.js/.test(s.src) || /index-.*\.js/.test(s.src));
  if (!el) return null;
  try { return new URL(el.src).pathname; } catch { return el.getAttribute('src'); }
}

let bannerShown = false;
function showUpdateBanner() {
  if (bannerShown) return;
  bannerShown = true;
  const bar = document.createElement('div');
  bar.setAttribute('role', 'alert');
  bar.style.cssText = [
    'position:fixed', 'left:50%', 'bottom:24px', 'transform:translateX(-50%)',
    'z-index:99999', 'background:#191505', 'color:#f3f2ed',
    'padding:12px 16px', 'border-radius:10px', 'display:flex', 'gap:12px',
    'align-items:center', 'box-shadow:0 8px 30px rgba(0,0,0,0.35)',
    'font:500 13px/1.3 system-ui,Segoe UI,Arial,sans-serif', 'max-width:92vw',
  ].join(';');
  bar.innerHTML = '<span>Hay una nueva versión disponible.</span>';
  const btn = document.createElement('button');
  btn.textContent = 'Actualizar';
  btn.style.cssText = 'background:#bc8029;color:#fff;border:0;border-radius:7px;padding:7px 14px;font-weight:600;cursor:pointer';
  btn.onclick = () => window.location.reload(true);
  bar.appendChild(btn);
  document.body.appendChild(bar);
}

async function check() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}index.html?_v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const html = await res.text();
    const latest = bundleFromHtml(html);
    const current = currentBundle();
    if (latest && current) {
      const latestName = latest.split('/').pop();
      const currentName = current.split('/').pop();
      if (latestName !== currentName) showUpdateBanner();
    }
  } catch {
    // sin red o error: ignorar, se reintenta en el próximo ciclo
  }
}

export function startVersionCheck() {
  // En dev no hay bundles con hash; solo corre en producción (build).
  if (import.meta.env.DEV) return;
  setInterval(check, CHECK_INTERVAL);
  // Revisa también al volver a la pestaña (tras tenerla en segundo plano).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
}
