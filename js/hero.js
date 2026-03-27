// ─── Hero Section ────────────────────────────────────────────────────────────

// ── Typing animation ──────────────────────────────────────────────────────────
export function initTyping() {
  const text = 'TERMINAL DASHBOARD · DATABASIS.INFO';
  const el   = document.getElementById('typed');
  if (!el) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const baseDelay = reduced ? 0 : 1600;
  const charDelay = reduced ? 0 : 45;

  text.split('').forEach((ch, i) => {
    const span = document.createElement('span');
    span.className = 'char';
    span.textContent = ch === ' ' ? '\u00A0' : ch;
    if (!reduced) span.style.animationDelay = `${baseDelay + i * charDelay}ms`;
    else span.style.opacity = '1';
    el.appendChild(span);
  });
}

// ── Dot-grid background canvas ────────────────────────────────────────────────
export function initGrid() {
  const canvas = document.getElementById('grid-canvas');
  if (!canvas) return;

  const ctx     = canvas.getContext('2d');
  const spacing = 32;
  const dotBase = 0.8;
  let W, H, cols, rows, time = 0;
  const mouse   = { x: -500, y: -500 };

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    cols = Math.ceil(W / spacing) + 1;
    rows = Math.ceil(H / spacing) + 1;
  }

  function drawDots(animated) {
    ctx.clearRect(0, 0, W, H);
    if (animated) time += 0.008;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x  = c * spacing;
        const y  = r * spacing;
        const dx = x - mouse.x;
        const dy = y - mouse.y;
        const dist      = Math.sqrt(dx * dx + dy * dy);
        const proximity = Math.max(0, 1 - dist / 180);
        const wave      = animated
          ? Math.sin(c * 0.15 + time) * Math.cos(r * 0.12 + time * 0.7) * 0.3
          : 0;

        const alpha  = Math.min(1, 0.06 + wave * 0.06 + proximity * 0.35);
        const radius = dotBase + proximity * 1.4;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120,177,90,${alpha})`;
        ctx.fill();

        if (proximity > 0.3) {
          ctx.beginPath();
          ctx.arc(x, y, radius + 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(120,177,90,${proximity * 0.12})`;
          ctx.fill();
        }
      }
    }
  }

  resize();
  window.addEventListener('resize', () => { resize(); });
  document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) {
    drawDots(false);
  } else {
    (function loop() {
      drawDots(true);
      requestAnimationFrame(loop);
    })();
  }
}
