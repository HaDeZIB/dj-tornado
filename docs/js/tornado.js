/* Tornado de partículas + espectro rojo (canvas 2D, sin librerías).
   window.Tornado(canvas, {static, top, bottom, scale, count}) -> { hit(power) } */
(function () {
  function Tornado(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var reduce = opts.static || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var W = 0, H = 0, boost = 0, t = 0;
    var N = opts.count || (window.innerWidth < 600 ? 700 : 1100);
    var parts = [];
    for (var i = 0; i < N; i++) {
      parts.push({ a: Math.random() * 6.283, y: Math.random(), s: 0.55 + Math.random() * 0.9,
                   o: 0.45 + Math.random() * 0.55, j: (Math.random() - 0.5) * 0.3 });
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#030409'; ctx.fillRect(0, 0, W, H);
    }

    function level(x, row) {
      return Math.abs(Math.sin(x * 0.13 + t * 2.3 + row) * Math.sin(x * 0.047 - t * 1.4 + row * 3) *
                      Math.cos(x * 0.019 + t * 0.6 + row * 2));
    }

    function band(y, amp, row) {
      var a = amp * (1 + boost * 1.6);
      ctx.beginPath();
      for (var x = 0; x < W; x += 3) {
        var h = level(x, row) * a + Math.random() * 2;
        ctx.moveTo(x, y - h); ctx.lineTo(x, y + h * 0.7);
      }
      ctx.strokeStyle = 'rgba(255,28,45,0.22)'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y);
      ctx.strokeStyle = 'rgba(255,60,70,' + (0.18 + boost * 0.2) + ')'; ctx.lineWidth = 1; ctx.stroke();
    }

    function step(dt) {
      t += dt; boost *= Math.pow(0.05, dt);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(3,4,9,' + (reduce ? 0.18 : 0.32) + ')';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      var bands = opts.bands || [[0.1, 22], [0.84, 34], [0.95, 18]];
      for (var bi = 0; bi < bands.length; bi++) band(H * bands[bi][0], bands[bi][1], bi);

      var cx = W / 2, top = H * (opts.top || 0.06), bottom = H * (opts.bottom || 0.8), h = bottom - top;
      var maxR = Math.min(W * 0.44, 240) * (opts.scale || 1);
      ctx.lineCap = 'round';
      for (var k = 0; k < parts.length; k++) {
        var p = parts[k], yy = p.y;
        var r = maxR * (0.05 + 0.95 * Math.pow(yy, 1.65)) * (1 + p.j);
        var sway = Math.sin(t * 0.9 + yy * 3.1) * maxR * 0.2 * (1 - yy * 0.55) + Math.sin(t * 0.33) * maxR * 0.08;
        var spd = (1 + (1 - yy) * 2.4) * (1 + boost * 2.5);
        var a0 = p.a;
        p.a += spd * dt * 1.6 * p.s;
        p.y += 0.05 * dt * p.s * (1 + boost * 3);
        if (p.y > 1) { p.y = 0; p.a = Math.random() * 6.283; continue; }
        var by = bottom - yy * h;
        var x0 = cx + sway + Math.cos(a0) * r, y0 = by + Math.sin(a0) * r * 0.16;
        var x1 = cx + sway + Math.cos(p.a) * r, y1 = by + Math.sin(p.a) * r * 0.16;
        var depth = (Math.sin(p.a) + 1) / 2;
        var alpha = (0.12 + depth * 0.55) * p.o * (0.45 + yy * 0.65);
        ctx.strokeStyle = 'hsla(' + (212 - depth * 12) + ',100%,' + (52 + depth * 22 + boost * 10) + '%,' + alpha + ')';
        ctx.lineWidth = (0.6 + depth * 1.5) * p.s * (1 + boost * 0.5);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
    }

    resize();
    if (reduce) {
      for (var f = 0; f < 70; f++) step(1 / 60);
    } else {
      var last = performance.now();
      window.addEventListener('resize', resize);
      (function loop(now) {
        var dt = Math.min((now - last) / 1000, 0.05); last = now;
        if (!document.hidden) step(dt);
        requestAnimationFrame(loop);
      })(last);
    }
    return { hit: function (v) { boost = Math.min(boost + (v || 1), 3); } };
  }
  window.Tornado = Tornado;
})();
