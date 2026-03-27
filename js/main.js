// ─── BASIS Website — Main Entry ──────────────────────────────────────────────
import { initTyping, initGrid } from './hero.js';
import { initPrices } from './prices.js';
import { initToken } from './token.js';
import { initFooter } from './footer.js';
import { BASIS_MINT } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
  initGrid();
  initTyping();
  initPrices();
  initToken();
  initFooter();
  const el = document.getElementById('officialAddr');
  if (el) el.textContent = BASIS_MINT;
});
