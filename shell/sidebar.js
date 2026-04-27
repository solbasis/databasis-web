/* ════════════════════════════════════════════════════════════════════════
   BASIS Shell — shared sidebar across the ecosystem
   Hosted at https://databasis.info/shell/sidebar.js
   IIFE, vanilla JS, zero deps. Auto-mounts on script load.

   Each app integrates with two lines in its <head>:
     <link rel="stylesheet" href="https://databasis.info/shell/sidebar.css">
     <script src="https://databasis.info/shell/sidebar.js" defer></script>

   Opt-out: add `data-basis-shell="off"` to <body> before script loads.
   ════════════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  // Don't double-mount if shell loaded twice
  if (window.__BASIS_SHELL__) return;
  window.__BASIS_SHELL__ = true;

  // Opt-out flag on body — useful for full-screen game embeds etc.
  if (document.body && document.body.dataset.basisShell === 'off') return;

  const BASIS_MINT = 'A5BJBQUTR5sTzkM89hRDuApWyvgjdXpR7B7rW1r9pump';

  // ─── App registry ─────────────────────────────────────────────────────
  const APPS = [
    { id: 'terminal', name: 'Terminal', icon: '▣', url: 'https://databasis.info',          desc: 'analytics + ecosystem hub' },
    { id: 'burn',     name: 'Burn',     icon: '🔥', url: 'https://burn.databasis.info',     desc: 'recover SOL from dust' },
    { id: 'dao',      name: 'DAO',      icon: '◉', url: 'https://dao.databasis.info',      desc: 'on-chain governance' },
    { id: 'chat',     name: 'Chat',     icon: '⌬', url: 'https://chat.databasis.info',     desc: 'terminal chatroom' },
    { id: 'game',     name: 'Game',     icon: '▶', url: 'https://game.databasis.info',     desc: 'defi tower defense' },
    { id: 'art',      name: 'Art',      icon: '▦', url: 'https://art.databasis.info',      desc: 'pixel + ASCII studio' },
    { id: 'deployer', name: 'Deployer', icon: '◆', url: 'https://deployer.databasis.info', desc: 'NFT collection wizard' },
  ];

  // ─── Current app detection from hostname ──────────────────────────────
  const HOST_TO_APP = {
    'databasis.info':            'terminal',
    'www.databasis.info':        'terminal',
    'burn.databasis.info':       'burn',
    'dao.databasis.info':        'dao',
    'chat.databasis.info':       'chat',
    'game.databasis.info':       'game',
    'art.databasis.info':        'art',
    'deployer.databasis.info':   'deployer',
    'nft.databasis.info':        'deployer',
    'terminal.databasis.info':   'terminal',
    'localhost':                 'terminal',
    '127.0.0.1':                 'terminal',
  };
  const currentApp = HOST_TO_APP[location.hostname] || 'terminal';

  // ─── Helpers ──────────────────────────────────────────────────────────
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'style') node.setAttribute('style', v);
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (k === 'html') node.innerHTML = v;
      else node.setAttribute(k, v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  };

  const fmtPrice = (n) => {
    if (n == null || !isFinite(n)) return '—';
    if (n < 0.0001)  return '$' + n.toFixed(8);
    if (n < 0.01)    return '$' + n.toFixed(6);
    if (n < 1)       return '$' + n.toFixed(4);
    return '$' + n.toFixed(2);
  };
  const fmtPct = (n) => {
    if (n == null || !isFinite(n)) return '—';
    return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
  };
  const shortAddr = (a) => a && a.length >= 8 ? a.slice(0, 4) + '…' + a.slice(-4) : a;
  const timeAgo = (ts) => {
    const s = (Date.now() - ts) / 1000;
    if (s < 60)     return Math.floor(s) + 's ago';
    if (s < 3600)   return Math.floor(s / 60) + 'm ago';
    if (s < 86400)  return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  };

  // ─── Build the rail ───────────────────────────────────────────────────
  const rail = el('aside', {
    class: 'basis-shell',
    role: 'navigation',
    'aria-label': 'BASIS ecosystem navigation',
  });

  const logo = el('div', {
    class: 'bs-logo',
    role: 'button',
    tabindex: '0',
    'aria-label': 'Open BASIS shell drawer',
    title: 'BASIS — open menu',
    onclick: () => toggleDrawer(),
    onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDrawer(); } },
  }, '🔥');

  const divider = el('div', { class: 'bs-divider' });

  const nav = el('nav', { class: 'bs-nav' });
  for (const app of APPS) {
    const link = el('a', {
      class: 'bs-app' + (app.id === currentApp ? ' active' : ''),
      href: app.id === currentApp ? '#' : app.url,
      'data-name': app.name,
      title: app.name,
      ...(app.id === currentApp ? { 'aria-current': 'page' } : { target: '_blank', rel: 'noopener' }),
    }, app.icon);
    if (app.id === currentApp) link.addEventListener('click', (e) => e.preventDefault());
    nav.appendChild(link);
  }

  const pip = el('div', {
    class: 'bs-pip',
    title: 'live · solana mainnet',
    'aria-label': 'live, solana mainnet',
  });

  rail.appendChild(logo);
  rail.appendChild(divider);
  rail.appendChild(nav);
  rail.appendChild(pip);

  // ─── Build the drawer ─────────────────────────────────────────────────
  const overlay = el('div', {
    class: 'basis-shell-overlay',
    'aria-hidden': 'true',
    onclick: () => closeDrawer(),
  });

  const drawer = el('aside', {
    class: 'basis-shell-drawer',
    role: 'dialog',
    'aria-label': 'BASIS shell drawer',
    'aria-hidden': 'true',
  });

  // Head
  const drawerHead = el('div', { class: 'bs-drawer-head' },
    el('div', { class: 'bs-drawer-title' }, '🔥 BASIS · ' + (APPS.find(a => a.id === currentApp)?.name || 'shell')),
    el('button', { class: 'bs-drawer-close', 'aria-label': 'Close', onclick: closeDrawer }, '✕'),
  );

  // Price section
  const priceSection = el('div', { class: 'bs-section' },
    el('div', { class: 'bs-section-label' }, '$BASIS · price'),
    el('div', { class: 'bs-price' },
      el('span', { class: 'bs-price-val loading', id: 'bs-price-val' }, '—'),
      el('span', { class: 'bs-price-chg', id: 'bs-price-chg' }, ''),
    ),
    el('div', { class: 'bs-price-meta', id: 'bs-price-meta' }, 'fetching…'),
  );

  // Wallet section
  const walletSection = el('div', { class: 'bs-section', id: 'bs-wallet-section' },
    el('div', { class: 'bs-section-label' }, 'wallet'),
    el('a', {
      class: 'bs-wallet disconnected',
      id: 'bs-wallet-link',
      href: '#',
      target: '_blank',
      rel: 'noopener',
    },
      el('span', { class: 'bs-wallet-dot off' }),
      el('span', { class: 'bs-wallet-addr' }, 'not connected'),
      el('span', { class: 'bs-wallet-arrow' }, '↗'),
    ),
  );

  // Apps section
  const appList = el('div', { class: 'bs-app-list' });
  for (const app of APPS) {
    const row = el('a', {
      class: 'bs-app-row' + (app.id === currentApp ? ' active' : ''),
      href: app.id === currentApp ? '#' : app.url,
      ...(app.id === currentApp ? { 'aria-current': 'page' } : { target: '_blank', rel: 'noopener' }),
      onclick: app.id === currentApp ? (e) => { e.preventDefault(); closeDrawer(); } : null,
    },
      el('span', { class: 'bs-app-row-icon' }, app.icon),
      el('div', { class: 'bs-app-row-text' },
        el('span', { class: 'bs-app-row-name' }, app.name),
        el('span', { class: 'bs-app-row-desc' }, app.desc),
      ),
    );
    appList.appendChild(row);
  }
  const appsSection = el('div', { class: 'bs-section' },
    el('div', { class: 'bs-section-label' }, 'ecosystem'),
    appList,
  );

  // Activity section
  const activitySection = el('div', { class: 'bs-section' },
    el('div', { class: 'bs-section-label' }, 'recent activity'),
    el('div', { class: 'bs-activity', id: 'bs-activity' }, 'loading…'),
  );

  // Footer
  const foot = el('div', { class: 'bs-foot' },
    el('span', { class: 'bs-foot-pip' }),
    'live · ',
    el('a', { href: 'https://orbmarkets.io/token/' + BASIS_MINT, target: '_blank', rel: 'noopener' }, 'orb'),
    ' · v1',
  );

  drawer.appendChild(drawerHead);
  drawer.appendChild(priceSection);
  drawer.appendChild(walletSection);
  drawer.appendChild(appsSection);
  drawer.appendChild(activitySection);
  drawer.appendChild(foot);

  // ─── Mount ─────────────────────────────────────────────────────────────
  function mount() {
    document.documentElement.classList.add('basis-shell-active');
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    document.body.appendChild(rail);
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount, { once: true });

  // ─── Drawer state ─────────────────────────────────────────────────────
  let drawerOpen = false;
  function openDrawer() {
    drawerOpen = true;
    drawer.classList.add('open');
    overlay.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    overlay.setAttribute('aria-hidden', 'false');
    refreshPrice();
    refreshActivity();
  }
  function closeDrawer() {
    drawerOpen = false;
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('aria-hidden', 'true');
  }
  function toggleDrawer() { drawerOpen ? closeDrawer() : openDrawer(); }

  // ESC closes drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawerOpen) closeDrawer();
  });

  // ─── Price polling (DexScreener) ──────────────────────────────────────
  let lastPrice = null;
  async function refreshPrice() {
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${BASIS_MINT}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const pairs = (data.pairs || []).filter(p => p.baseToken?.address === BASIS_MINT);
      if (pairs.length === 0) throw new Error('no pair');
      const top = pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
      const price = parseFloat(top.priceUsd);
      const chg   = top.priceChange?.h24;
      const mcap  = top.marketCap || top.fdv || null;
      lastPrice = price;
      const valEl  = $('#bs-price-val', drawer);
      const chgEl  = $('#bs-price-chg', drawer);
      const metaEl = $('#bs-price-meta', drawer);
      if (valEl) {
        valEl.textContent = fmtPrice(price);
        valEl.classList.remove('loading');
      }
      if (chgEl && chg != null) {
        chgEl.textContent = fmtPct(chg) + ' · 24h';
        chgEl.className = 'bs-price-chg ' + (chg >= 0 ? 'pos' : 'neg');
      }
      if (metaEl) {
        const mcapStr = mcap ? '$' + (mcap >= 1e6 ? (mcap / 1e6).toFixed(2) + 'M' : mcap >= 1e3 ? (mcap / 1e3).toFixed(1) + 'K' : mcap.toFixed(0)) : '—';
        metaEl.textContent = `mcap ${mcapStr} · live from dexscreener`;
      }
    } catch (err) {
      const valEl = $('#bs-price-val', drawer);
      if (valEl && valEl.textContent === '—') valEl.classList.remove('loading');
    }
  }

  // ─── Activity polling (public Firestore burn counter) ─────────────────
  async function refreshActivity() {
    const elActivity = $('#bs-activity', drawer);
    if (!elActivity) return;
    try {
      // Fetch the public stats/recovered doc via Firestore REST (no auth needed —
      // rule allows public reads).
      const url = 'https://firestore.googleapis.com/v1/projects/basis-acfec/databases/(default)/documents/stats/recovered';
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const lamports = parseInt(data.fields?.lamports?.integerValue ?? '0', 10);
      const burns    = parseInt(data.fields?.burns?.integerValue    ?? '0', 10);
      const updatedAt = data.fields?.updatedAt?.timestampValue;
      const sol = (lamports / 1e9).toFixed(4);
      const ts = updatedAt ? new Date(updatedAt).getTime() : Date.now();
      elActivity.innerHTML = `<b>${sol}</b> SOL recovered network-wide<br>across <b>${burns.toLocaleString()}</b> burns · last <span class="bs-activity-time">${timeAgo(ts)}</span>`;
    } catch (err) {
      elActivity.textContent = 'no activity data';
    }
  }

  // ─── Wallet detection (window.solana / window.phantom etc.) ───────────
  function detectWallet() {
    // Try common provider injection points
    const provider =
      window.phantom?.solana ||
      window.solana ||
      window.solflare ||
      window.backpack;
    if (!provider) return null;
    const pk = provider.publicKey;
    if (!pk) return null;
    try { return typeof pk.toBase58 === 'function' ? pk.toBase58() : String(pk); }
    catch { return null; }
  }

  function refreshWallet() {
    const link = $('#bs-wallet-link', drawer);
    if (!link) return;
    const addr = detectWallet();
    const dot  = link.querySelector('.bs-wallet-dot');
    const txt  = link.querySelector('.bs-wallet-addr');
    if (addr) {
      link.classList.remove('disconnected');
      link.href = 'https://orbmarkets.io/account/' + addr;
      link.title = 'view ' + addr + ' on Orb';
      dot.classList.remove('off'); dot.classList.add('on');
      txt.textContent = shortAddr(addr);
    } else {
      link.classList.add('disconnected');
      link.href = '#';
      link.title = 'no wallet connected on this app';
      dot.classList.remove('on'); dot.classList.add('off');
      txt.textContent = 'not connected';
    }
  }

  // Initial refresh + intervals (only when drawer is open OR for the rail's
  // hidden refresh of "live" indicator; cheap polls).
  refreshPrice();
  refreshActivity();
  refreshWallet();

  // Refresh price every 60s, activity every 90s, wallet every 5s.
  // Skip refresh while tab is hidden to save bandwidth + Helius credits.
  setInterval(() => { if (!document.hidden) refreshPrice(); },    60_000);
  setInterval(() => { if (!document.hidden) refreshActivity(); }, 90_000);
  setInterval(() => { if (!document.hidden) refreshWallet(); },    5_000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && drawerOpen) {
      refreshPrice();
      refreshActivity();
      refreshWallet();
    }
  });

  // Public API for advanced host integration (optional — apps can ignore)
  window.BasisShell = {
    open:  openDrawer,
    close: closeDrawer,
    toggle: toggleDrawer,
    refresh: () => { refreshPrice(); refreshActivity(); refreshWallet(); },
    currentApp,
  };
})();
