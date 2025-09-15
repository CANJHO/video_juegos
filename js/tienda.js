// /js/tienda.js
// Página de resultados globales: muestra TODO el catálogo (todas las plataformas) y filtra por ?q=
document.addEventListener("DOMContentLoaded", () => {
  const seleccionarElemento = (selector, raiz = document) => raiz.querySelector(selector);
  const RUTA_BASE = location.pathname.includes("/paginas/") ? ".." : ".";
  const formatearMoneda = (n = 0) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(+n || 0);

  const rutaImagenProducto = (producto) =>
    `${RUTA_BASE}/imagenes/index/${String(producto.plataforma || "").toLowerCase()}/${producto.slug}.webp`;

  const enlaceProducto = (producto) => {
    const parametros = new URLSearchParams({
      slug: producto.slug,
      plataforma: String(producto.plataforma || "").toLowerCase(),
    });
    return `${RUTA_BASE}/paginas/producto.html?${parametros.toString()}`;
  };

  async function cargarCatalogo() {
    const url = `${RUTA_BASE}/js/data/catalogo.json`;
    const respuesta = await fetch(url, { cache: "no-store" });
    if (!respuesta.ok) throw new Error("No se pudo cargar catálogo");
    return await respuesta.json();
  }

  function incluyeTexto(contenido = "", consulta = "") {
    const a = String(contenido).toLowerCase();
    const b = String(consulta).toLowerCase().trim();
    if (!b) return true;
    // Soporta varias palabras: todas deben aparecer
    return b.split(/\s+/).every((token) => a.includes(token));
  }

  function coincideConBusqueda(producto, consulta) {
    if (!consulta) return true;
    const campos = [
      producto.titulo,
      producto.slug,
      producto.plataforma,
      Array.isArray(producto.tags) ? producto.tags.join(" ") : producto.tags,
      Array.isArray(producto.categorias) ? producto.categorias.join(" ") : producto.categorias,
      producto.descripcion,
    ]
      .filter(Boolean)
      .join(" ");
    return incluyeTexto(campos, consulta);
  }

  function tarjetaProducto(producto) {
    return `
      <div class="col">
        <article class="card border-0 shadow-sm h-100">
          <a href="${enlaceProducto(producto)}" class="d-block" target="_self" rel="noopener">
            <div class="ratio ratio-3x4">
              <img src="${rutaImagenProducto(producto)}"
                   class="w-100 h-100 object-fit-cover object-position-top rounded-top"
                   alt="${producto.titulo}" loading="lazy"
                   onerror="this.onerror=null;this.src='${RUTA_BASE}/imagenes/placeholder.webp'">
            </div>
          </a>
          <div class="card-body text-center">
            <h3 class="h6 mb-2">
              <a href="${enlaceProducto(producto)}" class="text-decoration-none" target="_self" rel="noopener">
                ${producto.titulo}
              </a>
            </h3>
            <div class="small text-muted mb-1 text-uppercase">${producto.plataforma}</div>
            <p class="mb-0 fw-semibold">${formatearMoneda(producto.precio || 0)}</p>
          </div>
        </article>
      </div>
    `;
  }

  function renderizar(listaProductos, consulta) {
    const contenedorResultados = seleccionarElemento("#resultsGrid");
    const estadoVacio = seleccionarElemento("[data-empty]");
    const resumenResultados = seleccionarElemento("[data-summary]");

    if (!listaProductos.length) {
      contenedorResultados.innerHTML = "";
      estadoVacio.classList.remove("d-none");
      if (resumenResultados) {
        resumenResultados.textContent = consulta
          ? `0 resultados para: “${consulta}”`
          : "0 resultados";
      }
      return;
    }

    estadoVacio.classList.add("d-none");
    contenedorResultados.innerHTML = listaProductos.map(tarjetaProducto).join("");
    if (resumenResultados) {
      resumenResultados.textContent = consulta
        ? `Mostrando ${listaProductos.length} resultado(s) para: “${consulta}”`
        : `Mostrando ${listaProductos.length} producto(s)`;
    }
  }

  // --------- INICIO ----------
  (async () => {
    const formularioBusqueda = seleccionarElemento(".search-wrap");
    const campoBusqueda = formularioBusqueda?.querySelector('input[type="search"]');

    // Lee ?q= inicial
    const parametrosUrl = new URLSearchParams(location.search);
    const consultaInicial = (parametrosUrl.get("q") || "").trim();
    if (campoBusqueda) campoBusqueda.value = consultaInicial;

    try {
      const catalogo = await cargarCatalogo();

      const aplicarConsulta = (consulta) => {
        const lista = catalogo.filter((producto) => coincideConBusqueda(producto, consulta));
        renderizar(lista, consulta);
      };

      aplicarConsulta(consultaInicial);

      // submit: actualiza URL y filtra
      formularioBusqueda?.addEventListener("submit", (evento) => {
        evento.preventDefault();
        const consulta = (campoBusqueda?.value || "").trim();
        const nuevosParametros = new URLSearchParams(location.search);
        if (consulta) nuevosParametros.set("q", consulta);
        else nuevosParametros.delete("q");
        history.pushState(null, "", `?${nuevosParametros.toString()}`);
        aplicarConsulta(consulta);
      });

      // escribir: filtra en vivo
      campoBusqueda?.addEventListener("input", () => {
        const consulta = (campoBusqueda?.value || "").trim();
        aplicarConsulta(consulta);
      });

      // back/forward del navegador
      window.addEventListener("popstate", () => {
        const consulta = new URLSearchParams(location.search).get("q") || "";
        if (campoBusqueda) campoBusqueda.value = consulta;
        aplicarConsulta(consulta);
      });

      // contador carrito (opcional)
      const indicadorCarrito = document.getElementById("cartCount");
      const cantidadCarrito = parseInt(localStorage.getItem("cartCount") || "0", 10);
      if (indicadorCarrito && !Number.isNaN(cantidadCarrito)) {
        indicadorCarrito.textContent = String(cantidadCarrito);
      }
    } catch (error) {
      console.error(error);
      seleccionarElemento("#resultsGrid").innerHTML = "";
      seleccionarElemento("[data-empty]")?.classList.remove("d-none");
      const resumenResultados = seleccionarElemento("[data-summary]");
      if (resumenResultados) resumenResultados.textContent = "No se pudo cargar el catálogo.";
    }
  })();
});
