const Plantillas = (() => {
  const { storage, toast, escapeHtml } = TRC;
  const KEY = 'plantillas:personalizadas';

  const CATEGORIAS = [
    { id: 'todas', label: 'Todas' },
    { id: 'bienvenida', label: 'Bienvenida' },
    { id: 'pagos', label: 'Pagos' },
    { id: 'retiros', label: 'Retiros' },
    { id: 'promociones', label: 'Promociones' },
    { id: 'soporte', label: 'Soporte' },
    { id: 'agradecimiento', label: 'Agradecimiento' },
    { id: 'personalizadas', label: 'Mis plantillas' },
  ];

  const CATEGORIAS_MODAL = [
    { id: 'bienvenida', label: 'Bienvenida' },
    { id: 'pagos', label: 'Pagos' },
    { id: 'retiros', label: 'Retiros' },
    { id: 'promociones', label: 'Promociones' },
    { id: 'soporte', label: 'Soporte' },
    { id: 'agradecimiento', label: 'Agradecimiento' },
    { id: 'otros', label: 'Otros' },
  ];

  const BASE = [
    { id: 'bienvenida', cat: 'bienvenida', titulo: 'Bienvenida', texto: '¡Hola {nombre}! Bienvenido/a a {casino}. Cualquier duda que tengas, estoy a disposición. ¡Mucha suerte!' },
    { id: 'primer-contacto', cat: 'bienvenida', titulo: 'Primer contacto', texto: 'Hola {nombre}, soy tu cajero asignado en {casino}. Cuando necesites hacer una operación, escribime por acá y te ayudo al toque.' },
    { id: 'registro-ok', cat: 'bienvenida', titulo: 'Registro confirmado', texto: '{nombre}, tu registro en {casino} ya está activo. Cuando quieras hacer tu primer depósito, avisame.' },

    { id: 'deposito-ok', cat: 'pagos', titulo: 'Depósito acreditado', texto: '{nombre}, tu depósito de ${monto} fue acreditado correctamente en {casino}. ¡Ya podés jugar!' },
    { id: 'datos-pago', cat: 'pagos', titulo: 'Datos para transferir', texto: '{nombre}, para acreditar tu saldo transferí ${monto} a: {extra}. Avisame cuando lo hagas y lo confirmo al toque.' },
    { id: 'recordatorio-pago', cat: 'pagos', titulo: 'Recordatorio de pago', texto: '{nombre}, te recuerdo que quedó pendiente un pago de ${monto}. Cuando puedas, avisame y lo resolvemos. ¡Gracias!' },
    { id: 'pago-recibido', cat: 'pagos', titulo: 'Pago recibido', texto: '{nombre}, recibí tu pago de ${monto}. Ya estoy procesando la acreditación, en unos minutos te confirmo.' },
    { id: 'error-pago', cat: 'pagos', titulo: 'Problema con el pago', texto: '{nombre}, tu pago de ${monto} no se pudo procesar. ¿Podés revisar los datos y volver a intentar? Cualquier cosa avisame.' },

    { id: 'retiro-proceso', cat: 'retiros', titulo: 'Retiro en proceso', texto: 'Hola {nombre}, tu retiro de ${monto} está siendo procesado. Te aviso apenas se complete. Gracias por la paciencia.' },
    { id: 'retiro-ok', cat: 'retiros', titulo: 'Retiro completado', texto: '{nombre}, tu retiro de ${monto} ya fue enviado. En breve lo vas a ver acreditado. ¡Gracias por jugar con nosotros!' },
    { id: 'retiro-datos', cat: 'retiros', titulo: 'Pedir datos para retiro', texto: '{nombre}, para procesar tu retiro de ${monto} necesito que me pases tu {extra}. Avisame y lo gestiono.' },
    { id: 'retiro-pendiente', cat: 'retiros', titulo: 'Retiro pendiente', texto: '{nombre}, tu retiro de ${monto} quedó pendiente de verificación. En cuanto se apruebe, te aviso.' },

    { id: 'promo-activa', cat: 'promociones', titulo: 'Promoción activa', texto: '{nombre}, tenemos una promo activa en {casino}: {extra}. ¿Te interesa que te cuente los detalles?' },
    { id: 'bono-disponible', cat: 'promociones', titulo: 'Bono disponible', texto: '{nombre}, tenés un bono disponible en {casino} por ${monto}. ¿Querés que te explique cómo activarlo?' },
    { id: 'torneo', cat: 'promociones', titulo: 'Torneo o sorteo', texto: '{nombre}, se viene un torneo en {casino} con premios de ${monto}. Si querés participar, avisame y te paso las bases.' },

    { id: 'espera', cat: 'soporte', titulo: 'Tiempo de espera', texto: '{nombre}, estoy atendiendo otra consulta. En unos minutos te respondo. Gracias por la paciencia.' },
    { id: 'consulta-recibida', cat: 'soporte', titulo: 'Consulta recibida', texto: '{nombre}, recibí tu consulta. Estoy revisándolo y te confirmo en cuanto tenga novedades.' },
    { id: 'demora-tecnica', cat: 'soporte', titulo: 'Demora técnica', texto: '{nombre}, estamos teniendo una demora técnica en {casino}. Te aviso apenas se normalice. Disculpá las molestias.' },
    { id: 'datos-faltantes', cat: 'soporte', titulo: 'Faltan datos', texto: '{nombre}, para poder ayudarte necesito que me confirmes {extra}. Avisame y seguimos.' },

    { id: 'gracias', cat: 'agradecimiento', titulo: 'Agradecimiento', texto: '¡Gracias por la confianza, {nombre}! Cualquier cosa que necesites en {casino}, escribime sin problema.' },
    { id: 'cierre-conv', cat: 'agradecimiento', titulo: 'Cierre de conversación', texto: 'Gracias por escribirme, {nombre}. Cualquier cosa que surja, acá estoy. ¡Buena suerte!' },
  ];

  let categoriaActiva = 'todas';
  let busqueda = '';
  let editandoId = null;
  let inicializado = false;

  function init() {
    if (inicializado) return;
    const lista = document.getElementById('pl-lista');
    if (!lista) return;

    ['pl-nombre', 'pl-monto', 'pl-casino', 'pl-extra'].forEach(id => {
      document.getElementById(id).addEventListener('input', render);
    });

    const inputBuscar = document.getElementById('pl-buscar');
    const btnClear = document.getElementById('pl-buscar-clear');
    inputBuscar.addEventListener('input', () => {
      busqueda = inputBuscar.value.trim().toLowerCase();
      btnClear.hidden = !busqueda;
      render();
    });
    btnClear.addEventListener('click', () => {
      inputBuscar.value = '';
      busqueda = '';
      btnClear.hidden = true;
      render();
      inputBuscar.focus();
    });

    document.getElementById('pl-tabs').addEventListener('click', e => {
      const tab = e.target.closest('.pl-tab');
      if (!tab) return;
      categoriaActiva = tab.dataset.cat;
      render();
    });

    document.getElementById('pl-nueva').addEventListener('click', () => abrirModal());
    document.getElementById('pl-modal-guardar').addEventListener('click', guardarModal);

    document.getElementById('pl-limpiar-vars').addEventListener('click', () => {
      ['pl-nombre', 'pl-monto', 'pl-casino', 'pl-extra'].forEach(id => {
        document.getElementById(id).value = '';
      });
      render();
      toast('Variables limpiadas');
    });

    document.querySelectorAll('[data-modal-close]').forEach(el => {
      el.addEventListener('click', cerrarModal);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('pl-modal');
        if (modal && !modal.hidden) cerrarModal();
      }
    });

    ['pl-modal-titulo', 'pl-modal-texto'].forEach(id => {
      document.getElementById(id).addEventListener('keydown', e => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          guardarModal();
        }
      });
    });

    renderTabs();
    render();
    inicializado = true;
  }

  function getPersonalizadas() {
    return storage.get(KEY, []);
  }

  function setPersonalizadas(lista) {
    storage.set(KEY, lista);
  }

  function getAll() {
    const personalizadas = getPersonalizadas().map(p => ({
      id: p.id,
      cat: 'personalizadas',
      catLabel: p.cat,
      titulo: p.titulo,
      texto: p.texto,
      custom: true,
    }));
    const base = BASE.map(b => ({ ...b, catLabel: b.cat, custom: false }));
    return [...personalizadas, ...base];
  }

  function getCategoriaLabel(id) {
    const cat = CATEGORIAS_MODAL.find(c => c.id === id);
    return cat ? cat.label : 'Otros';
  }

  function filtrar(lista) {
    let filtradas = lista;

    if (categoriaActiva === 'personalizadas') {
      filtradas = filtradas.filter(p => p.custom);
    } else if (categoriaActiva !== 'todas') {
      filtradas = filtradas.filter(p => p.catLabel === categoriaActiva);
    }

    if (busqueda) {
      filtradas = filtradas.filter(p =>
        p.titulo.toLowerCase().includes(busqueda) ||
        p.texto.toLowerCase().includes(busqueda)
      );
    }
    return filtradas;
  }

  function renderTabs() {
    const tabs = document.getElementById('pl-tabs');
    tabs.innerHTML = CATEGORIAS.map(c => `
      <button type="button" class="pl-tab${c.id === categoriaActiva ? ' active' : ''}" data-cat="${c.id}">
        ${escapeHtml(c.label)}
      </button>
    `).join('');
  }

  function aplicarVariables(texto) {
    const nombre = document.getElementById('pl-nombre').value.trim() || '{nombre}';
    const monto = document.getElementById('pl-monto').value.trim() || '{monto}';
    const casino = document.getElementById('pl-casino').value.trim() || '{casino}';
    const extra = document.getElementById('pl-extra').value.trim() || '{extra}';

    return texto
      .replace(/\{nombre\}/g, nombre)
      .replace(/\{monto\}/g, monto)
      .replace(/\{casino\}/g, casino)
      .replace(/\{extra\}/g, extra);
  }

  function render() {
    const cont = document.getElementById('pl-lista');
    const vacio = document.getElementById('pl-vacio');
    const vacioTexto = document.getElementById('pl-vacio-texto');
    const counter = document.getElementById('pl-counter');

    const todas = getAll();
    const visibles = filtrar(todas);

    if (counter) counter.textContent = todas.length;

    document.querySelectorAll('.pl-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.cat === categoriaActiva);
    });

    if (!visibles.length) {
      cont.innerHTML = '';
      vacio.hidden = false;
      if (busqueda) {
        vacioTexto.textContent = 'No hay plantillas que coincidan con la búsqueda.';
      } else if (categoriaActiva === 'personalizadas') {
        vacioTexto.textContent = 'Todavía no creaste plantillas personalizadas.';
      } else {
        vacioTexto.textContent = 'No hay plantillas en esta categoría.';
      }
      return;
    }
    vacio.hidden = true;

    cont.innerHTML = visibles.map(p => {
      const preview = aplicarVariables(p.texto);
      const catLabel = getCategoriaLabel(p.catLabel);
      return `
        <div class="plantilla" data-id="${escapeHtml(p.id)}" data-custom="${p.custom ? '1' : '0'}">
          <h4>
            <span>${escapeHtml(p.titulo)}</span>
            <span class="pl-categoria-tag">${escapeHtml(catLabel)}</span>
          </h4>
          <div class="preview">${escapeHtml(preview)}</div>
          <div class="pl-acciones">
            <button class="btn btn-primary btn-sm" data-accion="copiar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="btn-icon" aria-hidden="true">
                <rect x="9" y="9" width="12" height="12" rx="2"/>
                <path d="M5 15V5a2 2 0 0 1 2-2h10"/>
              </svg>
              Copiar
            </button>
            ${p.custom ? `
              <button class="btn btn-ghost btn-sm btn-icon-only" data-accion="editar" title="Editar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="btn-icon" aria-hidden="true">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                </svg>
              </button>
              <button class="btn btn-ghost btn-sm btn-icon-only" data-accion="borrar" title="Eliminar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="btn-icon" aria-hidden="true">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                </svg>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    cont.querySelectorAll('.plantilla').forEach(card => {
      const id = card.dataset.id;
      const esCustom = card.dataset.custom === '1';

      card.querySelector('[data-accion="copiar"]').addEventListener('click', () => {
        const p = visibles.find(x => x.id === id);
        if (p) copiar(p);
      });

      if (esCustom) {
        const btnEditar = card.querySelector('[data-accion="editar"]');
        const btnBorrar = card.querySelector('[data-accion="borrar"]');
        if (btnEditar) btnEditar.addEventListener('click', () => abrirModal(id));
        if (btnBorrar) btnBorrar.addEventListener('click', () => borrar(id));
      }
    });
  }

  function abrirModal(id = null) {
    const modal = document.getElementById('pl-modal');
    const titulo = document.getElementById('pl-modal-title');
    const inputTitulo = document.getElementById('pl-modal-titulo');
    const inputCat = document.getElementById('pl-modal-categoria');
    const inputTexto = document.getElementById('pl-modal-texto');

    inputCat.innerHTML = CATEGORIAS_MODAL.map(c =>
      `<option value="${c.id}">${escapeHtml(c.label)}</option>`
    ).join('');

    if (id) {
      const p = getPersonalizadas().find(x => x.id === id);
      if (!p) return;
      editandoId = id;
      titulo.textContent = 'Editar plantilla';
      inputTitulo.value = p.titulo || '';
      inputCat.value = p.cat || 'otros';
      inputTexto.value = p.texto || '';
    } else {
      editandoId = null;
      titulo.textContent = 'Nueva plantilla';
      inputTitulo.value = '';
      inputCat.value = 'otros';
      inputTexto.value = '';
    }

    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => {
      modal.classList.add('show');
      setTimeout(() => inputTitulo.focus(), 100);
    });
  }

  function cerrarModal() {
    const modal = document.getElementById('pl-modal');
    if (!modal || modal.hidden) return;
    modal.classList.remove('show');
    setTimeout(() => {
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
      editandoId = null;
    }, 220);
  }

  function guardarModal() {
    const titulo = document.getElementById('pl-modal-titulo').value.trim();
    const cat = document.getElementById('pl-modal-categoria').value;
    const texto = document.getElementById('pl-modal-texto').value.trim();

    if (!titulo) { toast('Poné un título', 'error'); return; }
    if (!texto) { toast('Escribí el mensaje', 'error'); return; }

    const lista = getPersonalizadas();

    if (editandoId) {
      const i = lista.findIndex(p => p.id === editandoId);
      if (i >= 0) {
        lista[i] = { ...lista[i], titulo, cat, texto };
        setPersonalizadas(lista);
        toast('Plantilla actualizada');
      }
    } else {
      lista.unshift({
        id: 'custom-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        titulo,
        cat,
        texto,
      });
      setPersonalizadas(lista);
      toast('Plantilla creada');
    }

    cerrarModal();
    categoriaActiva = 'personalizadas';
    renderTabs();
    render();
  }

  function borrar(id) {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    const lista = getPersonalizadas().filter(p => p.id !== id);
    setPersonalizadas(lista);
    render();
    toast('Plantilla eliminada');
  }

  function copiar(p) {
    const texto = aplicarVariables(p.texto);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto)
        .then(() => toast('Copiado al portapapeles'))
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
      toast('Copiado al portapapeles');
    } catch {
      toast('No se pudo copiar', 'error');
    }
    document.body.removeChild(ta);
  }

  return { init };
})();