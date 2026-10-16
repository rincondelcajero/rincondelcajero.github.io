const Ruleta = (() => {
  const { storage, toast, escapeHtml, fmtFecha, indiceAleatorio, Confetti, vibrar } = TRC;

  const LIMITE = 100;

  const COLORES = [
    '#c9a961','#22c55e','#3b82f6','#ef4444',
    '#a855f7','#f97316','#14b8a6','#ec4899',
    '#84cc16','#06b6d4','#f43f5e','#8b5cf6'
  ];
  const HIST_KEY = 'ruleta:historial';
  const COUNTER_KEY = 'ruleta:counter';
  const PARTICIPANTES_KEY = 'ruleta:participantes';

  let canvas, ctx, container, textarea, btnGirar, chkQuitar, resultadoEl, historialEl, counterEl, contadorPartEl;
  let btnEjemplo, btnLimpiarLista, btnLimpiarHistorial;
  let participantes = [];
  let rotacion = 0;
  let girando = false;
  let inicializado = false;

  let highlightIdx = -1;
  let highlightStart = 0;
  let highlightRAF = null;

  let guardarTimer = null;
  let avisoLimiteDado = false;

  function init() {
    if (inicializado) return;
    canvas = document.getElementById('ruleta-canvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    container = document.getElementById('ruleta-canvas-container');
    textarea = document.getElementById('ruleta-participantes');
    btnGirar = document.getElementById('ruleta-girar');
    chkQuitar = document.getElementById('ruleta-quitar-ganador');
    resultadoEl = document.getElementById('ruleta-resultado');
    historialEl = document.getElementById('ruleta-historial');
    counterEl = document.getElementById('ruleta-counter');
    contadorPartEl = document.getElementById('ruleta-contador-participantes');
    btnEjemplo = document.getElementById('ruleta-ejemplo');
    btnLimpiarLista = document.getElementById('ruleta-limpiar');
    btnLimpiarHistorial = document.getElementById('ruleta-limpiar-historial');

    const guardados = storage.get(PARTICIPANTES_KEY, '');
    if (guardados) textarea.value = guardados;

    textarea.addEventListener('input', () => {
      if (girando) return;
      sincronizar();
      clearTimeout(guardarTimer);
      guardarTimer = setTimeout(() => {
        storage.set(PARTICIPANTES_KEY, textarea.value);
      }, 400);
    });

    btnGirar.addEventListener('click', girar);

    btnEjemplo.addEventListener('click', () => {
      if (girando) return;
      textarea.value = ['Juan','María','@pedro_ig','Lucía','Carlos','Sofi','Diego'].join('\n');
      storage.set(PARTICIPANTES_KEY, textarea.value);
      avisoLimiteDado = false;
      sincronizar();
    });

    btnLimpiarLista.addEventListener('click', () => {
      if (girando) return;
      textarea.value = '';
      storage.set(PARTICIPANTES_KEY, '');
      resultadoEl.textContent = '';
      resultadoEl.classList.remove('ganador');
      clearHighlight();
      avisoLimiteDado = false;
      sincronizar();
    });

    btnLimpiarHistorial.addEventListener('click', () => {
      if (girando) return;
      if (confirm('¿Borrar todo el historial de ganadores?')) {
        storage.remove(HIST_KEY);
        storage.remove(COUNTER_KEY);
        cargarHistorial();
        toast('Historial borrado');
      }
    });

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => { if (!girando) dibujar(); });
      ro.observe(container);
    } else {
      window.addEventListener('resize', () => { if (!girando) dibujar(); });
    }

    document.addEventListener('trc:section-shown', e => {
      if (e.detail === 'ruleta' && !girando) {
        requestAnimationFrame(dibujar);
      }
    });

    const celeb = document.getElementById('celebration');
    if (celeb) celeb.addEventListener('click', () => cerrarCelebracion(celeb));

    cargarHistorial();
    sincronizar();
    inicializado = true;
  }

  function setControlesBloqueados(bloqueado) {
    btnGirar.disabled = bloqueado;
    btnEjemplo.disabled = bloqueado;
    btnLimpiarLista.disabled = bloqueado;
    btnLimpiarHistorial.disabled = bloqueado;
    chkQuitar.disabled = bloqueado;
    textarea.disabled = bloqueado;
  }

  function sincronizar() {
    const todas = textarea.value.split('\n').map(l => l.trim()).filter(Boolean);

    if (todas.length > LIMITE) {
      const recortadas = todas.slice(0, LIMITE);
      participantes = recortadas;
      textarea.value = recortadas.join('\n');
      storage.set(PARTICIPANTES_KEY, textarea.value);
      if (!avisoLimiteDado) {
        toast(`Máximo ${LIMITE} participantes. Se recortó la lista.`, 'error');
        avisoLimiteDado = true;
      }
    } else {
      participantes = todas;
      if (todas.length < LIMITE) avisoLimiteDado = false;
    }

    if (contadorPartEl) {
      contadorPartEl.textContent = `${participantes.length} / ${LIMITE}`;
      contadorPartEl.style.color = participantes.length >= LIMITE ? 'var(--danger)' : '';
    }

    if (!girando) dibujar();
  }

  function dibujar() {
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = Math.round(container.clientWidth || canvas.clientWidth || 400);
    if (size <= 0) return;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = size / 2;
    const cy = size / 2;
    const radio = size / 2 - 20;

    ctx.clearRect(0, 0, size, size);

    if (participantes.length === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radio, 0, Math.PI * 2);
      ctx.fillStyle = '#1b1f25';
      ctx.fill();
      ctx.strokeStyle = '#24292f';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#6d7581';
      ctx.font = '500 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Agregá participantes', cx, cy);
      dibujarPuntero(cx, cy, radio);
      return;
    }

    const n = participantes.length;
    const step = (Math.PI * 2) / n;

    let fontSize;
    if (n <= 6)       fontSize = 15;
    else if (n <= 12) fontSize = 14;
    else if (n <= 20) fontSize = 13;
    else if (n <= 30) fontSize = 12;
    else if (n <= 45) fontSize = 11;
    else if (n <= 60) fontSize = 10;
    else if (n <= 80) fontSize = 9;
    else              fontSize = 8;

    const espacio = Math.max(20, radio - 12);
    const anchoChar = fontSize * 0.58;
    const maxChars = Math.max(1, Math.floor(espacio / anchoChar));

    for (let i = 0; i < n; i++) {
      const start = i * step + rotacion;
      const end = start + step;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radio, start, end);
      ctx.closePath();
      ctx.fillStyle = COLORES[i % COLORES.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.25)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + step / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      const nombre = participantes[i];
      let txt;
      if (nombre.length <= maxChars) {
        txt = nombre;
      } else if (maxChars <= 1) {
        txt = nombre[0].toUpperCase();
      } else if (maxChars <= 4) {
        txt = nombre.slice(0, maxChars);
      } else {
        txt = nombre.slice(0, maxChars - 1) + '…';
      }

      ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;

      ctx.shadowColor = 'rgba(0,0,0,.55)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;

      ctx.fillStyle = '#ffffff';
      ctx.fillText(txt, radio - 10, 0);

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.restore();
    }

    if (highlightIdx >= 0 && highlightIdx < n) {
      const t = (Date.now() - highlightStart) / 1000;
      const alpha = 0.16 + Math.abs(Math.sin(t * 5)) * 0.18;
      const start = highlightIdx * step + rotacion;
      const end = start + step;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radio, start, end);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, .9)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    const rCentro = Math.max(24, radio * 0.12);
    ctx.beginPath();
    ctx.arc(cx, cy, rCentro, 0, Math.PI * 2);
    ctx.fillStyle = '#101216';
    ctx.fill();
    ctx.strokeStyle = '#c9a961';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(3, rCentro * 0.18), 0, Math.PI * 2);
    ctx.fillStyle = '#c9a961';
    ctx.fill();

    dibujarPuntero(cx, cy, radio);
  }

  function dibujarPuntero(cx, cy, radio) {
    const top = cy - radio;
    ctx.beginPath();
    ctx.moveTo(cx, top + 18);
    ctx.lineTo(cx - 12, top - 4);
    ctx.lineTo(cx + 12, top - 4);
    ctx.closePath();
    ctx.fillStyle = '#c9a961';
    ctx.fill();
    ctx.strokeStyle = '#101216';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function startHighlight(idx, duration = 3200) {
    highlightIdx = idx;
    highlightStart = Date.now();
    const endTime = Date.now() + duration;

    if (highlightRAF) cancelAnimationFrame(highlightRAF);

    function tick() {
      if (Date.now() >= endTime) {
        highlightIdx = -1;
        highlightRAF = null;
        dibujar();
        return;
      }
      dibujar();
      highlightRAF = requestAnimationFrame(tick);
    }
    highlightRAF = requestAnimationFrame(tick);
  }

  function clearHighlight() {
    highlightIdx = -1;
    if (highlightRAF) {
      cancelAnimationFrame(highlightRAF);
      highlightRAF = null;
    }
  }

  function girar() {
    if (girando) return;

    const todas = textarea.value.split('\n').map(l => l.trim()).filter(Boolean);
    if (todas.length > LIMITE) {
      toast(`Máximo ${LIMITE} participantes`, 'error');
      sincronizar();
      return;
    }
    participantes = todas;

    if (participantes.length < 2) {
      resultadoEl.textContent = 'Necesitás al menos 2 participantes.';
      resultadoEl.classList.remove('ganador');
      toast('Necesitás al menos 2 participantes', 'error');
      return;
    }

    girando = true;
    setControlesBloqueados(true);
    clearHighlight();
    resultadoEl.classList.remove('ganador');
    resultadoEl.textContent = 'Girando…';
    vibrar(10);

    const n = participantes.length;
    const step = (Math.PI * 2) / n;
    const idxGanador = indiceAleatorio(n);

    const centroSector = (idxGanador + 0.5) * step;
    const rotFinalBase = -Math.PI / 2 - centroSector;

    const vueltas = 6 + Math.floor(Math.random() * 3);
    const jitter = (Math.random() - 0.5) * step * 0.7;

    const rotActualNorm = ((rotacion % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const rotFinalNorm = ((rotFinalBase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    let delta = rotFinalNorm - rotActualNorm;
    if (delta < 0) delta += Math.PI * 2;

    const rotInicio = rotacion;
    const rotDelta = delta + vueltas * Math.PI * 2 + jitter;
    const duracion = 4500;
    const inicio = performance.now();

    function animar(now) {
      const p = Math.min((now - inicio) / duracion, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      rotacion = rotInicio + rotDelta * ease;
      dibujar();
      if (p < 1) {
        requestAnimationFrame(animar);
      } else {
        rotacion = rotInicio + rotDelta;
        dibujar();
        finalizarGiro(idxGanador);
      }
    }
    requestAnimationFrame(animar);
  }

  function finalizarGiro(idx) {
    const ganador = participantes[idx];

    resultadoEl.textContent = `Ganó ${ganador}`;
    resultadoEl.classList.add('ganador');

    const numero = guardarEnHistorial(ganador);
    showCelebration(ganador, numero);
    vibrar([20, 40, 20]);

    if (chkQuitar.checked) {
      const nuevos = participantes.filter((_, i) => i !== idx);
      textarea.value = nuevos.join('\n');
      storage.set(PARTICIPANTES_KEY, textarea.value);
      participantes = nuevos;
      if (contadorPartEl) {
        contadorPartEl.textContent = `${participantes.length} / ${LIMITE}`;
        contadorPartEl.style.color = participantes.length >= LIMITE ? 'var(--danger)' : '';
      }
      avisoLimiteDado = false;
      dibujar();
    } else {
      startHighlight(idx, 3400);
    }

    girando = false;
    setControlesBloqueados(false);
  }

  function showCelebration(nombre, numero) {
    const el = document.getElementById('celebration');
    const nameEl = document.getElementById('celebration-name');
    const numEl = document.getElementById('celebration-num');
    if (!el || !nameEl || !numEl) return;

    clearTimeout(el._timer);
    clearTimeout(el._timer2);

    nameEl.textContent = nombre;
    numEl.textContent = `Sorteo #${numero}`;

    el.hidden = false;
    el.setAttribute('aria-hidden', 'false');
    el.classList.remove('show', 'closing');
    void el.offsetWidth;
    el.classList.add('show');

    Confetti.burst(140);

    el._timer = setTimeout(() => cerrarCelebracion(el), 3400);
  }

  function cerrarCelebracion(el) {
    if (!el || el.classList.contains('closing')) return;
    el.classList.add('closing');
    clearTimeout(el._timer2);
    el._timer2 = setTimeout(() => {
      el.hidden = true;
      el.setAttribute('aria-hidden', 'true');
      el.classList.remove('show', 'closing');
    }, 320);
  }

  function cargarHistorial() {
    const historial = storage.get(HIST_KEY, []);
    if (counterEl) counterEl.textContent = historial.length;

    if (!historial.length) {
      historialEl.innerHTML = `
        <li class="empty-state" style="border:1px dashed var(--border); list-style:none; padding: 24px;">
          <p>Sin sorteos todavía. Girá la ruleta para empezar.</p>
        </li>`;
      return;
    }

    historialEl.innerHTML = historial.map((h, i) => {
      const num = h.numero || (historial.length - i);
      return `
        <li style="animation-delay:${Math.min(i * 0.03, 0.4)}s">
          <span class="hist-num">#${escapeHtml(String(num))}</span>
          <span class="hist-nombre">${escapeHtml(h.nombre)}</span>
          <span class="hist-fecha">${escapeHtml(h.fecha)}</span>
        </li>
      `;
    }).join('');
  }

  function guardarEnHistorial(nombre) {
    const historial = storage.get(HIST_KEY, []);
    const numero = (storage.get(COUNTER_KEY, 0) || 0) + 1;
    storage.set(COUNTER_KEY, numero);

    historial.unshift({ numero, nombre, fecha: fmtFecha() });
    storage.set(HIST_KEY, historial.slice(0, 100));
    cargarHistorial();
    return numero;
  }

  return { init };
})();