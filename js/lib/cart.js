// /js/lib/cart.js
const CART_KEY = "cart:v1";

const $ = (s, r=document) => r.querySelector(s);
const format = (n)=> new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN"}).format(+n||0);

export function getCart(){ try{return JSON.parse(localStorage.getItem(CART_KEY)||"[]");}catch{return[];} }
export function setCart(arr){ localStorage.setItem(CART_KEY, JSON.stringify(arr)); renderBadge(); }
export function getCount(){ return getCart().reduce((a,i)=>a+i.qty,0); }
export function getSubtotal(){ return getCart().reduce((a,i)=>a+i.price*i.qty,0); }

export function addItem({id, title, price, img, qty=1, meta={}}){
  const cart = getCart();
  const k = (x)=> `${x.id}|${JSON.stringify(x.meta||{})}`;
  const ix = cart.findIndex(x => k(x)===k({id,meta}));
  if (ix>=0) cart[ix].qty = Math.min(99, cart[ix].qty + qty);
  else cart.unshift({id,title,price: +price||0,img,qty,meta});
  setCart(cart);
  toast(`${title} añadido`);
  openDrawer(); // abrir como en tu segunda imagen
  renderDrawer();
}

export function removeItem(idx){
  const cart = getCart(); cart.splice(idx,1); setCart(cart); renderDrawer();
}
export function changeQty(idx,delta){
  const cart = getCart(); if(!cart[idx]) return;
  cart[idx].qty = Math.max(1, Math.min(99, cart[idx].qty + delta));
  setCart(cart); renderDrawer();
}

/* ---------- UI (drawer/badge/toast) ---------- */
export function renderBadge(){
  const el = document.getElementById("cartCount");
  if (el) el.textContent = String(getCount());
}

export function openDrawer(){ document.body.classList.add("cart-open"); renderDrawer(); }
export function closeDrawer(){ document.body.classList.remove("cart-open"); }

export function renderDrawer(){
  const pane = $("#cartDrawer");
  if (!pane) return;
  const list = pane.querySelector("[data-cart-list]");
  const subtotalEl = pane.querySelector("[data-cart-subtotal]");
  const empty = pane.querySelector("[data-cart-empty]");
  const full  = pane.querySelector("[data-cart-full]");

  const cart = getCart();
  if (!cart.length){
    empty.classList.remove("d-none"); full.classList.add("d-none");
    subtotalEl.textContent = format(0);
    list.innerHTML = "";
    return;
  }

  empty.classList.add("d-none"); full.classList.remove("d-none");
  list.innerHTML = cart.map((it, i)=>`
    <div class="d-flex gap-2 align-items-center py-2 border-bottom">
      <img src="${it.img}" alt="${it.title}" class="rounded" style="width:56px;height:56px;object-fit:cover">
      <div class="flex-grow-1">
        <div class="fw-semibold small">${it.title}</div>
        <div class="text-muted small">${it.qty} × ${format(it.price)}</div>
      </div>
      <div class="btn-group btn-group-sm">
        <button class="btn btn-outline-secondary" data-dec="${i}">−</button>
        <button class="btn btn-outline-secondary" data-inc="${i}">+</button>
      </div>
      <button class="btn btn-sm btn-link text-danger" data-del="${i}">✕</button>
    </div>
  `).join("");

  subtotalEl.textContent = format(getSubtotal());

  // eventos internos
  list.onclick = (e)=>{
    const dec = e.target.closest("[data-dec]"); const inc = e.target.closest("[data-inc]");
    const del = e.target.closest("[data-del]");
    if (dec) changeQty(+dec.dataset.dec, -1);
    if (inc) changeQty(+inc.dataset.inc, +1);
    if (del) removeItem(+del.dataset.del);
  };
}

/* ---------- Delegado global “añadir al carrito” ---------- */
/* Usa en cualquier página botones con data-add-cart y data-* */
export function bindAddToCart(){
  document.addEventListener("click",(e)=>{
    const btn = e.target.closest("[data-add-cart]");
    if (!btn) return;
    const dataset = btn.dataset;
    const qty = parseInt(dataset.qty || dataset.addQty || "1",10) || 1;
    addItem({
      id: dataset.id || dataset.slug || btn.getAttribute("href") || crypto.randomUUID(),
      title: dataset.title || btn.title || btn.textContent.trim() || "Producto",
      price: parseFloat(dataset.price || "0"),
      img: dataset.img || (document.querySelector(dataset.imgSelector||"")?.src) || "",
      qty,
      meta: { plataforma: dataset.plataforma || "", sku: dataset.sku || "" }
    });
  });
}

/* ---------- Overlay & cerrar ---------- */
export function bindCartFrame(){
  $("#cartOpen")?.addEventListener("click",(e)=>{ e.preventDefault(); openDrawer(); });
  $("#cartClose")?.addEventListener("click",(e)=>{ e.preventDefault(); closeDrawer(); });
  $("#cartOverlay")?.addEventListener("click", ()=> closeDrawer());
  renderBadge(); renderDrawer();
}

/* ---------- Toast minimal ---------- */
function toast(msg){
  let t = document.createElement("div");
  t.className = "cart-toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=> t.classList.add("show"), 10);
  setTimeout(()=> { t.classList.remove("show"); t.addEventListener("transitionend",()=>t.remove(),{once:true}); }, 1600);
}
