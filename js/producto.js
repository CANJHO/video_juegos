// /js/producto.js
import { getVistos, setVistos } from "./lib/vistos.js";

document.addEventListener("DOMContentLoaded", () => {
  const seleccionarElemento = (selector, raiz = document) => raiz.querySelector(selector);

  const formatearMoneda = (n = 0) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 2 })
      .format(+n || 0);

  const RUTA_BASE = location.pathname.includes("/paginas/") ? ".." : ".";

  const convertirASlug = (texto = "") =>
    String(texto)
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^\w-]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const rutaImagenProducto = (producto) =>
    `${RUTA_BASE}/imagenes/index/${String(producto.plataforma || "").toLowerCase()}/${producto.slug}.webp`;

  const urlDetalleProducto = (producto) => {
    const parametros = new URLSearchParams({
      slug: producto.slug,
      plataforma: String(producto.plataforma || "").toLowerCase(),
    });
    // robusto: siempre apunta a /paginas/producto.html
    return `${RUTA_BASE}/paginas/producto.html?${parametros.toString()}`;
  };

  async function cargarCatalogo() {
    const rutaJson = `${RUTA_BASE}/js/data/catalogo.json`;
    try {
      const respuesta = await fetch(rutaJson, { cache: "no-store" });
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      return await respuesta.json();
    } catch {
      // Fallback a JS si el JSON falla o no existe
      const rutaJs = `${RUTA_BASE}/js/data/catalogo.js`;
      const modulo = await import(rutaJs);
      if (!modulo?.CATALOGO) throw new Error("No se encontró CATALOGO en catalogo.js");
      return modulo.CATALOGO;
    }
  }

  // Guarda “vistos” sin duplicar (clave = href)
  function guardarVisto(entrada) {
    const listaActual = getVistos().filter((v) => v.href !== entrada.href);
    listaActual.unshift({ ...entrada, ts: Date.now() });
    setVistos(listaActual.slice(0, 30));
  }

  const establecerTexto = (selector, valor) => {
    const elemento = seleccionarElemento(selector);
    if (elemento) elemento.textContent = valor ?? "—";
  };

  function renderizarProducto(producto, catalogo) {
    // Título / breadcrumb
    establecerTexto("[data-bc-plataforma]", producto.plataforma || "Catálogo");
    establecerTexto("[data-title]", producto.titulo || producto.nombre || "Producto");
    document.title = `${producto.titulo || producto.nombre || "Producto"} | Tienda`;

    // Precios
    establecerTexto("[data-price]", formatearMoneda(producto.precio || producto.price || 0));
    const precioListaEl = seleccionarElemento("[data-price-list]");
    if (precioListaEl) {
      const tieneLista = (producto.precio_lista ?? producto.price_list) != null;
      if (tieneLista) {
        precioListaEl.textContent = formatearMoneda(producto.precio_lista ?? producto.price_list);
        precioListaEl.classList.remove("d-none");
      } else {
        precioListaEl.classList.add("d-none");
      }
    }

    // Atributos
    establecerTexto("[data-voces]", producto.voces || "—");
    establecerTexto("[data-textos]", producto.textos || "—");
    establecerTexto("[data-peso]", producto.peso || producto.peso_gb || "—");
    establecerTexto("[data-requerido]", producto.requerido || producto.requerido_gb || "—");
    establecerTexto("[data-instrucciones]", producto.instrucciones || "—");
    establecerTexto("[data-sku]", producto.sku || producto.slug || "N/D");
    establecerTexto(
      "[data-categorias]",
      Array.isArray(producto.categorias) ? producto.categorias.join(", ") : producto.categorias || "—"
    );
    establecerTexto(
      "[data-tags]",
      Array.isArray(producto.tags) ? producto.tags.join(", ") : producto.tags || "—"
    );

    // Enlace del breadcrumb a la plataforma
    const enlacePlataforma = document.querySelector("[data-bc-plataforma]");
    if (enlacePlataforma) {
      const plataforma = String(producto.plataforma || "").toLowerCase();
      enlacePlataforma.textContent = plataforma.toUpperCase(); // PS5, PS4, SWITCH…
      // Si estamos en /paginas/, el listado está a la par: ps5.html, ps4.html, etc.
      const href = location.pathname.includes("/paginas/")
        ? `${plataforma}.html`
        : `./paginas/${plataforma}.html`;
      enlacePlataforma.setAttribute("href", href);
    }

    // Imagen principal
    const imagenEl = seleccionarElemento("[data-image]");
    if (imagenEl) {
      imagenEl.src = rutaImagenProducto(producto);
      imagenEl.alt = producto.titulo || producto.nombre || "Producto";
      imagenEl.onerror = () => {
        imagenEl.onerror = null;
        imagenEl.src = `${RUTA_BASE}/imagenes/placeholder.webp`;
      };
    }

    // Variantes
    const contenedorVariantes = seleccionarElemento("[data-variantes]");
    if (contenedorVariantes) {
      const variantes = Array.isArray(producto.variantes) ? producto.variantes : [];
      contenedorVariantes.innerHTML = variantes
        .map(
          (variante, i) =>
            `<button class="btn btn-outline-primary ${i === 0 ? "active" : ""}" data-variant="${variante}">${variante}</button>`
        )
        .join("");
    }

    // Descripción
    establecerTexto("[data-descripcion]", producto.descripcion || producto.description || "—");

    // Relacionados (misma plataforma, distinto slug)
    const pistaRelacionados = seleccionarElemento("[data-related-track]");
    if (pistaRelacionados) {
      const relacionados = catalogo
        .filter(
          (item) =>
            convertirASlug(item.slug || item.titulo || item.nombre || "") !==
              convertirASlug(producto.slug || producto.titulo || producto.nombre || "") &&
            String(item.plataforma || "").toLowerCase() ===
              String(producto.plataforma || "").toLowerCase()
        )
        .slice(0, 10);

      pistaRelacionados.innerHTML = relacionados
        .map(
          (item) => `
        <a class="text-decoration-none" href="${urlDetalleProducto(item)}">
          <div class="card border-0 shadow-sm" style="width:160px">
            <div class="ratio ratio-3x4">
              <img src="${rutaImagenProducto(item)}"
                   class="w-100 h-100 object-fit-cover object-position-top rounded-top"
                   alt="${item.titulo || item.nombre}"
                   onerror="this.onerror=null;this.src='${RUTA_BASE}/imagenes/placeholder.webp'">
            </div>
            <div class="card-body p-2 text-center">
              <div class="small fw-semibold">${item.titulo || item.nombre}</div>
              <div class="small text-muted">${formatearMoneda(item.precio || item.price || 0)}</div>
            </div>
          </div>
        </a>`
        )
        .join("");
    }
  }

  function vincularCantidadYCarrito(producto) {
    const entradaCantidad = seleccionarElemento("[data-qty]");
    seleccionarElemento("[data-qty-incr]")?.addEventListener("click", () => {
      entradaCantidad.value = String(Math.min(99, (+entradaCantidad.value || 1) + 1));
    });
    seleccionarElemento("[data-qty-decr]")?.addEventListener("click", () => {
      entradaCantidad.value = String(Math.max(1, (+entradaCantidad.value || 1) - 1));
    });

    const botonAgregar = seleccionarElemento("[data-add-cart]");
    if (botonAgregar) {
      const imagenActual = seleccionarElemento("[data-image]")?.src || rutaImagenProducto(producto);
      botonAgregar.dataset.id = producto.slug || convertirASlug(producto.titulo || producto.nombre || "producto");
      botonAgregar.dataset.title = producto.titulo || producto.nombre || "Producto";
      botonAgregar.dataset.price = String(producto.precio || producto.price || 0);
      botonAgregar.dataset.img = imagenActual;
      botonAgregar.dataset.plataforma = String(producto.plataforma || "").toLowerCase();
      botonAgregar.addEventListener("click", () => {
        const cantidad = Math.max(1, parseInt(entradaCantidad?.value || "1", 10));
        botonAgregar.dataset.qty = String(cantidad);
      });
    }
  }

  // --------- INICIO ----------
  (async () => {
    try {
      const parametros = new URLSearchParams(location.search);
      const slugParam = convertirASlug(parametros.get("slug") || "");
      const plataformaParam = (parametros.get("plataforma") || "").trim().toLowerCase();

      const CATALOGO = await cargarCatalogo();

      let productoEncontrado =
        CATALOGO.find(
          (p) =>
            convertirASlug(p.slug || p.titulo || p.nombre || "") === slugParam &&
            String(p.plataforma || "").toLowerCase() === plataformaParam
        ) ||
        CATALOGO.find(
          (p) => convertirASlug(p.slug || p.titulo || p.nombre || "") === slugParam
        );

      if (!productoEncontrado) {
        seleccionarElemento("main .container")?.insertAdjacentHTML(
          "beforeend",
          `<div class="alert alert-warning mt-4">Producto no encontrado.</div>`
        );
        document.title = "Producto no encontrado | Tienda";
        return;
      }

      renderizarProducto(productoEncontrado, CATALOGO);
      vincularCantidadYCarrito(productoEncontrado);

      // Vistos: actual (sin duplicar)
      const hrefActual = location.pathname + location.search;
      const tituloActual =
        seleccionarElemento("[data-title]")?.textContent?.trim() ||
        productoEncontrado.titulo ||
        productoEncontrado.nombre ||
        "Producto";
      const imagenActual = seleccionarElemento("[data-image]")?.src || rutaImagenProducto(productoEncontrado);
      guardarVisto({ href: hrefActual, title: tituloActual, img: imagenActual });

      // Vistos: clic en relacionados (sin duplicar y con URL canónica)
      seleccionarElemento("[data-related-track]")?.addEventListener("click", (evento) => {
        const enlace = evento.target.closest("a[href]");
        if (!enlace) return;
        const tarjeta = enlace.closest(".card, .rel-item") || enlace;
        const titulo = tarjeta.querySelector(".small.fw-semibold, h3, .title")?.textContent?.trim() || enlace.title || "Producto";
        const imagen = tarjeta.querySelector("img")?.src || "";
        const url = new URL(enlace.href, location.origin);
        const hrefCanonico = url.pathname + url.search;
        guardarVisto({ href: hrefCanonico, title: titulo, img: imagen });
      });
    } catch (error) {
      console.error(error);
      seleccionarElemento("main .container")?.insertAdjacentHTML(
        "beforeend",
        `<div class="alert alert-danger mt-4">No se pudo cargar el catálogo.</div>`
      );
    }
  })();
});
