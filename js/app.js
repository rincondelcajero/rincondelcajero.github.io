(function () {
  'use strict';

  function initNavegacion() {
    const links = document.querySelectorAll('[data-nav]');
    const secciones = document.querySelectorAll('[data-section]');
    const nav = document.getElementById('nav');
    const toggle = document.getElementById('menu-toggle');

    function cerrarMenu() {
      if (nav) nav.classList.remove('open');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }

    function irA(id) {
      let encontrada = false;
      secciones.forEach(s => {
        const visible = s.dataset.section === id;
        s.hidden = !visible;
        if (visible) encontrada = true;
      });
      if (!encontrada) {
        secciones.forEach(s => { s.hidden = s.dataset.section !== 'inicio'; });
        id = 'inicio';
      }
      document.querySelectorAll('.nav-link, .bottom-nav-item').forEach(l =>
        l.classList.toggle('active', l.dataset.nav === id)
      );
      cerrarMenu();
      const isMobile = window.matchMedia('(max-width: 860px)').matches;
      window.scrollTo({ top: 0, behavior: isMobile ? 'auto' : 'smooth' });
      document.dispatchEvent(new CustomEvent('trc:section-shown', { detail: id }));
    }

    links.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const id = link.dataset.nav;
        if (!id) return;
        if (TRC && typeof TRC.vibrar === 'function') TRC.vibrar(6);
        if (history.replaceState) history.replaceState(null, '', '#' + id);
        else location.hash = id;
        irA(id);
      });
    });

    if (toggle) {
      toggle.addEventListener('click', e => {
        e.stopPropagation();
        const abierto = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(abierto));
      });
    }
    document.addEventListener('click', e => {
      if (!nav || !nav.classList.contains('open')) return;
      if (!nav.contains(e.target) && toggle && !toggle.contains(e.target)) cerrarMenu();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav && nav.classList.contains('open')) cerrarMenu();
    });

    const inicial = (location.hash || '#inicio').slice(1);
    const existe = [...secciones].some(s => s.dataset.section === inicial);
    irA(existe ? inicial : 'inicio');

    window.addEventListener('hashchange', () => {
      const id = (location.hash || '#inicio').slice(1);
      const existe = [...secciones].some(s => s.dataset.section === id);
      irA(existe ? id : 'inicio');
    });

    const celeb = document.getElementById('celebration');
    if (celeb) {
      const observer = new MutationObserver(() => {
        const visible = !celeb.hidden && celeb.classList.contains('show');
        const modalAbierto = (() => {
          const m = document.getElementById('pl-modal');
          return m && !m.hidden && m.classList.contains('show');
        })();
        if (!modalAbierto) {
          document.body.classList.toggle('no-scroll', visible);
        }
      });
      observer.observe(celeb, { attributes: true, attributeFilter: ['hidden', 'class'] });
    }
  }

  function initHerramientas() {
    try { TRC.Confetti.init(); } catch (e) { console.error('Confetti:', e); }
    try { Ruleta.init(); } catch (e) { console.error('Ruleta:', e); }
    try { Comisiones.init(); } catch (e) { console.error('Comisiones:', e); }
    try { Plantillas.init(); } catch (e) { console.error('Plantillas:', e); }
    try { QR.init(); } catch (e) { console.error('QR:', e); }
  }

  function initInstallPrompt() {
    if (typeof PWAInstall === 'undefined') return;
    try { PWAInstall.init(); } catch (e) { console.error('PWAInstall:', e); }
  }

  function initServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    const esSeguro =
      location.protocol === 'https:' ||
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1';
    if (!esSeguro) return;

    const habiaController = !!navigator.serviceWorker.controller;
    let recargando = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!habiaController) return;
      if (recargando) return;
      recargando = true;
      window.location.reload();
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then((reg) => {
          reg.update().catch(() => {});
          setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
        })
        .catch((err) => {
          console.warn('[PWA] Error SW:', err);
        });
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready
          .then((reg) => reg.update().catch(() => {}))
          .catch(() => {});
      }
    });
  }

  function arrancar() {
    initNavegacion();
    initHerramientas();
    initInstallPrompt();
    initServiceWorker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
})();