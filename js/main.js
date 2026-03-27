// ─── BASIS Website — Main Entry ──────────────────────────────────────────────
import { initTyping, initGrid } from './hero.js';
import { initPrices } from './prices.js';
import { initToken } from './token.js';

document.addEventListener('DOMContentLoaded', () => {
  initGrid();
  initTyping();
  initPrices();
  initToken();
});
