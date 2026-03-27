// ─── Token Section ────────────────────────────────────────────────────────────
import { BASIS_MINT, DEX_LINK } from './config.js';

function setHref(id, url) {
  const el = document.getElementById(id);
  if (el) el.href = url;
}

function initLinks() {
  document.getElementById('addrBox').textContent = BASIS_MINT;
  setHref('dexLink',     `https://dexscreener.com/solana/${BASIS_MINT}`);
  setHref('solscanLink', `https://solscan.io/token/${BASIS_MINT}`);
  setHref('pumpLink',    `https://pump.fun/coin/${BASIS_MINT}`);
  setHref('orbLink',     `https://orb.helius.dev/address/${BASIS_MINT}/markets?sort_by=volume24h&sort_type=desc`);
  setHref('mobyLink',    `https://www.mobyscreener.com/solana/${BASIS_MINT}`);
}

function initCopy() {
  const addrBox = document.getElementById('addrBox');
  const toast   = document.getElementById('toast');
  const copyBtn = document.getElementById('copyBtn');
  if (!addrBox || !toast || !copyBtn) return;

  let toastTmr = null;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    addrBox.classList.add('copied');
    clearTimeout(toastTmr);
    toastTmr = setTimeout(() => {
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
      showToast('✓ Address copied to clipboard');
    } catch {
      showToast('Copy failed — select and copy manually');
    }
  }

  copyBtn.addEventListener('click', copyCA);
  addrBox.addEventListener('click', copyCA);
}

export function initToken() {
  initLinks();
  initCopy();
}
