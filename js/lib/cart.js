// /js/lib/cart.js  — Reemplazo total
// Carrito simple con persistencia en localStorage y badge sincronizado

/* ======================== STORAGE ======================== */
const CART_KEY = "cart:v1"; // donde se guarda el carrito

const $ = (s, r = document) => r.querySelector(s);
const fmt = (n) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(+n || 0);

export function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); }
  catch { return []; }
}
export function getCount() {
  return getCart().reduce((a, i) => a + (i.qty || 0), 0);
}
export function getSubtotal() {
  return getCart().reduce((a, i) => a + (i.price || 0) * (i.qty || 0), 0);
}

// Notifica a la UI y a otras pestañas
function broadcast() {
  const detail = { count: getCount(), subtotal: getSubtotal() };
  // para otras páginas/pestañas que escuchen "storage"
  localStorage.setItem("cartCount", String(detail.count));
  // evento en esta pestaña
  window.dispatchEvent(new CustomEvent("cart:updated", { detail }));
}

export function setCart(arr) {
  localStorage.setItem(CART_KEY, JSON.stringify(arr));
  syncCartBadge();
  broadcast();
}

/* ======================== MUTACIONES ======================== */
export function addItem({ id, title, price, img, qty = 1, meta = {} }) {
  const cart = getCart();

  // clave estable por id + meta
  const key = (x) => `${x.id}|${JSON.stringify(x.meta || {})}`;
  const ix = cart.findIndex((x) => key(x) === key({ id, meta }));

  if (ix >= 0) cart[ix].qty = Math.min(99, (cart[ix].qty || 0) + qty);
  else cart.unshift({ id, title, price: +price || 0, img, qty, meta });

  setCart(cart);
  toast(`${title || "Producto"} añadido`);
  openDrawer();
  renderDrawer();
}

export function removeItem(idx) {
  const cart = getCart();
  cart.splice(idx, 1);
  setCart(cart);
  renderDrawer();
}

export function changeQty(idx, delta) {
  const cart = getCart();
  if (!cart[idx]) return;
  cart[idx].qty = Math.max(1, Math.min(99, (cart[idx].qty || 1) + delta));
  setCart(cart);
  renderDrawer();
}

/* ======================== BADGE ======================== */
export function syncCartBadge() {
  const el = document.getElementById("cartCount");
  if (!el) return;
  const count = getCount();
  el.textContent = String(count);
  // opcional: colores según cantidad (ajusta a tu CSS)
  el.classList.toggle("bg-warning", count > 0);
  el.classList.toggle("bg-danger", count === 0);
  el.classList.toggle("bg-secondary", count === 0);
}

// alias por compatibilidad si en algún lado llaman renderBadge()
export function renderBadge() { syncCartBadge(); }

export function onCartChanged(fn) {
  window.addEventListener("cart:updated", () => fn());
}

/* ======================== DRAWER ======================== */
export function openDrawer() {
  document.body.classList.add("cart-open");
  renderDrawer();
}
export function closeDrawer() {
  document.body.classList.remove("cart-open");
}

export function renderDrawer() {
  const pane = $("#cartDrawer");
  if (!pane) return;

  const list = pane.querySelector("[data-cart-list]");
  const subtotalEl = pane.querySelector("[data-cart-subtotal]");
  const empty = pane.querySelector("[data-cart-empty]");
  const full = pane.querySelector("[data-cart-full]");

  const cart = getCart();

  if (!cart.length) {
    empty?.classList.remove("d-none");
    full?.classList.add("d-none");
    if (subtotalEl) subtotalEl.textContent = fmt(0);
    if (list) list.innerHTML = "";
    return;
  }

  empty?.classList.add("d-none");
  full?.classList.remove("d-none");

  if (list) {
    list.innerHTML = cart
      .map(
        (it, i) => `
      <div class="d-flex gap-2 align-items-center py-2 border-bottom">
        <img src="${it.img || ""}" alt="${it.title || ""}"
             class="rounded" style="width:56px;height:56px;object-fit:cover">
        <div class="flex-grow-1">
          <div class="fw-semibold small">${it.title || ""}</div>
          <div class="text-muted small">${it.qty} × ${fmt(it.price)}</div>
        </div>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary" data-dec="${i}">−</button>
          <button class="btn btn-outline-secondary" data-inc="${i}">+</button>
        </div>
        <button class="btn btn-sm btn-link text-danger" data-del="${i}" aria-label="Quitar">✕</button>
      </div>`
      )
      .join("");

    list.onclick = (e) => {
      const dec = e.target.closest("[data-dec]");
      const inc = e.target.closest("[data-inc]");
      const del = e.target.closest("[data-del]");
      if (dec) changeQty(+dec.dataset.dec, -1);
      if (inc) changeQty(+inc.dataset.inc, +1);
      if (del) removeItem(+del.dataset.del);
    };
  }

  if (subtotalEl) subtotalEl.textContent = fmt(getSubtotal());
}

/* ======================== BINDINGS ======================== */
// Botones con data-add-cart y data-* en cualquier página
export function bindAddToCart() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add-cart]");
    if (!btn) return;

    const ds = btn.dataset;
    const qty = Math.max(1, parseInt(ds.qty || ds.addQty || "1", 10) || 1);

    addItem({
      id: ds.id || ds.slug || btn.getAttribute("href") || crypto.randomUUID(),
      title: ds.title || btn.title || btn.textContent.trim() || "Producto",
      price: parseFloat(ds.price || "0"),
      img: ds.img || (document.querySelector(ds.imgSelector || "")?.src) || "",
      qty,
      meta: {
        plataforma: ds.plataforma || "",
        sku: ds.sku || "",
      },
    });
  });
}

// Enlaza el botón del carrito y el overlay; pinta UI inicial
export function bindCartFrame() {
  $("#cartOpen")?.addEventListener("click", (e) => { e.preventDefault(); openDrawer(); });
  $("#cartClose")?.addEventListener("click", (e) => { e.preventDefault(); closeDrawer(); });
  $("#cartOverlay")?.addEventListener("click", () => closeDrawer());

  // Pintado inicial
  syncCartBadge();
  renderDrawer();
}

/* ======================== TOAST ======================== */
function toast(msg = "") {
  const t = document.createElement("div");
  t.className = "cart-toast";
  t.textContent = msg;
  document.body.appendChild(t);
  // animación simple
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => {
    t.classList.remove("show");
    t.addEventListener("transitionend", () => t.remove(), { once: true });
  }, 1600);
}
