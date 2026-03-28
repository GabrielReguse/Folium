/* js/background.js */
(function () {
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');

  let W, H, particles = [], rafId;

  const COLORS = [
    'rgba(150,75,0,0.18)',
    'rgba(190,143,97,0.15)',
    'rgba(214,185,156,0.20)',
    'rgba(233,218,202,0.25)',
    'rgba(150,75,0,0.10)',
  ];

  const CONNECT_DIST = 130;
  const COUNT_DESKTOP = 38;
  const COUNT_MOBILE  = 18;

  function count() {
    return W < 600 ? COUNT_MOBILE : COUNT_DESKTOP;
  }

  class Particle {
    constructor() { this.reset(true); }

    reset(init) {
      this.x  = Math.random() * W;
      this.y  = init ? Math.random() * H : H + 30;
      this.r  = 3 + Math.random() * 5;
      this.vx = (Math.random() - 0.5) * 0.35;
      this.vy = -0.25 - Math.random() * 0.4;
      this.rot     = Math.random() * Math.PI * 2;
      this.rotSpd  = (Math.random() - 0.5) * 0.012;
      this.color   = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.isLeaf  = Math.random() < 0.45;
      this.opacity = 0.4 + Math.random() * 0.6;
      this.wobble  = Math.random() * Math.PI * 2;
      this.wobbleSpd = 0.012 + Math.random() * 0.018;
    }

    update() {
      this.wobble += this.wobbleSpd;
      this.x  += this.vx + Math.sin(this.wobble) * 0.18;
      this.y  += this.vy;
      this.rot += this.rotSpd;
      if (this.y < -40) this.reset(false);
      if (this.x < -40) this.x = W + 20;
      if (this.x > W + 40) this.x = -20;
    }

    drawLeaf(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.globalAlpha = this.opacity * 0.85;
      ctx.fillStyle   = this.color;
      ctx.beginPath();
      // simple leaf shape
      ctx.moveTo(0, -this.r * 1.5);
      ctx.bezierCurveTo(
        this.r * 1.1, -this.r * 0.6,
        this.r * 1.1,  this.r * 0.6,
        0, this.r * 1.5
      );
      ctx.bezierCurveTo(
        -this.r * 1.1,  this.r * 0.6,
        -this.r * 1.1, -this.r * 0.6,
        0, -this.r * 1.5
      );
      ctx.fill();
      // midrib
      ctx.strokeStyle = 'rgba(150,75,0,0.18)';
      ctx.lineWidth   = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, -this.r * 1.4);
      ctx.lineTo(0,  this.r * 1.4);
      ctx.stroke();
      ctx.restore();
    }

    drawCircle(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.globalAlpha = this.opacity * 0.55;
      ctx.fillStyle   = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    draw(ctx) {
      this.isLeaf ? this.drawLeaf(ctx) : this.drawCircle(ctx);
    }
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    const n = count();
    if (particles.length !== n) {
      particles = [];
      for (let i = 0; i < n; i++) particles.push(new Particle());
    }
  }

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < CONNECT_DIST) {
          const a = (1 - d / CONNECT_DIST) * 0.22;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(190,143,97,${a})`;
          ctx.lineWidth   = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    drawConnections();
    particles.forEach(p => { p.update(); p.draw(ctx); });
    rafId = requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => {
    resize();
  }, { passive: true });

  resize();
  loop();
})();