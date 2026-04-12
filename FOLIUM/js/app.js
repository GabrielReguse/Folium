/* ═══════════════════════════════════════
   FOLIUM — app.js
   Inicialização global: canvas animado, modal
═══════════════════════════════════════ */

const App = {
  init() {
    Modal.init();
    App.initCanvas();
  },

  /* ── Canvas de corações/partículas (paleta rosa) ── */
  initCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    /* Menos partículas no mobile — melhor performance */
    const isMobile = window.innerWidth < 640;
    const N = isMobile ? 18 : 36;
    const CONNECT_DIST = 120;

    const COLORS = [
      [244, 194, 194],
      [255, 217, 232],
      [255, 143, 171],
      [255, 182, 210],
    ];

    let pts = [];
    let animId = null;

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function mkPt() {
      const col = COLORS[Math.floor(Math.random() * COLORS.length)];
      return {
        x:  Math.random() * canvas.width,
        y:  Math.random() * canvas.height,
        r:  Math.random() * 3.5 + 1.5,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        a:  Math.random() * 0.4 + 0.1,
        col,
        heart: Math.random() > 0.65,
      };
    }

    function drawHeart(cx, cy, size, alpha, col) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.4);
      ctx.bezierCurveTo( size * 0.6, -size,       size * 1.2,  size * 0.3,  0, size * 0.9);
      ctx.bezierCurveTo(-size * 1.2,  size * 0.3, -size * 0.6, -size,       0, -size * 0.4);
      ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha})`;
      ctx.fill();
      ctx.restore();
    }

    function init() { pts = Array.from({ length: N }, mkPt); }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20)                p.x = canvas.width  + 20;
        if (p.x > canvas.width  + 20) p.x = -20;
        if (p.y < -20)                p.y = canvas.height + 20;
        if (p.y > canvas.height + 20) p.y = -20;

        if (p.heart) {
          drawHeart(p.x, p.y, p.r * 2.2, p.a, p.col);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${p.a})`;
          ctx.fill();
        }

        for (let j = i + 1; j < pts.length; j++) {
          const q  = pts[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(255,143,171,${(1 - dist / CONNECT_DIST) * 0.12})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    }

    resize();
    init();
    draw();

    /*
     * Debounce no resize: evita recriar partículas quando o teclado
     * virtual do mobile abre (o que redimensiona a janela).
     * Apenas redimensiona o canvas sem recriar as partículas.
     */
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        /* Só recria partículas se a largura mudou (rotação de tela),
           não quando apenas a altura muda (teclado mobile) */
      }, 300);
    });
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());