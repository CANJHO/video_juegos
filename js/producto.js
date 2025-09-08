// /js/producto.js
import { getVistos, setVistos } from "./lib/vistos.js";

(() => {
  const qs = (s, r=document) => r.querySelector(s);
  const money = (n=0) =>
    new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN",maximumFractionDigits:2}).format(+n||0);

  const ROOT = location.pathname.includes("/paginas/") ? ".." : ".";
  const slugify = (s="") => String(s).toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu,"")
    .replace(/[^\w-]+/g,"-").replace(/^-+|-+$/g,"");

  const imgFrom = (p) =>
    `${ROOT}/imagenes/index/${String(p.plataforma||"").toLowerCase()}/${p.slug}.webp`;

  const detalleURL = (p) => {
    const q = new URLSearchParams({ slug: p.slug, plataforma: String(p.plataforma||"").toLowerCase() });
    return `producto.html?${q.toString()}`;
  };

  async function cargarCatalogo(){
    const jsonUrl = `${ROOT}/js/data/catalogo.json`;
    try {
      const r = await fetch(jsonUrl, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const txt = await r.text();
      return JSON.parse(txt);
    } catch {
      const jsUrl = `${ROOT}/js/data/catalogo.js`;
      const mod   = await import(jsUrl);
      if (!mod?.CATALOGO) throw new Error("No se encontró CATALOGO en catalogo.js");
      return mod.CATALOGO;
    }
  }

  // Guarda “vistos” sin duplicar (clave = href)
  function saveVisto(entry){
    const list = getVistos().filter(v => v.href !== entry.href);
    list.unshift({ ...entry, ts: Date.now() });
    setVistos(list.slice(0, 30));
  }

  const setText = (sel, val) => { const el = qs(sel); if (el) el.textContent = (val ?? "—"); };

  function renderProduct(p, catalogo){
    setText("[data-bc-plataforma]", p.plataforma || "Catálogo");
    setText("[data-title]", p.titulo || p.nombre || "Producto");
    document.title = `${p.titulo || p.nombre || "Producto"} | Tienda`;

    setText("[data-price]", money(p.precio || p.price || 0));
    const listEl = qs("[data-price-list]");
    if (listEl){
      const hasList = (p.precio_lista ?? p.price_list) != null;
      if (hasList){
        listEl.textContent = money(p.precio_lista ?? p.price_list);
        listEl.classList.remove("d-none");
      } else {
        listEl.classList.add("d-none");
      }
    }

    setText("[data-voces]",         p.voces || "—");
    setText("[data-textos]",        p.textos || "—");
    setText("[data-peso]",          p.peso || p.peso_gb || "—");
    setText("[data-requerido]",     p.requerido || p.requerido_gb || "—");
    setText("[data-instrucciones]", p.instrucciones || "—");
    setText("[data-sku]",           p.sku || p.slug || "N/D");
    setText("[data-categorias]",    Array.isArray(p.categorias) ? p.categorias.join(", ") : (p.categorias || "—"));
    setText("[data-tags]",          Array.isArray(p.tags) ? p.tags.join(", ") : (p.tags || "—"));

    // Enlazar el nombre de la plataforma al listado de esa plataforma
    const platLink = document.querySelector('[data-bc-plataforma]');
    if (platLink) {
      const plat = String(p.plataforma || '').toLowerCase();

      // (Opcional) cómo quieres mostrar el texto
      platLink.textContent = plat.toUpperCase(); // PS5, PS4, SWITCH, etc.

      // Ruta correcta tanto si estás dentro de /paginas/ como en la raíz
      const href = location.pathname.includes('/paginas/')
        ? `${plat}.html`          // producto.html -> ps5.html (mismo directorio)
        : `./paginas/${plat}.html`; // por si algún día mueves la ficha fuera

      platLink.setAttribute('href', href);
    }


    const imgEl = qs("[data-image]");
    if (imgEl){
      imgEl.src = imgFrom(p);
      imgEl.alt = p.titulo || p.nombre || "Producto";
      imgEl.onerror = () => { imgEl.onerror = null; imgEl.src = `${ROOT}/imagenes/placeholder.webp`; };
    }

    const varBox = qs("[data-variantes]");
    if (varBox){
      const vars = Array.isArray(p.variantes) ? p.variantes : [];
      varBox.innerHTML = vars.map((v,i)=>
        `<button class="btn btn-outline-primary ${i===0?"active":""}" data-variant="${v}">${v}</button>`
      ).join("");
    }

    setText("[data-descripcion]", p.descripcion || p.description || "—");

    const rel = qs("[data-related-track]");
    if (rel){
      const related = catalogo
        .filter(x =>
          slugify(x.slug || x.titulo || x.nombre || "") !== slugify(p.slug || p.titulo || p.nombre || "") &&
          String(x.plataforma||"").toLowerCase() === String(p.plataforma||"").toLowerCase()
        )
        .slice(0, 10);

      rel.innerHTML = related.map(x => `
        <a class="text-decoration-none" href="${detalleURL(x)}">
          <div class="card border-0 shadow-sm" style="width:160px">
            <div class="ratio ratio-3x4">
              <img src="${imgFrom(x)}"
                   class="w-100 h-100 object-fit-cover object-position-top rounded-top"
                   alt="${x.titulo || x.nombre}"
                   onerror="this.onerror=null;this.src='${ROOT}/imagenes/placeholder.webp'">
            </div>
            <div class="card-body p-2 text-center">
              <div class="small fw-semibold">${x.titulo || x.nombre}</div>
              <div class="small text-muted">${money(x.precio || x.price || 0)}</div>
            </div>
          </div>
        </a>
      `).join("");
    }
  }

  function bindQtyCart(prod){
    const input = qs("[data-qty]");
    qs("[data-qty-incr]")?.addEventListener("click", ()=>{ input.value = String(Math.min(99,(+input.value||1)+1)); });
    qs("[data-qty-decr]")?.addEventListener("click", ()=>{ input.value = String(Math.max(1,(+input.value||1)-1)); });

    const btnAdd = qs("[data-add-cart]");
    if (btnAdd){
      const img = qs("[data-image]")?.src || imgFrom(prod);
      btnAdd.dataset.id    = prod.slug || slugify(prod.titulo || prod.nombre || "producto");
      btnAdd.dataset.title = prod.titulo || prod.nombre || "Producto";
      btnAdd.dataset.price = String(prod.precio || prod.price || 0);
      btnAdd.dataset.img   = img;
      btnAdd.dataset.plataforma = String(prod.plataforma||"").toLowerCase();
      btnAdd.addEventListener("click", ()=>{
        const q = Math.max(1, parseInt(input?.value || "1", 10));
        btnAdd.dataset.qty = String(q);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const sp    = new URLSearchParams(location.search);
      const qSlug = slugify(sp.get("slug") || "");
      const qPlat = (sp.get("plataforma") || "").trim().toLowerCase();

      const CATALOGO = await cargarCatalogo();

      let prod = CATALOGO.find(p =>
        slugify(p.slug || p.titulo || p.nombre || "") === qSlug &&
        String(p.plataforma||"").toLowerCase() === qPlat
      ) || CATALOGO.find(p =>
        slugify(p.slug || p.titulo || p.nombre || "") === qSlug
      );

      if (!prod){
        qs("main .container")?.insertAdjacentHTML(
          "beforeend",
          `<div class="alert alert-warning mt-4">Producto no encontrado.</div>`
        );
        document.title = "Producto no encontrado | Tienda";
        return;
      }

      renderProduct(prod, CATALOGO);
      bindQtyCart(prod);

      // Vistos: actual (sin duplicar)
      const href  = location.pathname + location.search;
      const title = qs("[data-title]")?.textContent?.trim() || prod.titulo || prod.nombre || "Producto";
      const img   = qs("[data-image]")?.src || imgFrom(prod);
      saveVisto({ href, title, img });

      // Vistos: clic en relacionados (sin duplicar y con URL canónica)
      qs("[data-related-track]")?.addEventListener("click", (e)=>{
        const a    = e.target.closest("a[href]");
        if (!a) return;
        const card = a.closest(".card, .rel-item") || a;
        const t    = card.querySelector(".small.fw-semibold, h3, .title")?.textContent?.trim() || a.title || "Producto";
        const im   = card.querySelector("img")?.src || "";
        const u    = new URL(a.href);
        const href = u.pathname + u.search;
        saveVisto({ href, title: t, img: im });
      });

    } catch (err) {
      console.error(err);
      qs("main .container")?.insertAdjacentHTML(
        "beforeend",
        `<div class="alert alert-danger mt-4">No se pudo cargar el catálogo.</div>`
      );
    }
  });
})();
