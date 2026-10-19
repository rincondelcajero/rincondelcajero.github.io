const QR = (() => {
  const { storage, toast, escapeHtml, fmtFecha, vibrar, descargarArchivo } = TRC;
  const KEY_HIST = 'qr:historial';
  const LIMITE_HIST = 20;
  let tipoActivo = 'texto';
  let ultimo = null;
  let inicializado = false;
  let intentos = 0;

  function init() {
    if (inicializado) return;
    if (typeof qrcode !== 'function') {
      intentos++;
      if (intentos < 20) {
        setTimeout(init, 500);
        return;
      }
      mostrarError('Error: la librería QR no cargó. Recargá la página.');
      return;
    }
    inicializado = true;
    try {
      if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
        qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
      }
    } catch (e) {
      console.warn('[QR] UTF-8:', e);
    }
    const tabs = document.querySelectorAll('#qr-tipos .qr-tipo');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        if (tab.dataset.tipo === tipoActivo) return;
        tipoActivo = tab.dataset.tipo;
        tabs.forEach(t => {
          const on = t.dataset.tipo === tipoActivo;
          t.classList.toggle('active', on);
          t.setAttribute('aria-selected', String(on));
        });
        renderFormulario();
        vibrar(6);
      });
    });
    const btnGen = document.getElementById('qr-generar');
    if (btnGen) {
      btnGen.addEventListener('click', (e) => {
        e.preventDefault();
        generar();
      });
    }
    const btnPNG = document.getElementById('qr-descargar-png');
    const btnSVG = document.getElementById('qr-descargar-svg');
    const btnCopiar = document.getElementById('qr-copiar');
    const btnLimpiar = document.getElementById('qr-limpiar-historial');
    if (btnPNG) btnPNG.addEventListener('click', descargarPNG);
    if (btnSVG) btnSVG.addEventListener('click', descargarSVG);
    if (btnCopiar) btnCopiar.addEventListener('click', copiarContenido);
    if (btnLimpiar) btnLimpiar.addEventListener('click', limpiarHistorial);
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        const sec = document.querySelector('[data-section="qr"]');
        if (sec && !sec.hidden) { e.preventDefault(); generar(); }
      }
    });
    const form = document.getElementById('qr-form');
    if (form && form.children.length === 0) {
      renderFormulario();
    }
    cargarHistorial();
  }

  function mostrarError(msg) {
    const el = document.getElementById('qr-error');
    if (el) {
      el.innerHTML = msg;
      el.hidden = false;
    }
  }

  function renderFormulario() {
    const form = document.getElementById('qr-form');
    if (!form) return;
    let html = '';
    if (tipoActivo === 'texto' || tipoActivo === 'url') {
      html =
        '<div class="qr-field">' +
        '<label for="qr-contenido">Contenido del QR</label>' +
        '<textarea id="qr-contenido" rows="4" placeholder="Pegá un link, un texto, un CBU, lo que quieras codificar..."></textarea>' +
        '<p class="qr-hint">Acepta texto, enlaces, CBU, alias, cualquier cosa. Si es una URL sin <code>https://</code>, se agrega automáticamente.</p>' +
        '</div>';
    } else if (tipoActivo === 'whatsapp') {
      html =
        '<div class="qr-field">' +
        '<label for="qr-telefono">Teléfono</label>' +
        '<input type="tel" id="qr-telefono" placeholder="5493765168963" inputmode="tel" autocomplete="off">' +
        '<p class="qr-hint">Incluí el código de país, sin + ni espacios. Ej: 5493765168963.</p>' +
        '</div>' +
        '<div class="qr-field">' +
        '<label for="qr-mensaje">Mensaje (opcional)</label>' +
        '<textarea id="qr-mensaje" rows="3" placeholder="Hola, te escribo por..."></textarea>' +
        '</div>';
    } else if (tipoActivo === 'cbu') {
      html =
        '<div class="qr-field">' +
        '<label for="qr-titular">Titular (opcional)</label>' +
        '<input type="text" id="qr-titular" placeholder="Juan Pérez" autocomplete="off">' +
        '</div>' +
        '<div class="qr-field">' +
        '<label for="qr-cbu">CBU / CVU</label>' +
        '<input type="text" id="qr-cbu" placeholder="0000003100012345678901" maxlength="30" inputmode="numeric" autocomplete="off">' +
        '<p class="qr-hint" id="qr-cbu-hint"></p>' +
        '</div>' +
        '<div class="qr-field">' +
        '<label for="qr-alias">Alias (opcional)</label>' +
        '<input type="text" id="qr-alias" placeholder="juan.perez.mp" autocomplete="off">' +
        '</div>' +
        '<div class="qr-field">' +
        '<label for="qr-banco">Banco / Billetera (opcional)</label>' +
        '<input type="text" id="qr-banco" placeholder="Mercado Pago" autocomplete="off">' +
        '</div>';
    } else if (tipoActivo === 'wifi') {
      html =
        '<div class="qr-field">' +
        '<label for="qr-ssid">Nombre de la red (SSID)</label>' +
        '<input type="text" id="qr-ssid" placeholder="MiWiFi" maxlength="32" autocomplete="off">' +
        '</div>' +
        '<div class="qr-field">' +
        '<label for="qr-password">Contraseña</label>' +
        '<input type="text" id="qr-password" placeholder="••••••••" autocomplete="off">' +
        '</div>' +
        '<div class="qr-field">' +
        '<label for="qr-seguridad">Seguridad</label>' +
        '<select id="qr-seguridad">' +
        '<option value="WPA">WPA / WPA2 / WPA3</option>' +
        '<option value="WEP">WEP</option>' +
        '<option value="nopass">Sin contraseña</option>' +
        '</select>' +
        '</div>';
    } else if (tipoActivo === 'contacto') {
      html =
        '<div class="qr-field">' +
        '<label for="qr-nombre">Nombre completo</label>' +
        '<input type="text" id="qr-nombre" placeholder="Juan Pérez" autocomplete="off">' +
        '</div>' +
        '<div class="qr-field">' +
        '<label for="qr-tel-contacto">Teléfono</label>' +
        '<input type="tel" id="qr-tel-contacto" placeholder="+5493765168963" inputmode="tel" autocomplete="off">' +
        '</div>' +
        '<div class="qr-field">' +
        '<label for="qr-email-contacto">Email</label>' +
        '<input type="email" id="qr-email-contacto" placeholder="juan@ejemplo.com" inputmode="email" autocomplete="off">' +
        '</div>';
    } else if (tipoActivo === 'email') {
      html =
        '<div class="qr-field">' +
        '<label for="qr-email-dest">Email destino</label>' +
        '<input type="email" id="qr-email-dest" placeholder="destinatario@ejemplo.com" inputmode="email" autocomplete="off">' +
        '</div>' +
        '<div class="qr-field">' +
        '<label for="qr-email-asunto">Asunto (opcional)</label>' +
        '<input type="text" id="qr-email-asunto" placeholder="Consulta" autocomplete="off">' +
        '</div>';
    } else if (tipoActivo === 'telefono') {
      html =
        '<div class="qr-field">' +
        '<label for="qr-tel">Teléfono</label>' +
        '<input type="tel" id="qr-tel" placeholder="+5493765168963" inputmode="tel" autocomplete="off">' +
        '</div>';
    }
    form.innerHTML = html;
    const cbuInput = document.getElementById('qr-cbu');
    if (cbuInput) {
      cbuInput.addEventListener('input', () => actualizarValidacionCBU(cbuInput.value));
    }
  }

  function obtenerContenido() {
    if (tipoActivo === 'texto' || tipoActivo === 'url') {
      const el = document.getElementById('qr-contenido');
      const t = el ? el.value.trim() : '';
      if (!t) return { ok: false, msg: 'Escribí o pegá el contenido' };
      let content = t;
      const tieneEsquema = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t);
      const pareceDominio = /^[\w.-]+\.[a-z]{2,}(\/|$|\?|#)/i.test(t);
      if (!tieneEsquema && pareceDominio) content = 'https://' + t;
      return { ok: true, content, resumen: t.slice(0, 50) };
    }
    if (tipoActivo === 'whatsapp') {
      const telEl = document.getElementById('qr-telefono');
      const tel = (telEl ? telEl.value : '').replace(/\D/g, '');
      if (tel.length < 8) return { ok: false, msg: 'Ingresá un teléfono válido' };
      const msgEl = document.getElementById('qr-mensaje');
      const msg = msgEl ? msgEl.value.trim() : '';
      const content = 'https://wa.me/' + tel + (msg ? '?text=' + encodeURIComponent(msg) : '');
      return { ok: true, content, resumen: 'WhatsApp +' + tel };
    }
    if (tipoActivo === 'cbu') {
      const titularEl = document.getElementById('qr-titular');
      const cbuEl = document.getElementById('qr-cbu');
      const aliasEl = document.getElementById('qr-alias');
      const bancoEl = document.getElementById('qr-banco');
      const titular = titularEl ? titularEl.value.trim() : '';
      const cbu = cbuEl ? cbuEl.value.replace(/\s/g, '') : '';
      const alias = aliasEl ? aliasEl.value.trim() : '';
      const banco = bancoEl ? bancoEl.value.trim() : '';
      if (!cbu && !alias) return { ok: false, msg: 'Ingresá CBU/CVU o alias' };
      if (cbu) {
        const v = validarCBUoCVU(cbu);
        if (!v.ok) return { ok: false, msg: v.msg };
      }
      const lineas = [];
      if (titular) lineas.push('Titular: ' + titular);
      if (cbu) lineas.push('CBU/CVU: ' + cbu);
      if (alias) lineas.push('Alias: ' + alias);
      if (banco) lineas.push('Banco: ' + banco);
      return { ok: true, content: lineas.join('\n'), resumen: (alias || cbu).slice(0, 50) };
    }
    if (tipoActivo === 'wifi') {
      const ssidEl = document.getElementById('qr-ssid');
      const passEl = document.getElementById('qr-password');
      const segEl = document.getElementById('qr-seguridad');
      const ssid = ssidEl ? ssidEl.value.trim() : '';
      if (!ssid) return { ok: false, msg: 'Ingresá el nombre de la red' };
      const pass = passEl ? passEl.value : '';
      const seg = segEl ? segEl.value : 'WPA';
      if (seg !== 'nopass' && !pass) return { ok: false, msg: 'Ingresá la contraseña' };
      const esc = s => s.replace(/([\\;,":])/g, '\\$1');
      let content = 'WIFI:T:' + seg + ';S:' + esc(ssid) + ';';
      if (seg !== 'nopass') content += 'P:' + esc(pass) + ';';
      content += ';';
      return { ok: true, content, resumen: 'WiFi: ' + ssid };
    }
    if (tipoActivo === 'contacto') {
      const nombreEl = document.getElementById('qr-nombre');
      const nombre = nombreEl ? nombreEl.value.trim() : '';
      if (!nombre) return { ok: false, msg: 'Ingresá el nombre' };
      const telEl = document.getElementById('qr-tel-contacto');
      const emailEl = document.getElementById('qr-email-contacto');
      const tel = telEl ? telEl.value.trim() : '';
      const email = emailEl ? emailEl.value.trim() : '';
      const lineas = ['BEGIN:VCARD', 'VERSION:3.0', 'FN:' + nombre];
      if (tel) lineas.push('TEL;TYPE=CELL:' + tel);
      if (email) lineas.push('EMAIL:' + email);
      lineas.push('END:VCARD');
      return { ok: true, content: lineas.join('\n'), resumen: nombre };
    }
    if (tipoActivo === 'email') {
      const destEl = document.getElementById('qr-email-dest');
      const dest = destEl ? destEl.value.trim() : '';
      if (!dest) return { ok: false, msg: 'Ingresá el email destino' };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dest)) return { ok: false, msg: 'Email inválido' };
      const asuntoEl = document.getElementById('qr-email-asunto');
      const asunto = asuntoEl ? asuntoEl.value.trim() : '';
      const params = [];
      if (asunto) params.push('subject=' + encodeURIComponent(asunto));
      const content = 'mailto:' + dest + (params.length ? '?' + params.join('&') : '');
      return { ok: true, content, resumen: 'Email: ' + dest };
    }
    if (tipoActivo === 'telefono') {
      const el = document.getElementById('qr-tel');
      const tel = (el ? el.value : '').replace(/\D/g, '');
      if (tel.length < 8) return { ok: false, msg: 'Teléfono inválido' };
      return { ok: true, content: 'tel:+' + tel, resumen: 'Tel: +' + tel };
    }
    return { ok: false, msg: 'Tipo desconocido' };
  }

  function construirQR(content, ecc) {
    for (let v = 1; v <= 40; v++) {
      try {
        const qr = qrcode(v, ecc);
        qr.addData(content);
        qr.make();
        return qr;
      } catch (e) {}
    }
    return null;
  }

  function generar() {
    const r = obtenerContenido();
    if (!r.ok) { toast(r.msg, 'error'); return; }
    const sizeEl = document.getElementById('qr-size');
    const eccEl = document.getElementById('qr-ecc');
    const size = parseInt(sizeEl.value, 10) || 512;
    const ecc = eccEl.value || 'M';
    let qr;
    try {
      qr = construirQR(r.content, ecc);
    } catch (e) {
      console.error('[QR] Error construyendo QR:', e);
      toast('Error al generar el QR', 'error');
      return;
    }
    if (!qr) { toast('El contenido es demasiado largo', 'error'); return; }
    ultimo = { qr, content: r.content, resumen: r.resumen, tipo: tipoActivo, size, ecc };
    const preview = document.getElementById('qr-preview');
    if (!preview) { toast('Error: falta contenedor', 'error'); return; }
    preview.innerHTML = '';
    preview.appendChild(renderCanvas(qr, size, true));
    document.getElementById('qr-vacio').hidden = true;
    document.getElementById('qr-acciones').hidden = false;
    const cont = document.querySelector('.qr-preview-container');
    if (cont) cont.classList.add('has-qr');
    guardarEnHistorial({ tipo: tipoActivo, resumen: r.resumen, content: r.content });
    vibrar(10);
    toast('QR generado');
    if (window.innerWidth < 860) {
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
      setTimeout(() => {
        const c = document.querySelector('.qr-preview-container');
        if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 250);
    }
  }

  function renderCanvas(qr, targetSize, useDPR) {
    const canvas = document.createElement('canvas');
    const modules = qr.getModuleCount();
    const margin = 4;
    const total = modules + 2 * margin;
    const cell = Math.max(1, Math.floor(targetSize / total));
    const size = cell * total;
    const dpr = useDPR ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.maxWidth = size + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect((c + margin) * cell, (r + margin) * cell, cell, cell);
        }
      }
    }
    return canvas;
  }

  function generarSVG(qr) {
    const modules = qr.getModuleCount();
    const margin = 4;
    const total = modules + 2 * margin;
    let path = '';
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        if (qr.isDark(r, c)) path += 'M' + (c + margin) + ' ' + (r + margin) + 'h1v1h-1z';
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total + '" shape-rendering="crispEdges"><rect width="' + total + '" height="' + total + '" fill="#ffffff"/><path d="' + path + '" fill="#000000"/></svg>';
  }

  function descargarPNG() {
    if (!ultimo) return;
    const canvas = renderCanvas(ultimo.qr, ultimo.size, false);
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'qr-' + ultimo.tipo + '-' + Date.now() + '.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('PNG descargado');
    }, 'image/png');
  }

  function descargarSVG() {
    if (!ultimo) return;
    descargarArchivo('qr-' + ultimo.tipo + '-' + Date.now() + '.svg', generarSVG(ultimo.qr), 'image/svg+xml');
    toast('SVG descargado');
  }

  function copiarContenido() {
    if (!ultimo) return;
    const texto = ultimo.content;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto)
        .then(() => toast('Contenido copiado'))
        .catch(() => fallbackCopiar(texto));
    } else {
      fallbackCopiar(texto);
    }
  }

  function fallbackCopiar(texto) {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('Contenido copiado'); }
    catch { toast('No se pudo copiar', 'error'); }
    document.body.removeChild(ta);
  }

  function guardarEnHistorial(entry) {
    const hist = storage.get(KEY_HIST, []);
    hist.unshift({ tipo: entry.tipo, resumen: entry.resumen, content: entry.content, fecha: fmtFecha(), ts: Date.now() });
    storage.set(KEY_HIST, hist.slice(0, LIMITE_HIST));
    cargarHistorial();
  }

  function cargarHistorial() {
    const hist = storage.get(KEY_HIST, []);
    const lista = document.getElementById('qr-historial');
    const counter = document.getElementById('qr-counter');
    const vacio = document.getElementById('qr-historial-vacio');
    if (counter) counter.textContent = hist.length;
    if (!hist.length) {
      if (lista) lista.innerHTML = '';
      if (vacio) vacio.hidden = false;
      return;
    }
    if (vacio) vacio.hidden = true;
    lista.innerHTML = hist.map((h, i) => {
      return '<li>' +
        '<span class="qr-hist-tipo">' + escapeHtml(h.tipo || '') + '</span>' +
        '<span class="qr-hist-resumen">' + escapeHtml(h.resumen || '') + '</span>' +
        '<span class="qr-hist-fecha">' + escapeHtml(h.fecha || '') + '</span>' +
        '<button type="button" class="btn btn-ghost btn-sm qr-hist-regenerar" data-i="' + i + '" title="Regenerar">↻</button>' +
        '</li>';
    }).join('');
    lista.querySelectorAll('.qr-hist-regenerar').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.i, 10);
        const h = hist[idx];
        if (!h || !h.content) return;
        tipoActivo = 'texto';
        document.querySelectorAll('#qr-tipos .qr-tipo').forEach(t => {
          const activo = t.dataset.tipo === 'texto';
          t.classList.toggle('active', activo);
          t.setAttribute('aria-selected', String(activo));
        });
        renderFormulario();
        const el = document.getElementById('qr-contenido');
        if (el) el.value = h.content;
        generar();
      });
    });
  }

  function limpiarHistorial() {
    if (!confirm('¿Borrar todo el historial de QRs?')) return;
    storage.remove(KEY_HIST);
    cargarHistorial();
    toast('Historial borrado');
  }

  function actualizarValidacionCBU(valor) {
    const hint = document.getElementById('qr-cbu-hint');
    if (!hint) return;
    const v = valor.replace(/\s/g, '');
    if (!v) { hint.textContent = ''; hint.className = 'qr-hint'; return; }
    const r = validarCBUoCVU(v);
    hint.textContent = r.msg;
    hint.className = 'qr-hint ' + (r.ok ? 'ok' : 'error');
  }

  function validarCBUoCVU(codigo) {
    const digits = codigo.replace(/\D/g, '');
    if (digits.length !== 22) return { ok: false, msg: 'Debe tener 22 dígitos' };
    const d = digits.split('').map(Number);
    const p1 = [7, 1, 3, 9, 7, 1, 3];
    let s1 = 0;
    for (let i = 0; i < 7; i++) s1 += d[i] * p1[i];
    const c1 = (10 - (s1 % 10)) % 10;
    const p2 = [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3];
    let s2 = 0;
    for (let i = 0; i < 13; i++) s2 += d[8 + i] * p2[i];
    const c2 = (10 - (s2 % 10)) % 10;
    if (c1 === d[7] && c2 === d[21]) return { ok: true, msg: 'CBU/CVU válido' };
    return { ok: false, msg: 'Dígitos verificadores incorrectos' };
  }

  return { init };
})();