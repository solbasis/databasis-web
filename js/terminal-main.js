// ─── Terminal Dashboard — Main Entry ─────────────────────────────────────────
import { initPrices } from './prices.js';
import { BASIS_MINT, DEX_LINK } from './config.js';
import './terminal.js';

document.addEventListener('DOMContentLoaded', () => {
  // ── Prices ──────────────────────────────────────────────────────────────────
  initPrices();

  // ── Contract address display & copy (primary — dashboard tab) ────────────
  setupAddrCopy('addrBox', 'copyBtn', 'toast');

  // ── Contract address display & copy (secondary — token tab) ─────────────
  setupAddrCopy('addrBox2', 'copyBtn2', 'toast2');

  // ── Explorer links (token tab secondary set) ──────────────────────────────
  setHref('dexLink2',     `https://dexscreener.com/solana/${BASIS_MINT}`);
  setHref('solscanLink2', `https://solscan.io/token/${BASIS_MINT}`);
  setHref('pumpLink2',    `https://pump.fun/coin/${BASIS_MINT}`);
  setHref('orbLink2',     `https://orb.helius.dev/address/${BASIS_MINT}/markets?sort_by=volume24h&sort_type=desc`);
  setHref('mobyLink',     `https://www.mobyscreener.com/solana/${BASIS_MINT}`);

  // ── Explorer links (dashboard tab) ───────────────────────────────────────
  setHref('dexLink',     `https://dexscreener.com/solana/${BASIS_MINT}`);
  setHref('solscanLink', `https://solscan.io/token/${BASIS_MINT}`);
  setHref('pumpLink',    `https://pump.fun/coin/${BASIS_MINT}`);
  setHref('orbLink',     `https://orb.helius.dev/address/${BASIS_MINT}/markets?sort_by=volume24h&sort_type=desc`);

  // ── Official address (security section) ──────────────────────────────────
  const officialEl = document.getElementById('officialAddr');
  if (officialEl) officialEl.textContent = BASIS_MINT;

  // ── Mirror price updates to token tab ────────────────────────────────────
  window.addEventListener('basisPriceUpdate', (e) => {
    const { basisPrice, mcap } = e.detail;

    const tokPrice = document.getElementById('tok-price');
    const tokMcap  = document.getElementById('tok-mcap');

    if (tokPrice && basisPrice) {
      tokPrice.textContent = basisPrice < 0.001
        ? `$${basisPrice.toFixed(8)}`
        : `$${basisPrice.toFixed(6)}`;
    }
    if (tokMcap && mcap) {
      tokMcap.textContent = fmtUSD(mcap);
    }
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function setHref(id, url) {
  const el = document.getElementById(id);
  if (el) el.href = url;
}

function fmtUSD(n) {
  if (!n || isNaN(n)) return '$—';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(4);
}

function setupAddrCopy(addrBoxId, copyBtnId, toastId) {
  const addrBox = document.getElementById(addrBoxId);
  const copyBtn = document.getElementById(copyBtnId);
  const toast   = document.getElementById(toastId);
  if (!addrBox) return;

  addrBox.textContent = BASIS_MINT;

  let timer = null;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    addrBox.classList.add('copied');
    clearTimeout(timer);
    timer = setTimeout(() => {
      toast.classList.remove('show');
      addrBox.classList.remove('copied');
    }, 2200);
  }

  async function copyCA() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(BASIS_MINT);
      } else {
        const ta = Object.assign(document.createElement('textarea'), { value: BASIS_MINT });
        ta.style.cssText = 'position:fixed;left:-9999px;top:0;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showToast('✓ Address copied');
    } catch {
      showToast('Select and copy manually');
    }
  }

  addrBox.addEventListener('click', copyCA);
  copyBtn?.addEventListener('click', copyCA);
}
