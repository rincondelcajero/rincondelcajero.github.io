const Comisiones = (() => {
  const { storage, toast, escapeHtml, fmtMoneda, fmtFecha, descargarArchivo } = TRC;
  const KEY = 'comisiones:historial';
  const KEY_PORC = 'comisiones:ultimoPorcentaje';
  let inicializado = false;

  function init() {
    if (inicializado) return;
    const btn = document.getElementById('com-calcular');
    if (!btn) return;
    const ultPorc = storage.get(KEY_PORC, null);
    if (ultPorc !== null) {
      document.getElementById('com-porcentaje').value = ultPorc;
    }
    btn.addEventListener('click', calcular);
    document.getElementById('com-limpiar').addEventListener('click', limpiar);
    document.getElementById('com-exportar').addEventListener('click', exportar);
    document.getElementById('com-copiar').addEventListener('click', copiarResultado);
    ['com-caja', 'com-porcentaje', 'com-administrador'].forEach(id => {
      document.getElementById(id).addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); calcular(); }
      });
    });
    render();
    inicializado = true;
  }

  function calcular() {
    const caja = parseFloat(document.getElementById('com-caja').value);
    const porcentaje = parseFloat(document.getElementById('com-porcentaje').value);
    const administrador = document.getElementById('com-administrador').value.trim();
    if (isNaN(caja) || caja <= 0) {
      toast('Ingresá una caja válida', 'error');
      document.getElementById('com-caja').focus();
      return;
    }
    if (isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
      toast('El porcentaje debe estar entre 0 y 100', 'error');
      document.getElementById('com-porcentaje').focus();
      return;
    }
    storage.set(KEY_PORC, porcentaje);
    const miGanancia = Math.round(caja * (porcentaje / 100) * 100) / 100;
    const alAdministrador = Math.round((caja - miGanancia) * 100) / 100;
    document.getElementById('com-al-admin').textContent = '$' + fmtMoneda(alAdministrador);
    document.getElementById('com-ganancia').textContent = '$' + fmtMoneda(miGanancia);
    document.getElementById('com-resultado').hidden = false;
    document.getElementById('com-vacio').hidden = true;
    document.getElementById('com-copiar').hidden = false;
    const historial = storage.get(KEY, []);
    historial.unshift({
      fecha: fmtFecha(),
      administrador: administrador || '—',
      caja,
      porcentaje,
      alAdministrador,
      miGanancia
    });
    storage.set(KEY, historial.slice(0, 100));
    render();
    toast('Cierre guardado');
    if (window.matchMedia('(max-width: 860px)').matches) {
      const box = document.getElementById('com-resultado');
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function copiarResultado() {
    const admin = document.getElementById('com-al-admin').textContent;
    const ganancia = document.getElementById('com-ganancia').textContent;
    const texto = `Cierre de caja — Le paso al administrador: ${admin} · Mi ganancia: ${ganancia}`;
    copiarAlPortapapeles(texto);
  }

  function copiarAlPortapapeles(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto)
        .then(() => toast('Resultado copiado'))
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
    try {
      document.execCommand('copy');
      toast('Resultado copiado');
    } catch {
      toast('No se pudo copiar', 'error');
    }
    document.body.removeChild(ta);
  }

  function limpiar() {
    if (!confirm('¿Borrar todo el historial de cierres?')) return;
    storage.remove(KEY);
    document.getElementById('com-resultado').hidden = true;
    document.getElementById('com-vacio').hidden = false;
    document.getElementById('com-copiar').hidden = true;
    render();
    toast('Historial borrado');
  }

  function render() {
    const historial = storage.get(KEY, []);
    const tbody = document.getElementById('com-tabla-body');
    const vacio = document.getElementById('com-tabla-vacio');
    const tabla = document.getElementById('com-tabla');
    const counter = document.getElementById('com-counter');
    if (counter) counter.textContent = historial.length;
    if (!historial.length) {
      tbody.innerHTML = '';
      tabla.hidden = true;
      vacio.hidden = false;
      return;
    }
    tabla.hidden = false;
    vacio.hidden = true;
    tbody.innerHTML = historial.map(h => `
      <tr>
        <td>${escapeHtml(h.fecha)}</td>
        <td>${escapeHtml(h.administrador)}</td>
        <td>$${fmtMoneda(h.caja)}</td>
        <td>${h.porcentaje}%</td>
        <td class="monto-ret">$${fmtMoneda(h.alAdministrador)}</td>
        <td class="monto-dep">$${fmtMoneda(h.miGanancia)}</td>
      </tr>
    `).join('');
  }

  function exportar() {
    const historial = storage.get(KEY, []);
    if (!historial.length) { toast('No hay datos para exportar', 'error'); return; }
    const filas = [
      ['Fecha','Administrador','Caja total','Porcentaje','Al administrador','Tu ganancia'],
      ...historial.map(h => [h.fecha, h.administrador, h.caja, h.porcentaje, h.alAdministrador, h.miGanancia])
    ];
    const csv = filas.map(f => f.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    descargarArchivo('cierres-de-caja.csv', csv, 'text/csv');
    toast('CSV descargado');
  }

  return { init };
})();