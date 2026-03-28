/* ═══════════════════════════════════════
   FOLIUM — app.js
   Inicialização global: canvas animado,
   modal e componentes compartilhados
═══════════════════════════════════════ */

const App = {
  init() {
    Modal.init();
    App.initCanvas();
  },

  /* ── Canvas de partículas ── */
  initCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const N = 38, CONNECT_DIST = 130;
    const COLORS = [
      [214, 185, 156],
      [233, 218, 202],
      [190, 143, 97],
      [150, 75,  0  ],
    ];
    let pts = [];

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function mkPt() {
      const col = COLORS[Math.floor(Math.random() * COLORS.length)];
      return {
        x:  Math.random() * canvas.width,
        y:  Math.random() * canvas.height,
        r:  Math.random() * 3 + 1.5,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        a:  Math.random() * 0.35 + 0.15,
        col,
      };
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

        /* Ponto */
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${p.a})`;
        ctx.fill();

        /* Conexões */
        for (let j = i + 1; j < pts.length; j++) {
          const q  = pts[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(150,75,0,${(1 - dist / CONNECT_DIST) * 0.09})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }

    resize();
    init();
    draw();
    window.addEventListener('resize', () => { resize(); init(); });
  }
};

/* Inicializa quando o DOM estiver pronto */
document.addEventListener('DOMContentLoaded', () => App.init());
