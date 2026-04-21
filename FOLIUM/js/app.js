/* FOLIUM — app.js */

const App = {
  init() {
    Modal.init();
    App.initCanvas();
  },

  initCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const isMobile = window.innerWidth < 640;
    const N = isMobile ? 20 : 38;
    const CONNECT_DIST = 130;

    /* Paleta rosa */
    const COLORS = [
      [244, 194, 194],   /* rose-mid   */
      [255, 217, 232],   /* blush      */
      [255, 143, 171],   /* rose       */
      [255, 182, 210],   /* intermediate */
      [255, 230, 240],   /* very light */
    ];

    let pts    = [];
    let animId = null;

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function mkPt() {
      const col = COLORS[Math.floor(Math.random() * COLORS.length)];
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 3.2 + 1.4,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        a: Math.random() * 0.35 + 0.08,
        col,
        heart: Math.random() > 0.6,
        pulse: Math.random() * Math.PI * 2, /* fase de pulsação */
      };
    }

    function drawHeart(cx, cy, size, alpha, col) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.38);
      ctx.bezierCurveTo( size * 0.58, -size,      size * 1.18,  size * 0.28, 0, size * 0.88);
      ctx.bezierCurveTo(-size * 1.18, size * 0.28, -size * 0.58, -size,      0, -size * 0.38);
      ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha})`;
      ctx.fill();
      ctx.restore();
    }

    function init() {
      pts = Array.from({ length: N }, mkPt);
    }

    let tick = 0;
    function draw() {
      tick++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.012;

        if (p.x < -20) p.x = canvas.width  + 20;
        if (p.x > canvas.width  + 20) p.x  = -20;
        if (p.y < -20) p.y = canvas.height + 20;
        if (p.y > canvas.height + 20) p.y  = -20;

        /* Leve pulsação de opacidade */
        const alpha = p.a + Math.sin(p.pulse) * 0.04;

        if (p.heart) {
          drawHeart(p.x, p.y, p.r * 2.4, alpha, p.col);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${alpha})`;
          ctx.fill();
        }

        /* Linhas de conexão */
        for (let j = i + 1; j < pts.length; j++) {
          const q   = pts[j];
          const dx  = p.x - q.x;
          const dy  = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const opacity = (1 - dist / CONNECT_DIST) * 0.10;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(255,143,171,${opacity})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    init();
    draw();

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { resize(); }, 300);
    });
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
