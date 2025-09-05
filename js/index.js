// /js/index.js
import { CATALOGO } from "/js/data/catalogo.js";
import { addVisto, getVistos, setVistos, getPause, setPause } from "/js/lib/vistos.js";

/* =========================== BUSCADOR =========================== */
(function setupSearch() {
  const form = document.querySelector(".search-wrap");
  if (!form) return;
  const input = form.querySelector('input[type="search"]');

  const applyFilter = (q) => {
    const query = (q || "").trim().toLowerCase();
    const cards = document.querySelectorAll("[data-carousel-track] .card");
    if (!query) { cards.forEach(c => c.classList.remove("d-none")); return; }
    let first = null;
    cards.forEach(card => {
      const title = card.querySelector("h3")?.textContent.toLowerCase() || "";
      const ok = title.includes(query);
      card.classList.toggle("d-none", !ok);
      if (ok && !first) first = card;
    });
    if (first) {
      const vp = first.closest("[data-carousel-viewport]");
      vp?.scrollTo({ left: first.offsetLeft, behavior: "smooth" });
    }
  };

  form.addEventListener("submit", e => { e.preventDefault(); applyFilter(input.value); });
  input.addEventListener("input",  () => { if (input.value.trim()==="") applyFilter(""); });
  input.addEventListener("keydown",(e)=> { if (e.key==="Escape"){ input.value=""; applyFilter(""); }});
})();

/* =================== CARRUSEL (drag solo TOUCH) =================== */
function initCarousel(root) {
  const viewport = root.querySelector("[data-carousel-viewport]");
  const track    = root.querySelector("[data-carousel-track]");
  const prev     = root.querySelector("[data-carousel-prev]");
  const next     = root.querySelector("[data-carousel-next]");
  if (!viewport || !track) return;

  const gap = () => parseFloat(getComputedStyle(track).gap || 0) || 0;
  const step = () => {
    const card = track.querySelector(".card");
    const w = card ? card.getBoundingClientRect().width : 260;
    return w + gap();
  };

  prev?.addEventListener("click", e => { e.preventDefault(); viewport.scrollBy({ left: -step()*2, behavior: "smooth" }); });
  next?.addEventListener("click", e => { e.preventDefault(); viewport.scrollBy({ left:  step()*2, behavior: "smooth" }); });

  // Drag sólo para pantallas táctiles
  let down=false, startX=0, startScroll=0;
  viewport.addEventListener("pointerdown", (e)=>{
    if (e.pointerType !== "touch") return;
    down = true; startX = e.clientX; startScroll = viewport.scrollLeft;
    viewport.setPointerCapture(e.pointerId);
  });
  viewport.addEventListener("pointermove", (e)=>{
    if (!down) return;
    viewport.scrollLeft = startScroll - (e.clientX - startX);
  });
  ["pointerup","pointerleave"].forEach(ev => viewport.addEventListener(ev, ()=>{ down=false; }));

  // Defensa: asegura navegación del <a> en escritorio
  track.addEventListener("click", (e)=>{
    const a = e.target.closest("a[href]");
    if (!a) return;
    if (e.ctrlKey || e.metaKey || e.button===1) return; // permitir nueva pestaña
    window.location.href = a.href;
  });
}

/* =========================== RENDER CARDS =========================== */
const fmt = new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN"});

// Imagen: usa p.img si viene; si no, ruta por convención relativa a index.html
const getImgSrc = (p) => p.img ?? `./imagenes/index/${p.plataforma}/${p.slug}.webp`;

// URL detalle con SLUG + PLATAFORMA de la sección (no del producto)
const getHrefWithPlat = (p, plataforma) => {
  const qs = new URLSearchParams();
  qs.set("slug", p.slug);
  qs.set("plataforma", String(p.plataforma || plataforma).toLowerCase());
  return `paginas/producto.html?${qs.toString()}`;
};

// Nota: ponemos .ratio DENTRO del <a> para que el ::before no tape el click
const cardTemplate = (p, plataforma) => `
  <article class="card border-0 shadow-sm" style="min-width:220px;max-width:260px;">
    <a href="${getHrefWithPlat(p, plataforma)}" class="d-block" target="_self" rel="noopener">
      <div class="ratio ratio-3x4">
        <img src="${getImgSrc(p)}" draggable="false"
             class="w-100 h-100 object-fit-cover object-position-top rounded-top"
             alt="${p.titulo}">
      </div>
    </a>
    <div class="card-body text-center">
      <h3 class="h6 mb-2">
        <a href="${getHrefWithPlat(p, plataforma)}" class="text-decoration-none" target="_self" rel="noopener">
          ${p.titulo}
        </a>
      </h3>
      <p class="mb-0 fw-semibold">${fmt.format(Number(p.precio || 0))}</p>
    </div>
  </article>
`;

function renderFeeds(){
  document.querySelectorAll("[data-carousel-track]").forEach(track=>{
    // plataforma tomada del HTML: data-feed o id de la sección
    const plataforma = (track.dataset.feed || track.closest("section")?.id || "").toLowerCase();

    // Filtra por plataforma (asegúrate que p.plataforma exista en CATALOGO)
    const items = CATALOGO.filter(p => (p.plataforma || "").toLowerCase() === plataforma);

    // Render
    track.innerHTML = items.map(p => cardTemplate(p, plataforma)).join("");
  });
}

/* =================== VISTOS RECIENTES (con limpiar/pausar) =================== */
function renderRecientes(){
  const cont = document.querySelector("[data-recent-list]");
  if (!cont) return;

  const vistos = getVistos();

  if (!vistos.length) {
    cont.className = "recent-grid";
    cont.innerHTML = `<span class="text-muted">Aún no tienes vistos.</span>`;
    updateRecButtons();
    return;
  }

  cont.className = "recent-grid";
  cont.innerHTML = vistos.map(v => `
    <a href="${v.href}" class="text-decoration-none">
      <div class="recent-card">
        <img src="${v.img}" alt="${v.title}">
        <div>
          <div class="recent-title">${v.title}</div>
          <div class="recent-date">${new Date(v.ts).toLocaleDateString()}</div>
        </div>
      </div>
    </a>
  `).join("");

  updateRecButtons();
}

function updateRecButtons(){
  const btnClear = document.getElementById("recClear");
  const btnToggle = document.getElementById("recToggle");
  if (btnClear){
    btnClear.disabled = getVistos().length === 0;
    btnClear.onclick = () => { setVistos([]); renderRecientes(); };
  }
  if (btnToggle){
    const paused = getPause();
    btnToggle.textContent = paused ? "Reanudar" : "Pausar";
    btnToggle.onclick = () => { setPause(!getPause()); updateRecButtons(); };
  }
}

// Guardar “vistos” al click en una card (si no está pausado)
document.body.addEventListener("click", (e) => {
  const a = e.target.closest("[data-carousel-track] a[href]");
  if (!a) return;

  const card = a.closest(".card");
  const img  = card?.querySelector("img");
  addVisto({
    href: a.getAttribute("href"),
    title: card?.querySelector("h3")?.innerText?.trim() || img?.alt || "Producto",
    img: img?.src || "",
  });
  // no hacemos preventDefault, dejamos navegar
});

/* =========================== Boot =========================== */
renderFeeds();
document.querySelectorAll("[data-carousel]").forEach(initCarousel);
renderRecientes();

// contador carrito opcional
const cartCountEl = document.getElementById("cartCount");
const cartCount = parseInt(localStorage.getItem("cartCount") || "0", 10);
if (cartCountEl && !Number.isNaN(cartCount)) cartCountEl.textContent = cartCount;
