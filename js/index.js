// /js/index.js
import { getVistos, setVistos, getPause, setPause } from "./lib/vistos.js";

/* =============== CONFIG =============== */
const MAX_HOME = 10; // máximo por sección
const DESTACADOS = { ps4:[], switch:[], ps5:[], ps3:[], pc:[] };

/* =============== HELPERS =============== */
const money = (n=0) => new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN"}).format(+n||0);

// Rutas válidas en / y en /paginas/ (GitHub Pages)
const ROOT = location.pathname.includes("/paginas/") ? ".." : ".";
const imgFrom = (p) => `${ROOT}/imagenes/index/${String(p.plataforma).toLowerCase()}/${p.slug}.webp`;

// URL de detalle canónica
const hrefProducto = (p) => {
  const qs = new URLSearchParams({ slug: p.slug, plataforma: String(p.plataforma).toLowerCase() });
  return `${ROOT}/paginas/producto.html?${qs.toString()}`;
};

// Catálogo (JSON)
async function cargarCatalogo(){
  const url = `${ROOT}/js/data/catalogo.json`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("No se pudo cargar catálogo");
  return await r.json();
}

/* =============== CARRUSEL =============== */
function initCarousel(root) {
  const viewport = root.querySelector("[data-carousel-viewport]");
  const track    = root.querySelector("[data-carousel-track]");
  const prev     = root.querySelector("[data-carousel-prev]");
  const next     = root.querySelector("[data-carousel-next]");
  if (!viewport || !track) return;

  const gap  = () => parseFloat(getComputedStyle(track).gap || 0) || 0;
  const step = () => (track.querySelector(".card")?.getBoundingClientRect().width || 260) + gap();

  prev?.addEventListener("click", e => { e.preventDefault(); viewport.scrollBy({ left: -step()*2, behavior: "smooth" }); });
  next?.addEventListener("click", e => { e.preventDefault(); viewport.scrollBy({ left:  step()*2, behavior: "smooth" }); });

  // drag táctil
  let down=false, startX=0, startScroll=0;
  viewport.addEventListener("pointerdown", (e)=>{ if(e.pointerType!=="touch")return;
    down=true; startX=e.clientX; startScroll=viewport.scrollLeft; viewport.setPointerCapture(e.pointerId); });
  viewport.addEventListener("pointermove", (e)=>{ if(!down)return; viewport.scrollLeft = startScroll - (e.clientX-startX); });
  ["pointerup","pointerleave"].forEach(ev=>viewport.addEventListener(ev,()=>{down=false;}));

  // asegura navegación en desktop
  track.addEventListener("click", (e)=>{
    const a = e.target.closest("a[href]");
    if (!a) return;
    if (e.ctrlKey || e.metaKey || e.button===1) return;
    window.location.href = a.href;
  });
}

/* =============== RENDER CARDS =============== */
const card = (p) => `
  <article class="card border-0 shadow-sm" style="min-width:220px;max-width:260px;">
    <a href="${hrefProducto(p)}" class="d-block" target="_self" rel="noopener">
      <div class="ratio ratio-3x4">
        <img src="${imgFrom(p)}" class="w-100 h-100 object-fit-cover object-position-top rounded-top" alt="${p.titulo}" loading="lazy">
      </div>
    </a>
    <div class="card-body text-center">
      <h3 class="h6 mb-2">
        <a href="${hrefProducto(p)}" class="text-decoration-none" target="_self" rel="noopener">${p.titulo}</a>
      </h3>
      <p class="mb-0 fw-semibold">${money(p.precio)}</p>
    </div>
  </article>
`;

/* =============== VISTOS RECIENTES =============== */
function renderRecientes(){
  const cont = document.querySelector("[data-recent-list]");
  if (!cont) return;

  // reconstruye imagen si algún registro viejo no la tiene
  const imgFromHref = (href) => {
    try {
      const u = new URL(href, location.origin);
      const sp = new URLSearchParams(u.search);
      const plat = (sp.get("plataforma") || "").toLowerCase();
      const slug = sp.get("slug") || "";
      return (plat && slug) ? `${ROOT}/imagenes/index/${plat}/${slug}.webp` : "";
    } catch { return ""; }
  };

  const vistos = getVistos();
  if (!vistos.length){
    cont.className = "recent-grid";
    cont.innerHTML = `<span class="text-muted">Aún no tienes vistos.</span>`;
    updateRecButtons(); return;
  }

  cont.className = "recent-grid";
  cont.innerHTML = vistos.map(v => {
    const img = v.img && v.img.trim() ? v.img : imgFromHref(v.href);
    return `
      <a href="${v.href}" class="text-decoration-none">
        <div class="recent-card">
          <img src="${img}" alt="${v.title}">
          <div>
            <div class="recent-title">${v.title}</div>
            <div class="recent-date">${new Date(v.ts).toLocaleDateString()}</div>
          </div>
        </div>
      </a>`;
  }).join("");

  updateRecButtons();
}
function updateRecButtons(){
  const btnClear = document.getElementById("recClear");
  const btnToggle = document.getElementById("recToggle");
  if (btnClear){ btnClear.disabled = getVistos().length===0; btnClear.onclick = ()=>{ setVistos([]); renderRecientes(); }; }
  if (btnToggle){ const paused = getPause(); btnToggle.textContent = paused?"Reanudar":"Pausar"; btnToggle.onclick = ()=>{ setPause(!getPause()); updateRecButtons(); }; }
}

/* =========================== BUSCADOR (redirige a tienda) =========================== */
(function setupSearch() {
  const form = document.querySelector(".search-wrap");
  if (!form) return;
  const input = form.querySelector('input[type="search"]');

  // Si estamos en tienda, tienda.js maneja el filtrado.
  const enTienda = location.pathname.includes("/paginas/tienda.html");
  if (enTienda) return;

  // En cualquier otra página → redirigir a tienda.html?q=...
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const base = location.pathname.includes("/paginas/") ? ".." : ".";
    const q = (input.value || "").trim();
    const url = `${base}/paginas/tienda.html${q ? `?q=${encodeURIComponent(q)}` : ""}`;
    form.reset();                // <-- limpia el campo antes de navegar
    location.href = url;
  });

  // Al volver con Atrás desde tienda, vacía el input restaurado por bfcache
  window.addEventListener("pageshow", () => { if (input) input.value = ""; });
})();

/* =============== BOOT =============== */
(async function boot(){
  try{
    const catalogo = await cargarCatalogo();

    // Render por cada sección [data-feed]
    document.querySelectorAll("[data-carousel-track]").forEach(track=>{
      const plat = (track.dataset.feed || track.closest("section")?.id || "").toLowerCase();

      const picks = (DESTACADOS[plat] && DESTACADOS[plat].length)
        ? DESTACADOS[plat]
            .map(ref => catalogo.find(p => p.slug===ref.slug && String(p.plataforma).toLowerCase()===ref.plataforma))
            .filter(Boolean)
        : catalogo.filter(p => String(p.plataforma).toLowerCase()===plat);

      track.innerHTML = picks.slice(0, MAX_HOME).map(card).join("");
    });

    // Carruseles y recientes
    document.querySelectorAll("[data-carousel]").forEach(initCarousel);
    renderRecientes();

    // Guardar “vistos” al click en cards (de-dup por href)
    document.body.addEventListener("click", (e) => {
      const a = e.target.closest("[data-carousel-track] a[href]");
      if (!a) return;

      const cardEl = a.closest(".card");
      const imgEl  = cardEl?.querySelector("img");

      const u = new URL(a.href, location.origin);
      const href = u.pathname + u.search;

      const title = cardEl?.querySelector("h3")?.innerText?.trim() || imgEl?.alt || "Producto";
      const img   = imgEl?.currentSrc || imgEl?.src || "";

      const list = getVistos().filter(v => v.href !== href);
      list.unshift({ href, title, img, ts: Date.now() });
      setVistos(list.slice(0, 30));
      renderRecientes();
    });

  } catch(err){
    console.error(err);
    alert("No se pudo cargar el catálogo.");
  }
})();
