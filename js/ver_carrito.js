// /js/carrito.js
import { onCartChanged } from "./lib/cart.js";

const CLAVE_CARRITO = "cart:v1";
const CUPONES = {
  "GAMER10": { tipo: "porcentaje", valor: 0.10, mensaje: "10% de descuento aplicado" },
  "ENVIO0":  { tipo: "envio", valor: 0,    mensaje: "¡Envío gratis!" },
};

let cuponActivo = null;
let costoEnvio = 0;

/* =================== UTILIDADES =================== */
const formatearMoneda = (n = 0) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(+n || 0);

function leerCarrito() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_CARRITO) || "[]");
    // normaliza cantidades
    return Array.isArray(datos)
      ? datos.map(it => ({ ...it, qty: Math.max(1, parseInt(it.qty || 1, 10)) }))
      : [];
  } catch {
    return [];
  }
}

function escribirCarrito(lista) {
  localStorage.setItem(CLAVE_CARRITO, JSON.stringify(lista));
  // actualiza badge si existe
  const totalUnidades = lista.reduce((s, it) => s + (Number(it.qty) || 0), 0);
  const badge = document.getElementById("cartCount");
  if (badge) badge.textContent = String(totalUnidades);
}

/* ============= SELECCIÓN SCOPED ============= */
function $(selector) { return document.querySelector(selector); }
function enPagina(selector) {
  const main = document.querySelector("main");
  return main ? main.querySelector(selector) : null;
}

/* =================== RENDER LISTA =================== */
function plantillaItem(item) {
  const imagen = item.img || "";
  const titulo = item.title || "Producto";
  const precio = Number(item.price) || 0;
  const cantidad = Number(item.qty) || 1;
  const id = item.id || item.slug || titulo;

  return `
    <div class="border-top py-3" data-id="${id}">
      <div class="row align-items-center g-2">
        <!-- Columna PRODUCTO (imagen + título + quitar) -->
        <div class="col-12 col-md-6 d-flex align-items-center gap-3">
          <div class="ratio ratio-1x1" style="width:72px;">
            <img src="${imagen}" alt="${titulo}" class="w-100 h-100 object-fit-cover rounded"
                 onerror="this.onerror=null;this.src='../imagenes/placeholder.webp'">
          </div>
          <div class="flex-grow-1">
            <div class="fw-semibold">${titulo}</div>
            ${item.plataforma ? `<div class="text-muted small text-uppercase">${item.plataforma}</div>` : ""}
            <button class="btn btn-sm btn-link text-danger p-0 mt-1" data-accion="eliminar">Quitar</button>
          </div>
        </div>

        <!-- Columna PRECIO -->
        <div class="col-4 col-md-2 text-md-center">
          <div class="small text-muted d-md-none">Precio</div>
          <div class="fw-semibold">${formatearMoneda(precio)}</div>
        </div>

        <!-- Columna CANTIDAD -->
        <div class="col-8 col-md-2">
          <div class="small text-muted d-md-none">Cantidad</div>
          <div class="d-flex align-items-center justify-content-md-center gap-2">
            <button class="btn btn-sm btn-outline-secondary" data-accion="decrementar">−</button>
            <input class="form-control form-control-sm text-center" style="max-width:70px"
                   value="${cantidad}" data-cantidad inputmode="numeric" pattern="\\d*">
            <button class="btn btn-sm btn-outline-secondary" data-accion="incrementar">+</button>
          </div>
        </div>

        <!-- Columna SUBTOTAL -->
        <div class="col-12 col-md-2 text-md-end">
          <div class="small text-muted d-md-none">Subtotal</div>
          <div class="fw-semibold" data-subtotal-item>
            ${formatearMoneda(precio * cantidad)}
          </div>
        </div>
      </div>
    </div>
  `;
}


function renderizarLista() {
  const contenedorLista = enPagina("[data-cart-list]");
  const bloqueVacio     = enPagina("[data-cart-empty]");
  const bloqueLleno     = enPagina("[data-cart-full]");
  const etiquetaSubtotal= enPagina("[data-cart-subtotal]");
  if (!contenedorLista) return;

  const items = leerCarrito();

  if (!items.length) {
    contenedorLista.innerHTML = "";
    bloqueVacio?.classList.remove("d-none");
    bloqueLleno?.classList.add("d-none");
    if (etiquetaSubtotal) etiquetaSubtotal.textContent = formatearMoneda(0);
    actualizarTotales(); // resetea totales extendidos
    return;
  }

  contenedorLista.innerHTML = items.map(plantillaItem).join("");

  bloqueVacio?.classList.add("d-none");
  bloqueLleno?.classList.remove("d-none");

  const subtotal = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 1), 0);
  if (etiquetaSubtotal) etiquetaSubtotal.textContent = formatearMoneda(subtotal);

  actualizarTotales(); // sincroniza totales extendidos
}

/* =================== TOTALES EXTENDIDOS =================== */
function calcularSubtotal(items) {
  return items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 1), 0);
}

function actualizarTotales() {
  const items = leerCarrito();
  const subtotal = calcularSubtotal(items);

  let descuento = 0;
  let envio = Number(costoEnvio || 0);

  if (cuponActivo?.tipo === "porcentaje") {
    descuento = Math.round(subtotal * cuponActivo.valor * 100) / 100;
  } else if (cuponActivo?.tipo === "envio") {
    envio = 0;
  }

  const total = Math.max(0, subtotal - descuento) + envio;

  const montoSubtotal = enPagina("[data-cart-subtotal]");
  const montoDescuento= enPagina("#montoDescuento");
  const montoEnvio    = enPagina("#montoEnvio");
  const montoTotal    = enPagina("#montoTotal");

  if (montoSubtotal)  montoSubtotal.textContent = formatearMoneda(subtotal);
  if (montoDescuento) montoDescuento.textContent = formatearMoneda(descuento);
  if (montoEnvio)     montoEnvio.textContent = formatearMoneda(envio);
  if (montoTotal)     montoTotal.textContent = formatearMoneda(total);
}

/* =================== EVENTOS DE PÁGINA =================== */
function vincularEventosDeLista() {
  const contenedorLista = enPagina("[data-cart-list]");
  if (!contenedorLista) return;

  contenedorLista.addEventListener("click", (evento) => {
    const fila = evento.target.closest("[data-id]");
    if (!fila) return;
    const id = fila.getAttribute("data-id");
    let items = leerCarrito();

    if (evento.target.matches("[data-accion='eliminar']")) {
      items = items.filter((it) => (it.id || it.slug) !== id);
      escribirCarrito(items);
      renderizarLista();
      return;
    }

    if (evento.target.matches("[data-accion='incrementar'], [data-accion='decrementar']")) {
      items = items.map((it) => {
        if ((it.id || it.slug) !== id) return it;
        const delta = evento.target.matches("[data-accion='incrementar']") ? 1 : -1;
        const nueva = Math.max(1, (Number(it.qty) || 1) + delta);
        return { ...it, qty: nueva };
      });
      escribirCarrito(items);
      // Actualiza solo la fila (opcionalmente podrías re-renderizar todo)
      const actualizado = items.find((it) => (it.id || it.slug) === id);
      const input = fila.querySelector("[data-cantidad]");
      const celdaSubtotal = fila.querySelector("[data-subtotal-item]");
      if (input) input.value = String(actualizado.qty);
      if (celdaSubtotal)
        celdaSubtotal.textContent = formatearMoneda((Number(actualizado.price) || 0) * actualizado.qty);
      actualizarTotales();
    }
  });

  // Cambios por tipeo en el input de cantidad
  contenedorLista.addEventListener("change", (evento) => {
    if (!evento.target.matches("[data-cantidad]")) return;
    const fila = evento.target.closest("[data-id]");
    if (!fila) return;
    const id = fila.getAttribute("data-id");
    let items = leerCarrito();
    const nueva = Math.max(1, parseInt(evento.target.value || "1", 10));
    items = items.map((it) => ( (it.id || it.slug) === id ? { ...it, qty: nueva } : it ));
    escribirCarrito(items);
    // refresca subtotal de la fila y totales
    const actualizado = items.find((it) => (it.id || it.slug) === id);
    fila.querySelector("[data-subtotal-item]").textContent =
      formatearMoneda((Number(actualizado.price) || 0) * nueva);
    actualizarTotales();
  });
}

function vincularCuponYEnvio() {
  const inputCupon   = enPagina("#cuponInput");
  const botonCupon   = enPagina("#aplicarCupon");
  const mensajeCupon = enPagina("#cuponMensaje");
  const selectEnvio  = enPagina("#envioSelect");

  botonCupon?.addEventListener("click", () => {
    const codigo = (inputCupon?.value || "").trim().toUpperCase();
    if (CUPONES[codigo]) {
      cuponActivo = CUPONES[codigo];
      if (mensajeCupon) mensajeCupon.textContent = cuponActivo.mensaje;
    } else {
      cuponActivo = null;
      if (mensajeCupon) mensajeCupon.textContent = "Cupón inválido.";
    }
    actualizarTotales();
  });

  selectEnvio?.addEventListener("change", () => {
    costoEnvio = Number(selectEnvio.value || 0);
    actualizarTotales();
  });
}

/* =================== INICIO =================== */
document.addEventListener("DOMContentLoaded", () => {
  // pinta lista inicial
  renderizarLista();
  vincularEventosDeLista();
  vincularCuponYEnvio();

  // si el carrito cambia (desde el drawer o en otra pestaña), actualiza
  onCartChanged(() => {
    renderizarLista();
  });

  window.addEventListener("storage", (e) => {
    if (e.key === CLAVE_CARRITO) renderizarLista();
  });
});
