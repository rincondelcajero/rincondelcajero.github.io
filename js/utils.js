/* Utilidades globales compartidas por todas las herramientas */

const TRC = (() => {
  const PREFIX = 'trc:';

  function get(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  }
  function set(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); }
    catch (e) { console.warn('No se pudo guardar:', e); }
  }
  function remove(key) {
    try { localStorage.removeItem(PREFIX + key); } catch {}
  }

  function indiceAleatorio(total) {
    if (total <= 0) return 0;
    if (window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      return arr[0] % total;
    }
    return Math.floor(Math.random() * total);
  }
  function elegirGanador(lista) {
    if (!lista || !lista.length) return null;
    return lista[indiceAleatorio(lista.length)];
  }

  function fmtMoneda(n) {
    const num = Number(n) || 0;
    return num.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  function fmtFecha(d = new Date()) {
    return d.toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function descargarArchivo(nombre, contenido, tipo = 'text/plain') {
    const blob = new Blob(['\ufeff' + contenido], { type: tipo + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function vibrar(patron = 8) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { return navigator.vibrate(patron); }
      catch { return false; }
    }
    return false;
  }

  let toastTimer = null;
  function toast(msg, tipo = 'ok') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('error', tipo === 'error');
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  const Confetti = (() => {
    let canvas, ctx, particles = [], running = false;

    function init() {
      canvas = document.getElementById('confetti-canvas');
      if (!canvas) return false;
      ctx = canvas.getContext('2d');
      resize();
      window.addEventListener('resize', resize);
      window.addEventListener('orientationchange', () => setTimeout(resize, 250));
      canvas.style.display = 'none';
      return true;
    }

    function resize() {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function burst(count = 140) {
      if (!canvas) { if (!init()) return; }
      if (running) return;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const colors = [
        '#c9a961', '#d9bd7a', '#4ade80', '#3b82f6',
        '#ef4444', '#a855f7', '#f97316', '#ec4899', '#14b8a6'
      ];

      const total = w < 480 ? Math.round(count * 0.7) : count;

      particles = [];
      for (let i = 0; i < total; i++) {
        particles.push({
          x: Math.random() * w,
          y: -30 - Math.random() * h * 0.4,
          vx: (Math.random() - 0.5) * 5,
          vy: 1.5 + Math.random() * 3.5,
          size: 5 + Math.random() * 7,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.25,
          life: 1,
          shape: Math.random() > 0.5 ? 'rect' : 'circle',
          sway: Math.random() * Math.PI * 2
        });
      }

      running = true;
      canvas.style.display = 'block';
      requestAnimationFrame(loop);
    }

    function loop() {
      if (!ctx) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      let alive = 0;
      for (const p of particles) {
        p.sway += 0.05;
        p.x += p.vx + Math.sin(p.sway) * 1.2;
        p.y += p.vy;
        p.vy += 0.06;
        p.vx *= 0.99;
        p.rotation += p.vr;
        p.life -= 0.0035;

        if (p.life > 0 && p.y < h + 50) {
          alive++;
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.8));
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          if (p.shape === 'rect') {
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      if (alive > 0) {
        requestAnimationFrame(loop);
      } else {
        running = false;
        ctx.clearRect(0, 0, w, h);
        canvas.style.display = 'none';
      }
    }

    return { init, burst };
  })();

  function on(el, ev, fn) { if (el) el.addEventListener(ev, fn); }

  return {
    storage: { get, set, remove },
    indiceAleatorio, elegirGanador,
    fmtMoneda, fmtFecha,
    escapeHtml, descargarArchivo, toast, on,
    vibrar,
    Confetti
  };
})();