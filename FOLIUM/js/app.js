const App = {
  init() {
    Modal.init();
    App.initCanvas();
  },

  initCanvas() {
    const canvas = document.getElementById("bg-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const isMobile = window.innerWidth < 640;
    const N = isMobile ? 22 : 42;
    const CONNECT_DIST = 120;

    const COLORS = [
      [196, 168, 130],
      [212, 184, 150],
      [155, 107, 66],
      [232, 217, 191],
      [180, 148, 108],
    ];

    let pts = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function mkPt() {
      const col = COLORS[Math.floor(Math.random() * COLORS.length)];
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2.8 + 1.2,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        a: Math.random() * 0.28 + 0.06,
        col,
        leaf: Math.random() > 0.65,
        pulse: Math.random() * Math.PI * 2,
      };
    }

    function drawLeaf(cx, cy, size, alpha, col) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4 + Math.sin(size) * 0.3);
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.bezierCurveTo(
        size * 0.8,
        -size * 0.6,
        size * 0.8,
        size * 0.6,
        0,
        size,
      );
      ctx.bezierCurveTo(
        -size * 0.8,
        size * 0.6,
        -size * 0.8,
        -size * 0.6,
        0,
        -size,
      );
      ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha})`;
      ctx.fill();
      ctx.restore();
    }

    function init() {
      pts = Array.from({ length: N }, mkPt);
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.01;
        if (p.x < -20) p.x = canvas.width + 20;
        if (p.x > canvas.width + 20) p.x = -20;
        if (p.y < -20) p.y = canvas.height + 20;
        if (p.y > canvas.height + 20) p.y = -20;

        const a = p.a + Math.sin(p.pulse) * 0.03;

        if (p.leaf) {
          drawLeaf(p.x, p.y, p.r * 2.2, a, p.col);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${a})`;
          ctx.fill();
        }

        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j];
          const dx = p.x - q.x,
            dy = p.y - q.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECT_DIST) {
            const op = (1 - d / CONNECT_DIST) * 0.08;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(155,107,66,${op})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }

    resize();
    init();
    draw();
    let t;
    window.addEventListener("resize", () => {
      clearTimeout(t);
      t = setTimeout(resize, 300);
    });
  },
};

document.addEventListener("DOMContentLoaded", () => App.init());
