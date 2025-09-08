// /js/lib/search-router.js
const ROOT = location.pathname.includes("/paginas/") ? ".." : ".";

document.addEventListener("DOMContentLoaded", () => {
  const form  = document.querySelector(".search-wrap");
  if (!form) return;
  const input = form.querySelector('input[type="search"]');

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = (input.value || "").trim();

    form.reset();      // limpia antes de salir
    input?.blur();

    const url = `${ROOT}/paginas/tienda.html${q ? `?q=${encodeURIComponent(q)}` : ""}`;
    location.href = url; // siempre búsquedas en tienda
  });

  // al volver desde el historial (bfcache), limpia también
  window.addEventListener("pageshow", () => form.reset());
});
