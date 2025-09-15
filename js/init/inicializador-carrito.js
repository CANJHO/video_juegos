// /js/init/inicializador-carrito.js
import { bindAddToCart, bindCartFrame, syncCartBadge, onCartChanged } from "../lib/cart.js";

function iniciarCarrito() {
  bindCartFrame();
  bindAddToCart();
  syncCartBadge();
  onCartChanged(syncCartBadge);
}
iniciarCarrito();

window.addEventListener("storage", (e) => {
  if (e.key === "cart:v1" || e.key === "cartCount") syncCartBadge();
});
