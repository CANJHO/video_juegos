// /js/lib/vistos.js
const REC_KEY = "vistos";
const PAUSE_KEY = "vistos:pause";

export const getPause = () => localStorage.getItem(PAUSE_KEY) === "1";
export const setPause = (v) => localStorage.setItem(PAUSE_KEY, v ? "1" : "0");

export function getVistos() {
  try { return JSON.parse(localStorage.getItem(REC_KEY) || "[]"); }
  catch { return []; }
}
export function setVistos(arr) {
  localStorage.setItem(REC_KEY, JSON.stringify(arr));
}
export function addVisto(item) {
  if (getPause()) return;
  const vistos = getVistos();
  const i = vistos.findIndex(v => v.href === item.href);
  if (i !== -1) vistos.splice(i, 1);
  vistos.unshift({ ...item, ts: Date.now() });
  setVistos(vistos.slice(0, 12));
}
