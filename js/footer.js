// ─── Footer ───────────────────────────────────────────────────────────────────

export function initFooter() {
  // Live timestamp
  const ts = document.getElementById('timestamp');
  if (ts) {
    function updateTime() {
      ts.textContent = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    }
    updateTime();
    setInterval(updateTime, 1000);
  }

  // Incrementing block counter
  const blockEl = document.getElementById('block-count');
  if (blockEl) {
    let block = 19_847_203;
    setInterval(() => {
      block += Math.floor(Math.random() * 2);
      blockEl.textContent = block.toLocaleString();
    }, 6000);
  }

  // Rolling TX hash
  const txEl = document.getElementById('tx-hash');
  if (txEl) {
    const hex = '0123456789abcdef';
    setInterval(() => {
      let h = '';
      for (let i = 0; i < 14; i++) h += hex[Math.floor(Math.random() * 16)];
      txEl.textContent = h;
    }, 4000);
  }
}
