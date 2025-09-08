// /js/categoria.js
import { addVisto, getVistos, setVistos, getPause, setPause } from "./lib/vistos.js";
import { bindCartFrame, bindAddToCart, renderBadge } from "./lib/cart.js";

/* ---------- utilidades ---------- */
const $ = (s, r=document) => r.querySelector(s);
const money = (n=0)=> new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN"}).format(+n||0);

// Detecta si estamos dentro de /paginas/
const ROOT = location.pathname.includes("/paginas/") ? ".." : ".";

// Deducción de plataforma: por dataset o por nombre de archivo (ps4.html -> "ps4")
const PLATFORM =
  ($("[data-grid]")?.dataset.plataforma ||
   location.pathname.split("/").pop().replace(".html","")).toLowerCase();

/* ---------- catálogo ---------- */
async function loadCatalog(){
  const url = `${ROOT}/js/data/catalogo.json`;
  const r = await fetch(url, { cache:"no-store" });
  if (!r.ok) throw new Error("No se pudo cargar catálogo");
  return r.json();
}

const imgFrom = (p)=> `${ROOT}/imagenes/index/${p.plataforma}/${p.slug}.webp`;
const hrefProducto = (p)=>{
  const qs = new URLSearchParams({ slug:p.slug, plataforma:String(p.plataforma).toLowerCase() });
  return `${ROOT}/paginas/producto.html?${qs.toString()}`;
};

/* ---------- render grid ---------- */
function card(p){
  return `
  <div class="col">
    <article class="card border-0 shadow-sm h-100">
      <a href="${hrefProducto(p)}" class="d-block">
        <div class="ratio ratio-3x4">
          <img src="${imgFrom(p)}"
               class="w-100 h-100 object-fit-cover object-position-top rounded-top"
               alt="${p.titulo}">
        </div>
      </a>
      <div class="card-body text-center d-grid gap-2">
        <h3 class="h6 mb-1">
          <a href="${hrefProducto(p)}" class="text-decoration-none">${p.titulo}</a>
        </h3>
        <div class="fw-semibold">${money(p.precio || 0)}</div>
        <button class="btn btn-sm btn-success"
                data-add-cart
                data-id="${p.slug}"
                data-title="${p.titulo}"
                data-price="${p.precio || 0}"
                data-img="${imgFrom(p)}"
                data-plataforma="${p.plataforma}">
          Añadir al carrito
        </button>
      </div>
    </article>
  </div>`;
}

function renderGrid(items){
  const grid = $("[data-grid]");
  grid.innerHTML = items.map(card).join("");
}


/* ---------- vistos recientemente ---------- */
function renderRecientes(){
  const cont = $("[data-recent-list]");
  if (!cont) return;
  const vistos = getVistos();
  if (!vistos.length){
    cont.className = "recent-grid";
    cont.innerHTML = `<span class="text-muted">Aún no tienes vistos.</span>`;
    updateRecButtons();
    return;
  }
  cont.className = "recent-grid";
  cont.innerHTML = vistos.map(v=>`
    <a href="${v.href}" class="text-decoration-none">
      <div class="recent-card">
        <img src="${v.img}" alt="${v.title}">
        <div>
          <div class="recent-title">${v.title}</div>
          <div class="recent-date">${new Date(v.ts).toLocaleDateString()}</div>
        </div>
      </div>
    </a>`).join("");
  updateRecButtons();
}
function updateRecButtons(){
  $("#recClear")?.addEventListener("click", ()=>{ setVistos([]); renderRecientes(); });
  const paused = getPause();
  const btn = $("#recToggle");
  if (btn){
    btn.textContent = paused ? "Reanudar" : "Pausar";
    btn.onclick = ()=>{ setPause(!getPause()); updateRecButtons(); };
  }
}

/* ---------- boot ---------- */
document.addEventListener("DOMContentLoaded", async ()=>{
  try{
    // título
    const name = PLATFORM.toUpperCase();
    const titleEl = $("[data-title]"); if (titleEl) titleEl.textContent = `Juegos ${name}`;

    // catálogo + render
    const data = await loadCatalog();
    const items = data.filter(p => String(p.plataforma).toLowerCase() === PLATFORM);
    renderGrid(items);

    // eventos para “vistos” (al navegar a producto)
    $("[data-grid]")?.addEventListener("click", (e)=>{
      const a = e.target.closest("a[href]");
      if (!a) return;
      const card = a.closest(".card");
      const img  = card?.querySelector("img");
      addVisto({ href:a.getAttribute("href"),
                 title: card?.querySelector("h3")?.textContent?.trim() || img?.alt || "Producto",
                 img: img?.src || "" });
    });

    // carrito (badge/drawer + botones añadir)
    bindCartFrame();           // pinta el badge y arma el drawer
    bindAddToCart();           // escucha los botones [data-add-cart]
    renderBadge();             // asegura el número al cargar

  }catch(err){
    console.error(err);
    $("[data-grid]")?.insertAdjacentHTML("beforebegin",
      `<div class="alert alert-danger">No se pudo cargar el catálogo.</div>`);
  }
});
