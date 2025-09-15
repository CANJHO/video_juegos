// /js/index.js
import { getVistos, setVistos, getPause, setPause } from "./lib/vistos.js";

/* =============== CONFIG =============== */
const MAXIMO_POR_SECCION = 10;
const DESTACADOS = { ps4: [], switch: [], ps5: [], ps3: [], pc: [] };

/* =============== HELPERS =============== */
const formatearMoneda = (n = 0) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(+n || 0);

// Rutas válidas en / y en /paginas/
const RUTA_BASE = location.pathname.includes("/paginas/") ? ".." : ".";
const rutaImagenProducto = (producto) =>
  `${RUTA_BASE}/imagenes/index/${String(producto.plataforma).toLowerCase()}/${producto.slug}.webp`;

// URL de detalle canónica
const enlaceProducto = (producto) => {
  const parametros = new URLSearchParams({
    slug: producto.slug,
    plataforma: String(producto.plataforma).toLowerCase(),
  });
  return `${RUTA_BASE}/paginas/producto.html?${parametros.toString()}`;
};

// Catálogo (JSON)
async function cargarCatalogo() {
  const url = `${RUTA_BASE}/js/data/catalogo.json`;
  const respuesta = await fetch(url, { cache: "no-store" });
  if (!respuesta.ok) throw new Error("No se pudo cargar catálogo");
  return await respuesta.json();
}

/* =============== CARRUSEL =============== */
function inicializarCarrusel(raiz) {
  const visor = raiz.querySelector("[data-carousel-viewport]");
  const pista = raiz.querySelector("[data-carousel-track]");
  const botonAnterior = raiz.querySelector("[data-carousel-prev]");
  const botonSiguiente = raiz.querySelector("[data-carousel-next]");
  if (!visor || !pista) return;

  const espacio = () => parseFloat(getComputedStyle(pista).gap || 0) || 0;
  const paso = () =>
    (pista.querySelector(".card")?.getBoundingClientRect().width || 260) + espacio();

  botonAnterior?.addEventListener("click", (evento) => {
    evento.preventDefault();
    visor.scrollBy({ left: -paso() * 2, behavior: "smooth" });
  });
  botonSiguiente?.addEventListener("click", (evento) => {
    evento.preventDefault();
    visor.scrollBy({ left: paso() * 2, behavior: "smooth" });
  });

  // arrastre táctil
  let estaPresionando = false;
  let inicioX = 0;
  let desplazamientoInicial = 0;

  visor.addEventListener("pointerdown", (evento) => {
    if (evento.pointerType !== "touch") return;
    estaPresionando = true;
    inicioX = evento.clientX;
    desplazamientoInicial = visor.scrollLeft;
    visor.setPointerCapture(evento.pointerId);
  });
  visor.addEventListener("pointermove", (evento) => {
    if (!estaPresionando) return;
    visor.scrollLeft = desplazamientoInicial - (evento.clientX - inicioX);
  });
  ["pointerup", "pointerleave"].forEach((tipo) =>
    visor.addEventListener(tipo, () => {
      estaPresionando = false;
    })
  );

  // navegación por clic (opcional, hace clic en el enlace interno)
  pista.addEventListener("click", (evento) => {
    const enlace = evento.target.closest("a[href]");
    if (!enlace) return;
    if (evento.ctrlKey || evento.metaKey || evento.button === 1) return;
    enlace.click();
  });
}

/* =============== RENDER TARJETAS =============== */
const tarjetaProducto = (producto) => `
  <article class="card border-0 shadow-sm" style="min-width:220px;max-width:260px;">
    <a href="${enlaceProducto(producto)}" class="d-block" target="_self" rel="noopener">
      <div class="ratio ratio-3x4">
        <img src="${rutaImagenProducto(producto)}"
             class="w-100 h-100 object-fit-cover object-position-top rounded-top"
             alt="${producto.titulo}" loading="lazy">
      </div>
    </a>
    <div class="card-body text-center">
      <h3 class="h6 mb-2">
        <a href="${enlaceProducto(producto)}" class="text-decoration-none" target="_self" rel="noopener">
          ${producto.titulo}
        </a>
      </h3>
      <p class="mb-0 fw-semibold">${formatearMoneda(producto.precio)}</p>
    </div>
  </article>
`;

/* =============== VISTOS RECIENTES =============== */
function renderizarRecientes() {
  const contenedor = document.querySelector("[data-recent-list]");
  if (!contenedor) return;

  // reconstruye imagen si algún registro viejo no la tiene
  const imagenDesdeHref = (href) => {
    try {
      const url = new URL(href, location.origin);
      const parametros = new URLSearchParams(url.search);
      const plataforma = (parametros.get("plataforma") || "").toLowerCase();
      const slug = parametros.get("slug") || "";
      return plataforma && slug ? `${RUTA_BASE}/imagenes/index/${plataforma}/${slug}.webp` : "";
    } catch {
      return "";
    }
  };

  const listaVistos = getVistos();
  if (!listaVistos.length) {
    contenedor.className = "recent-grid";
    contenedor.innerHTML = `<span class="text-muted">Aún no tienes vistos.</span>`;
    actualizarBotonesRecientes();
    return;
  }

  contenedor.className = "recent-grid";
  contenedor.innerHTML = listaVistos
    .map((visto) => {
      const imagen = visto.img && visto.img.trim() ? visto.img : imagenDesdeHref(visto.href);
      return `
        <a href="${visto.href}" class="text-decoration-none">
          <div class="recent-card">
            <img src="${imagen}" alt="${visto.title}">
            <div>
              <div class="recent-title">${visto.title}</div>
              <div class="recent-date">${new Date(visto.ts).toLocaleDateString()}</div>
            </div>
          </div>
        </a>`;
    })
    .join("");

  actualizarBotonesRecientes();
}

function actualizarBotonesRecientes() {
  const botonLimpiar = document.getElementById("recClear");
  const botonPausar = document.getElementById("recToggle");

  if (botonLimpiar) {
    botonLimpiar.disabled = getVistos().length === 0;
    botonLimpiar.onclick = () => {
      setVistos([]);
      renderizarRecientes();
    };
  }
  if (botonPausar) {
    const enPausa = getPause();
    botonPausar.textContent = enPausa ? "Reanudar" : "Pausar";
    botonPausar.onclick = () => {
      setPause(!getPause());
      actualizarBotonesRecientes();
    };
  }
}

// pinta recientes si el DOM ya está listo
document.addEventListener("DOMContentLoaded", renderizarRecientes);

/* =========================== BUSCADOR (redirige a tienda) =========================== */
function configurarBuscador() {
  const formulario = document.querySelector(".search-wrap");
  if (!formulario) return;
  const campo = formulario.querySelector('input[type="search"]');

  // Si estamos en tienda, tienda.js maneja el filtrado.
  const estaEnTienda = location.pathname.includes("/paginas/tienda.html");
  if (estaEnTienda) return;

  // En cualquier otra página → redirigir a tienda.html?q=...
  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const base = location.pathname.includes("/paginas/") ? ".." : ".";
    const consulta = (campo.value || "").trim();
    const url = `${base}/paginas/tienda.html${consulta ? `?q=${encodeURIComponent(consulta)}` : ""}`;
    formulario.reset();
    location.href = url;
  });

  // Al volver con Atrás desde tienda, vacía el input restaurado por bfcache
  window.addEventListener("pageshow", () => {
    if (campo) campo.value = "";
  });
}
configurarBuscador();

/* =============== INICIO (BOOT) =============== */
async function iniciar() {
  try {
    const catalogo = await cargarCatalogo();

    // Render por cada sección [data-feed]
    document.querySelectorAll("[data-carousel-track]").forEach((pista) => {
      const plataforma = (pista.dataset.feed || pista.closest("section")?.id || "").toLowerCase();

      const seleccion = DESTACADOS[plataforma] && DESTACADOS[plataforma].length
        ? DESTACADOS[plataforma]
            .map((ref) =>
              catalogo.find(
                (producto) =>
                  producto.slug === ref.slug &&
                  String(producto.plataforma).toLowerCase() === ref.plataforma
              )
            )
            .filter(Boolean)
        : catalogo.filter((producto) => String(producto.plataforma).toLowerCase() === plataforma);

      pista.innerHTML = seleccion.slice(0, MAXIMO_POR_SECCION).map(tarjetaProducto).join("");
    });

    // Carruseles y recientes
    document.querySelectorAll("[data-carousel]").forEach(inicializarCarrusel);
    renderizarRecientes();

    // Guardar “vistos” al click en cards
    document.body.addEventListener("click", (evento) => {
      const enlace = evento.target.closest("[data-carousel-track] a[href]");
      if (!enlace) return;

      const elementoTarjeta = enlace.closest(".card");
      const imagenElemento = elementoTarjeta?.querySelector("img");

      const url = new URL(enlace.href, location.origin);
      const hrefNormalizado = url.pathname + url.search;

      const titulo = elementoTarjeta?.querySelector("h3")?.innerText?.trim() || imagenElemento?.alt || "Producto";
      const imagen = imagenElemento?.currentSrc || imagenElemento?.src || "";

      const lista = getVistos().filter((visto) => visto.href !== hrefNormalizado);
      lista.unshift({ href: hrefNormalizado, title: titulo, img: imagen, ts: Date.now() });
      setVistos(lista.slice(0, 30));
      renderizarRecientes();
    });
  } catch (error) {
    console.error(error);
    alert("No se pudo cargar el catálogo.");
  }
}
iniciar();
