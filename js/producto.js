// /js/producto.js
import { CATALOGO } from "/js/data/catalogo.js";
import { addVisto }   from "/js/lib/vistos.js";

(() => {
  // -------- utils
  const qs  = (s, r = document) => r.querySelector(s);
  const money = (n = 0) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 2 }).format(+n || 0);

  const slugify = (s="") => s.toLowerCase().normalize("NFD")
    .replace(/\p{Diacritic}/gu,"").replace(/[^\w]+/g,"-").replace(/^-+|-+$/g,"");

  // lee parámetros (?slug=...&plataforma=...)
  const sp = new URLSearchParams(location.search);
  const slugParam = (sp.get("slug") || "").trim().toLowerCase();
  const platParam = (sp.get("plataforma") || "").trim().toLowerCase();

  // -------- búsqueda en catálogo
  const findBySlugPlat = (slug, plat) =>
    CATALOGO.find(p =>
      slugify(p.slug || p.titulo || p.nombre || "") === slug &&
      String(p.plataforma || "").toLowerCase() === plat
    );

  const findBySlug = (slug) =>
    CATALOGO.find(p => slugify(p.slug || p.titulo || p.nombre || "") === slug);

  // rutas de imagen (desde /paginas/producto.html)
  const getImg = (p) => p.imagen || p.img || p.poster ||
    `../imagenes/index/${p.plataforma}/${p.slug}.webp`;

  // genera URL a otra ficha (relacionados)
  const detalleURL = (p) => {
    const qs = new URLSearchParams();
    qs.set("slug", p.slug || slugify(p.titulo || p.nombre || ""));
    qs.set("plataforma", String(p.plataforma || "").toLowerCase());
    return `producto.html?${qs.toString()}`;
  };

  // -------- render ficha
  function renderProduct(p) {
    // Migas / encabezados
    setText("[data-bc-plataforma]", p.plataforma || p.categoria || "Catálogo");
    setText("[data-title]", p.titulo || p.nombre || "Producto");
    document.title = `${p.titulo || p.nombre} | Tienda`;

    // Precios
    setText("[data-price]",      money(p.precio || p.price));
    if (p.precio_lista || p.price_list) {
      setText("[data-price-list]", money(p.precio_lista || p.price_list));
    }

    // Info técnica
    setText("[data-voces]",         p.voces || "—");
    setText("[data-textos]",        p.textos || "—");
    setText("[data-peso]",          p.peso || p.peso_gb || "—");
    setText("[data-requerido]",     p.requerido || p.requerido_gb || "—");
    setText("[data-instrucciones]", p.instrucciones || "—");
    setText("[data-sku]",           p.sku || "N/D");
    setText("[data-categorias]",    p.categorias || p.categoria || "—");
    setText("[data-tags]",          p.tags || "—");

    // Imagen principal
    const imgEl = qs("[data-image]");
    if (imgEl) { imgEl.src = getImg(p); imgEl.alt = p.titulo || p.nombre || "Producto"; }

    // Variantes (si hay)
    const varBox = qs("[data-variantes]");
    if (varBox && Array.isArray(p.variantes) && p.variantes.length) {
      varBox.innerHTML = p.variantes
        .map((v, i) => `<button class="btn btn-outline-primary ${i === 0 ? "active" : ""}" data-variant="${v}">${v}</button>`)
        .join("");
    }

    // Descripción
    setText("[data-descripcion]", p.descripcion || p.description || "—");

    // Relacionados (misma plataforma, distinto slug)
    const rel = qs("[data-related-track]");
    if (rel) {
      const related = CATALOGO
        .filter(x =>
          slugify(x.slug || x.titulo || x.nombre || "") !== slugify(p.slug || p.titulo || p.nombre || "") &&
          String(x.plataforma || "").toLowerCase() === String(p.plataforma || "").toLowerCase()
        )
        .slice(0, 10);

      rel.innerHTML = related.map(x => `
        <a class="text-decoration-none" href="${detalleURL(x)}">
          <div class="card" style="width:160px">
            <img src="${getImg(x)}" class="card-img-top" alt="${x.titulo || x.nombre}">
            <div class="card-body p-2 text-center">
              <div class="small fw-semibold">${x.titulo || x.nombre}</div>
              <div class="small text-muted">${money(x.precio || x.price || 0)}</div>
            </div>
          </div>
        </a>
      `).join("");
    }
  }

  // helpers de UI
  function setText(sel, val) { const el = qs(sel); if (el) el.textContent = val; }

  function bindQtyCart() {
    const input = qs("[data-qty]");
    qs("[data-qty-incr]")?.addEventListener("click", () => {
      input.value = String(Math.min(99, (parseInt(input.value || "1", 10) || 1) + 1));
    });
    qs("[data-qty-decr]")?.addEventListener("click", () => {
      input.value = String(Math.max(1, (parseInt(input.value || "1", 10) || 1) - 1));
    });
    // Quita el toast propio; el módulo del carrito ya muestra uno.
  }

  // -------- init
  document.addEventListener("DOMContentLoaded", () => {
    let prod = null;
    if (slugParam && platParam) prod = findBySlugPlat(slugParam, platParam);
    if (!prod && slugParam)     prod = findBySlug(slugParam);

    if (!prod) {
      qs("main .container")?.insertAdjacentHTML(
        "beforeend",
        `<div class="alert alert-warning mt-4">Producto no encontrado.</div>`
      );
      document.title = "Producto no encontrado | Tienda";
      return;
    }

    // Render UI
    renderProduct(prod);
    bindQtyCart();

    // --- VISTO actual
    const href  = location.pathname + location.search;
    const title = qs("[data-title]")?.textContent?.trim() || "Producto";
    const img   = qs("[data-image], [data-prod-image] img")?.src || "";
    addVisto({ href, title, img });

    // --- VISTOS: clic en relacionados
    qs("[data-related-track]")?.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a) return;
      const card = a.closest(".card, .rel-item") || a;
      const title = card.querySelector(".small.fw-semibold, h3, .title")?.textContent?.trim() || a.title || "Producto";
      const img   = card.querySelector("img")?.src || "";
      addVisto({ href: a.getAttribute("href"), title, img });
    });

    // --- CARRITO: preparar data-* del botón con los datos reales
    const btnAdd = qs("[data-add-cart]");
    const qtyInp = qs("[data-qty]");
    if (btnAdd) {
      btnAdd.dataset.id    = prod.slug || slugify(prod.titulo || prod.nombre || "producto");
      btnAdd.dataset.title = prod.titulo || prod.nombre || "Producto";
      btnAdd.dataset.price = String(prod.precio || prod.price || 0);
      btnAdd.dataset.img   = img || ""; // ya calculado arriba
      btnAdd.dataset.plataforma = String(prod.plataforma || "").toLowerCase();

      // Propagar cantidad al vuelo antes de que bindAddToCart lo lea
      btnAdd.addEventListener("click", () => {
        const q = Math.max(1, parseInt(qtyInp?.value || "1", 10));
        btnAdd.dataset.qty = String(q);
      });
    }
  });
})();
