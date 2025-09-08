// /js/tienda.js
// Página de resultados globales: muestra TODO el catálogo (todas las plataformas) y filtra por ?q=
(() => {
  const qs = (s, r=document) => r.querySelector(s);
  const ROOT = location.pathname.includes("/paginas/") ? ".." : ".";
  const money = (n=0) => new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN"}).format(+n||0);

  const imgFrom = (p) => `${ROOT}/imagenes/index/${String(p.plataforma||"").toLowerCase()}/${p.slug}.webp`;
  const hrefProducto = (p) => {
    const sp = new URLSearchParams({ slug: p.slug, plataforma: String(p.plataforma||"").toLowerCase() });
    return `${ROOT}/paginas/producto.html?${sp.toString()}`;
  };

  async function cargarCatalogo(){
    const url = `${ROOT}/js/data/catalogo.json`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error("No se pudo cargar catálogo");
    return await r.json();
  }

  function textIncludes(haystack="", needle=""){
    const a = String(haystack).toLowerCase();
    const b = String(needle).toLowerCase().trim();
    if (!b) return true;
    // soporta múltiples palabras: todas deben coincidir
    return b.split(/\s+/).every(tok => a.includes(tok));
  }

  function matches(p, q){
    if (!q) return true;
    const campos = [
      p.titulo, p.slug, p.plataforma,
      Array.isArray(p.tags) ? p.tags.join(" ") : p.tags,
      Array.isArray(p.categorias) ? p.categorias.join(" ") : p.categorias,
      p.descripcion
    ].filter(Boolean).join(" ");
    return textIncludes(campos, q);
  }

  function card(p){
    return `
      <div class="col">
        <article class="card border-0 shadow-sm h-100">
          <a href="${hrefProducto(p)}" class="d-block" target="_self" rel="noopener">
            <div class="ratio ratio-3x4">
              <img src="${imgFrom(p)}"
                   class="w-100 h-100 object-fit-cover object-position-top rounded-top"
                   alt="${p.titulo}" loading="lazy"
                   onerror="this.onerror=null;this.src='${ROOT}/imagenes/placeholder.webp'">
            </div>
          </a>
          <div class="card-body text-center">
            <h3 class="h6 mb-2">
              <a href="${hrefProducto(p)}" class="text-decoration-none" target="_self" rel="noopener">
                ${p.titulo}
              </a>
            </h3>
            <div class="small text-muted mb-1 text-uppercase">${p.plataforma}</div>
            <p class="mb-0 fw-semibold">${money(p.precio || 0)}</p>
          </div>
        </article>
      </div>
    `;
  }

  function render(lista, q){
    const grid = qs("#resultsGrid");
    const empty = qs("[data-empty]");
    const summary = qs("[data-summary]");

    if (!lista.length){
      grid.innerHTML = "";
      empty.classList.remove("d-none");
      summary.textContent = q ? `0 resultados para: “${q}”` : "0 resultados";
      return;
    }

    empty.classList.add("d-none");
    grid.innerHTML = lista.map(card).join("");
    summary.textContent = q
      ? `Mostrando ${lista.length} resultado(s) para: “${q}”`
      : `Mostrando ${lista.length} producto(s)`;
  }

  // --- boot
  document.addEventListener("DOMContentLoaded", async () => {
    const form = qs(".search-wrap");
    const input = form?.querySelector('input[type="search"]');

    // lee ?q= inicial
    const sp = new URLSearchParams(location.search);
    const q0 = (sp.get("q") || "").trim();
    if (input) input.value = q0;

    try{
      const catalogo = await cargarCatalogo();

      const aplicar = (q) => {
        const lista = catalogo.filter(p => matches(p, q));
        render(lista, q);
      };

      aplicar(q0);

      // submit: actualiza URL y filtra
      form?.addEventListener("submit", (e)=>{
        e.preventDefault();
        const q = (input?.value || "").trim();
        const sp = new URLSearchParams(location.search);
        if (q) sp.set("q", q); else sp.delete("q");
        history.pushState(null, "", `?${sp.toString()}`);
        aplicar(q);
      });

      // escribir borra/filtra rápido
      input?.addEventListener("input", ()=>{
        const q = (input?.value || "").trim();
        aplicar(q);
      });

      // back/forward del navegador
      window.addEventListener("popstate", ()=>{
        const q = (new URLSearchParams(location.search)).get("q") || "";
        if (input) input.value = q;
        aplicar(q);
      });

      // contador carrito opcional
      const cartCountEl = document.getElementById("cartCount");
      const cartCount = parseInt(localStorage.getItem("cartCount") || "0", 10);
      if (cartCountEl && !Number.isNaN(cartCount)) cartCountEl.textContent = cartCount;

    } catch(err){
      console.error(err);
      qs("#resultsGrid").innerHTML = "";
      qs("[data-empty]")?.classList.remove("d-none");
      qs("[data-summary]").textContent = "No se pudo cargar el catálogo.";
    }
  });
})();
