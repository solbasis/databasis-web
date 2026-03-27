// ─── BASIS Website — Main Entry ──────────────────────────────────────────────
import { initTyping, initGrid } from './hero.js';
import { initPrices } from './prices.js';

document.addEventListener('DOMContentLoaded', () => {
  initGrid();
  initTyping();
  initPrices();
});
