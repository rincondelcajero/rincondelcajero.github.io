const PWAInstall = (() => {
  const KEY_DESCARTADO = 'pwa:descartado';
  const KEY_INSTALADO  = 'pwa:instalado';
  const DIAS_ESPERA    = 14;
  const DELAY_MS       = 5000;

  let deferredPrompt = null;
  let bannerEl = null;
  let timer = null;
  let inicializado = false;
  let plataforma = 'unknown';

  function init() {
    if (inicializado) return;
    if (yaInstalado()) {
      console.info('[PWA] App ya instalada, no se muestra banner.');
      return;
    }
    if (fueDescartado()) {
      console.info('[PWA] Banner descartado recientemente, no se muestra.');
      return;
    }

    inicializado = true;
    plataforma = detectarPlataforma();
    console.info('[PWA] Plataforma detectada:', plataforma);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      console.info('[PWA] beforeinstallprompt capturado.');
      if (bannerEl) actualizarBanner();
    });

    window.addEventListener('appinstalled', () => {
      TRC.storage.set(KEY_INSTALADO, true);
      console.info('[PWA] App instalada por el usuario.');
      ocultarBanner();
      setTimeout(() => {
        if (bannerEl && bannerEl.parentNode) {
          bannerEl.parentNode.removeChild(bannerEl);
          bannerEl = null;
        }
      }, 500);
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', arrancar);
    } else {
      arrancar();
    }
  }

  function arrancar() {
    crearBanner();
    programarMostrar();
  }

  function detectarPlataforma() {
    const ua = navigator.userAgent;
    const esIOS = /iPhone|iPad|iPod/.test(ua) ||
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (esIOS) {
      const esSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua);
      return esSafari ? 'ios-safari' : 'ios-other';
    }
    if (/Android/.test(ua))    return 'android';
    if (/Edg\//.test(ua))      return 'edge-desktop';
    if (/Firefox/.test(ua))    return 'firefox-desktop';
    if (/Chrome/.test(ua))     return 'chrome-desktop';
    if (/Safari/.test(ua))     return 'safari-desktop';
    return 'unknown';
  }

  function crearBanner() {
    if (bannerEl) return;

    const wrap = document.createElement('div');
    wrap.id = 'pwa-install-banner';
    wrap.className = 'pwa-banner';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', 'Instalar aplicación');
    wrap.hidden = true;
    wrap.innerHTML = `
      <div class="pwa-banner-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3v12"/>
          <path d="M7 10l5 5 5-5"/>
          <path d="M5 21h14"/>
        </svg>
      </div>
      <div class="pwa-banner-texto">
        <strong class="pwa-banner-titulo">Instalá El Rincón del Cajero</strong>
        <span class="pwa-banner-sub">Accedé más rápido desde tu inicio.</span>
      </div>
      <button type="button" class="pwa-banner-btn" data-accion="instalar">Instalar</button>
      <button type="button" class="pwa-banner-cerrar" data-accion="cerrar" aria-label="Cerrar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    `;

    document.body.appendChild(wrap);
    bannerEl = wrap;

    wrap.addEventListener('click', (e) => {
      const accion = e.target.closest('[data-accion]');
      if (!accion) return;
      const val = accion.dataset.accion;
      if (val === 'instalar') instalar();
      else if (val === 'cerrar') descartar();
    });
  }

  function programarMostrar() {
    clearTimeout(timer);
    timer = setTimeout(mostrarBanner, DELAY_MS);
  }

  function mostrarBanner() {
    if (!bannerEl) return;
    if (fueDescartado()) return;
    if (yaInstalado()) return;
    if (!bannerEl.hidden) return;

    actualizarBanner();
    bannerEl.hidden = false;
    requestAnimationFrame(() => bannerEl.classList.add('show'));
    console.info('[PWA] Banner mostrado. deferredPrompt:', !!deferredPrompt);
  }

  function actualizarBanner() {
    if (!bannerEl) return;
    const titulo = bannerEl.querySelector('.pwa-banner-titulo');
    const sub    = bannerEl.querySelector('.pwa-banner-sub');
    const btn    = bannerEl.querySelector('.pwa-banner-btn');
    if (!titulo || !sub || !btn) return;

    if (deferredPrompt) {
      titulo.textContent = 'Instalá El Rincón del Cajero';
      sub.textContent    = 'Accedé más rápido desde tu inicio.';
      btn.hidden         = false;
      btn.textContent    = 'Instalar';
      return;
    }

    switch (plataforma) {
      case 'ios-safari':
        titulo.textContent = 'Instalá la app en tu iPhone';
        sub.textContent    = 'Tocá Compartir y elegí "Agregar a inicio".';
        btn.hidden         = true;
        break;
      case 'ios-other':
        titulo.textContent = 'Instalá la app en tu iPhone';
        sub.textContent    = 'Abrí esta web en Safari para instalarla.';
        btn.hidden         = true;
        break;
      case 'firefox-desktop':
      case 'safari-desktop':
        titulo.textContent = 'El Rincón del Cajero';
        sub.textContent    = 'Para instalar la app, usá Chrome o Edge.';
        btn.hidden         = true;
        break;
      case 'chrome-desktop':
      case 'android':
        titulo.textContent = 'Instalá El Rincón del Cajero';
        sub.textContent    = 'Menú ⋮ → Instalar aplicación.';
        btn.hidden         = true;
        break;
      case 'edge-desktop':
        titulo.textContent = 'Instalá El Rincón del Cajero';
        sub.textContent    = 'Menú ⋯ → Aplicaciones → Instalar este sitio.';
        btn.hidden         = true;
        break;
      default:
        titulo.textContent = 'Instalá El Rincón del Cajero';
        sub.textContent    = 'Usá el menú del navegador para instalarla.';
        btn.hidden         = true;
    }
  }

  function ocultarBanner() {
    if (!bannerEl) return;
    bannerEl.classList.remove('show');
    setTimeout(() => {
      if (bannerEl) bannerEl.hidden = true;
    }, 450);
  }

  async function instalar() {
    if (!deferredPrompt) {
      mostrarInstrucciones();
      return;
    }
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.info('[PWA] Resultado del prompt:', outcome);
      if (outcome === 'accepted') {
        TRC.storage.set(KEY_INSTALADO, true);
        TRC.toast('¡Listo! Ya podés abrir la app desde tu inicio.');
      } else {
        TRC.storage.set(KEY_DESCARTADO, Date.now());
      }
    } catch (err) {
      console.warn('[PWA] Error al instalar:', err);
    }
    deferredPrompt = null;
    ocultarBanner();
  }

  function mostrarInstrucciones() {
    let msg = 'Usá el menú del navegador para instalar la app.';
    if (plataforma === 'chrome-desktop' || plataforma === 'android') {
      msg = 'Menú ⋮ → Instalar aplicación.';
    } else if (plataforma === 'edge-desktop') {
      msg = 'Menú ⋯ → Aplicaciones → Instalar este sitio.';
    } else if (plataforma === 'ios-safari') {
      msg = 'Compartir → Agregar a inicio.';
    } else if (plataforma === 'ios-other') {
      msg = 'Abrí esta web en Safari para instalarla.';
    } else if (plataforma === 'firefox-desktop' || plataforma === 'safari-desktop') {
      msg = 'Para instalar, usá Chrome o Edge.';
    }
    TRC.toast(msg);
  }

  function descartar() {
    TRC.storage.set(KEY_DESCARTADO, Date.now());
    ocultarBanner();
  }

  function fueDescartado() {
    const ts = TRC.storage.get(KEY_DESCARTADO, null);
    if (!ts) return false;
    const dias = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    return dias < DIAS_ESPERA;
  }

  function yaInstalado() {
    if (TRC.storage.get(KEY_INSTALADO, false)) return true;
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return true;
    if (window.navigator.standalone === true) return true;
    return false;
  }

  return { init };
})();