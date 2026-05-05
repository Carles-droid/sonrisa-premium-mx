/**
 * ============================================================
 * SONRISA PREMIUM MX — navbar.js
 * Módulo: Navegación principal
 *
 * Responsabilidades (SRP):
 *   - Comportamiento sticky con clase scrolled
 *   - Transparencia sobre el Hero (modo transparente)
 *   - Dropdown de Tratamientos (hover desktop / click mobile)
 *   - Menú hamburger mobile (toggle + accordion)
 *   - Lang Toggle (ES / EN)
 *   - Cierre con tecla Escape y click fuera
 *   - Trampa de foco en menú mobile (accesibilidad)
 *
 * Dependencias: ninguna (vanilla JS puro)
 * Exporta: initNavbar()
 *
 * Selectores via data-js (nunca clases CSS):
 *   data-js="navbar"
 *   data-js="navbar-toggle"
 *   data-js="dropdown-trigger"
 *   data-js="lang-btn"
 *
 * Autor: Insomne × Sonrisa Premium MX
 * ============================================================
 */

"use strict";

/* ==========================================================
   CONSTANTES DE CONFIGURACIÓN
   Centralizadas aquí para modificación rápida sin tocar lógica.
   ========================================================== */

/** Umbral de scroll (px) a partir del cual el navbar es "scrolled" */
const SCROLL_UMBRAL = 80;

/** Clase BEM del navbar en estado scrolled */
const CLASE_SCROLLED = "navbar--scrolled";

/** Clase BEM del navbar en estado transparente (sobre el hero) */
const CLASE_TRANSPARENTE = "navbar--transparente";

/** Clase BEM del menú mobile cuando está abierto */
const CLASE_MENU_ABIERTO = "navbar__menu--abierto";

/** Clase BEM del submenu cuando está abierto */
const CLASE_SUBMENU_ABIERTO = "navbar__submenu--abierto";

/** Clase BEM aplicada al body cuando el menú mobile está activo */
const CLASE_BODY_BLOQUEADO = "body--menu-abierto";

/** Duración del debounce para el scroll handler (ms) */
const DEBOUNCE_SCROLL_MS = 10;

/** Breakpoint desktop — debe coincidir con el token --bp-desktop */
const BP_DESKTOP = 1024;

/* ==========================================================
   UTILIDADES INTERNAS
   Funciones de propósito general usadas por los handlers.
   ========================================================== */

/**
 * Debounce: retrasa la ejecución de una función hasta que
 * el evento deje de dispararse por `espera` ms.
 * Mejora performance del scroll handler.
 *
 * @param {Function} fn      - Función a ejecutar
 * @param {number}   espera  - Tiempo de espera en ms
 * @returns {Function} Función debounced
 */
function debounce(fn, espera) {
  let temporizador;
  return function (...args) {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => fn.apply(this, args), espera);
  };
}

/**
 * Determina si el viewport está en modo desktop.
 *
 * @returns {boolean}
 */
function esDesktop() {
  return window.innerWidth >= BP_DESKTOP;
}

/**
 * Devuelve todos los elementos enfocables dentro de un contenedor.
 * Usado para la trampa de foco del menú mobile.
 *
 * @param {HTMLElement} contenedor
 * @returns {NodeList}
 */
function obtenerElementosEnfocables(contenedor) {
  return contenedor.querySelectorAll(
    "a[href], button:not([disabled]), input:not([disabled]), " +
      '[tabindex]:not([tabindex="-1"])',
  );
}

/* ==========================================================
   MÓDULO 1: SCROLL BEHAVIOR
   Maneja la clase --scrolled y --transparente del navbar.
   ========================================================== */

/**
 * Inicializa el comportamiento de scroll del navbar.
 * - Por encima del umbral: navbar transparente (sobre hero)
 * - Por debajo del umbral: navbar con fondo sólido + sombra
 *
 * Usa IntersectionObserver como método principal (más eficiente
 * que scroll listener). El scroll listener actúa como fallback
 * para browsers que no soporten el observer correctamente.
 *
 * @param {HTMLElement} navbar - El elemento del navbar
 * @param {HTMLElement} hero   - El elemento del hero (puede ser null)
 */
function initScrollBehavior(navbar, hero) {
  /**
   * Actualiza las clases del navbar según la posición del scroll.
   * @param {boolean} estaEnTop - true si el usuario está en la parte superior
   */
  function actualizarEstadoScroll(estaEnTop) {
    if (estaEnTop) {
      navbar.classList.remove(CLASE_SCROLLED);
      // Solo aplica transparencia si hay hero en la página
      if (hero) navbar.classList.add(CLASE_TRANSPARENTE);
    } else {
      navbar.classList.add(CLASE_SCROLLED);
      navbar.classList.remove(CLASE_TRANSPARENTE);
    }
  }

  // ── IntersectionObserver: observa el hero ──
  if (hero && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      ([entrada]) => {
        // isIntersecting: true = hero visible = navbar transparente
        actualizarEstadoScroll(entrada.isIntersecting);
      },
      {
        // El threshold 0.15 significa que el observer dispara
        // cuando el 15% del hero está visible/oculto
        threshold: 0.15,
      },
    );

    observer.observe(hero);

    // Estado inicial: verificar si el hero ya es visible al cargar
    actualizarEstadoScroll(window.scrollY < SCROLL_UMBRAL);
  } else {
    // ── Fallback: scroll event con debounce ──
    const manejarScroll = debounce(() => {
      actualizarEstadoScroll(window.scrollY < SCROLL_UMBRAL);
    }, DEBOUNCE_SCROLL_MS);

    // Estado inicial
    actualizarEstadoScroll(window.scrollY < SCROLL_UMBRAL);

    window.addEventListener("scroll", manejarScroll, { passive: true });
  }
}

/* ==========================================================
   MÓDULO 2: DROPDOWN DESKTOP
   Controla el dropdown de Tratamientos en desktop.
   ========================================================== */

/**
 * Inicializa el comportamiento del dropdown en desktop.
 *
 * Estrategia híbrida: hover como experiencia principal +
 * click como fallback accesible (teclado, touch).
 *
 * El dropdown es controlado exclusivamente por CSS en hover
 * (:hover + :focus-within). Este módulo JS maneja:
 *   - aria-expanded en el trigger
 *   - Cierre con Escape
 *   - Cierre con click fuera
 *
 * @param {NodeList} triggers - Todos los botones de dropdown
 */
function initDropdownDesktop(triggers) {
  /**
   * Cierra todos los dropdowns abiertos.
   * @param {HTMLElement|null} excluir - Trigger a excluir del cierre
   */
  function cerrarTodosLosDropdowns(excluir = null) {
    triggers.forEach((trigger) => {
      if (trigger === excluir) return;

      const submenu = trigger
        .closest(".navbar__item--has-dropdown")
        ?.querySelector(".navbar__submenu");

      trigger.setAttribute("aria-expanded", "false");
      submenu?.classList.remove(CLASE_SUBMENU_ABIERTO);
    });
  }

  triggers.forEach((trigger) => {
    const item = trigger.closest(".navbar__item--has-dropdown");
    const submenu = item?.querySelector(".navbar__submenu");

    if (!item || !submenu) return;

    // ── Click: toggle del dropdown ──
    trigger.addEventListener("click", (evento) => {
      // Solo en desktop — en mobile lo maneja initMenuMobile
      if (!esDesktop()) return;

      evento.stopPropagation();

      const estaAbierto = trigger.getAttribute("aria-expanded") === "true";

      // Cierra otros dropdowns antes de abrir este
      cerrarTodosLosDropdowns(trigger);

      if (estaAbierto) {
        // Cerrar
        trigger.setAttribute("aria-expanded", "false");
        submenu.classList.remove(CLASE_SUBMENU_ABIERTO);
      } else {
        // Abrir
        trigger.setAttribute("aria-expanded", "true");
        submenu.classList.add(CLASE_SUBMENU_ABIERTO);
      }
    });

    // ── Escape: cierra el dropdown activo ──
    item.addEventListener("keydown", (evento) => {
      if (evento.key !== "Escape") return;

      trigger.setAttribute("aria-expanded", "false");
      submenu.classList.remove(CLASE_SUBMENU_ABIERTO);

      // Devuelve el foco al trigger
      trigger.focus();
    });

    // ── Hover: actualiza aria-expanded para lectores de pantalla ──
    // El CSS ya maneja la visibilidad con :hover
    item.addEventListener("mouseenter", () => {
      if (!esDesktop()) return;
      trigger.setAttribute("aria-expanded", "true");
    });

    item.addEventListener("mouseleave", () => {
      if (!esDesktop()) return;
      trigger.setAttribute("aria-expanded", "false");
    });
  });

  // ── Click fuera: cierra todos los dropdowns ──
  document.addEventListener("click", (evento) => {
    const clicEnNavbar = evento.target.closest('[data-js="navbar"]');
    if (!clicEnNavbar) {
      cerrarTodosLosDropdowns();
    }
  });
}

/* ==========================================================
   MÓDULO 3: MENÚ MOBILE
   Controla el hamburger, apertura/cierre del menú y
   el accordion de Tratamientos en mobile.
   ========================================================== */

/**
 * Inicializa el comportamiento del menú mobile.
 *
 * @param {HTMLElement} toggle  - El botón hamburger
 * @param {HTMLElement} menu    - El elemento nav del menú
 * @param {NodeList}    triggers - Botones de dropdown (accordion en mobile)
 */
function initMenuMobile(toggle, menu, triggers) {
  let menuAbierto = false;

  // ── Abrir / Cerrar el menú ──

  /**
   * Abre el menú mobile.
   * Actualiza: aria-expanded, clases CSS, scroll del body.
   */
  function abrirMenu() {
    menuAbierto = true;
    menu.classList.add(CLASE_MENU_ABIERTO);
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Cerrar menú de navegación");
    document.body.classList.add(CLASE_BODY_BLOQUEADO);

    // Bloquea el scroll del body mientras el menú está abierto
    document.body.style.overflow = "hidden";

    // Mueve el foco al primer elemento del menú
    const primerEnlace = menu.querySelector("a, button");
    primerEnlace?.focus();
  }

  /**
   * Cierra el menú mobile.
   * También cierra cualquier accordion de Tratamientos abierto.
   */
  function cerrarMenu() {
    menuAbierto = false;
    menu.classList.remove(CLASE_MENU_ABIERTO);
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menú de navegación");
    document.body.classList.remove(CLASE_BODY_BLOQUEADO);
    document.body.style.overflow = "";

    // Cierra todos los accordions abiertos
    triggers.forEach((trigger) => {
      const submenu = trigger
        .closest(".navbar__item--has-dropdown")
        ?.querySelector(".navbar__submenu");

      trigger.setAttribute("aria-expanded", "false");
      submenu?.classList.remove(CLASE_SUBMENU_ABIERTO);
    });
  }

  // ── Evento click en el hamburger ──
  toggle.addEventListener("click", () => {
    if (menuAbierto) {
      cerrarMenu();
    } else {
      abrirMenu();
    }
  });

  // ── Accordion: Tratamientos en mobile ──
  triggers.forEach((trigger) => {
    trigger.addEventListener("click", (evento) => {
      // Solo en mobile — en desktop lo maneja initDropdownDesktop
      if (esDesktop()) return;

      evento.stopPropagation();

      const item = trigger.closest(".navbar__item--has-dropdown");
      const submenu = item?.querySelector(".navbar__submenu");

      if (!submenu) return;

      const estaAbierto = trigger.getAttribute("aria-expanded") === "true";

      // Cierra otros accordions abiertos antes de abrir este
      triggers.forEach((otroTrigger) => {
        if (otroTrigger === trigger) return;
        const otroSubmenu = otroTrigger
          .closest(".navbar__item--has-dropdown")
          ?.querySelector(".navbar__submenu");
        otroTrigger.setAttribute("aria-expanded", "false");
        otroSubmenu?.classList.remove(CLASE_SUBMENU_ABIERTO);
      });

      // Toggle del accordion actual
      if (estaAbierto) {
        trigger.setAttribute("aria-expanded", "false");
        submenu.classList.remove(CLASE_SUBMENU_ABIERTO);
      } else {
        trigger.setAttribute("aria-expanded", "true");
        submenu.classList.add(CLASE_SUBMENU_ABIERTO);
      }
    });
  });

  // ── Cierre con tecla Escape ──
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && menuAbierto) {
      cerrarMenu();
      // Devuelve el foco al botón hamburger
      toggle.focus();
    }
  });

  // ── Trampa de foco en el menú mobile ──
  // Mantiene el foco dentro del menú cuando está abierto.
  // Evita que el usuario navegue por teclado fuera del menú.
  menu.addEventListener("keydown", (evento) => {
    if (!menuAbierto || evento.key !== "Tab") return;

    const enfocables = obtenerElementosEnfocables(menu);
    const primerElemento = enfocables[0];
    const ultimoElemento = enfocables[enfocables.length - 1];

    if (evento.shiftKey) {
      // Shift + Tab: si estamos en el primero, vamos al último
      if (document.activeElement === primerElemento) {
        evento.preventDefault();
        ultimoElemento.focus();
      }
    } else {
      // Tab: si estamos en el último, vamos al primero
      if (document.activeElement === ultimoElemento) {
        evento.preventDefault();
        primerElemento.focus();
      }
    }
  });

  // ── Cierre al hacer click en un enlace del menú ──
  // Mejora UX en mobile: el menú se cierra al navegar a otra sección
  menu.querySelectorAll("a[href]").forEach((enlace) => {
    enlace.addEventListener("click", () => {
      if (!esDesktop() && menuAbierto) {
        cerrarMenu();
      }
    });
  });

  // ── Cierre al redimensionar a desktop ──
  // Evita que el menú quede abierto si el usuario rota el dispositivo
  window.addEventListener(
    "resize",
    debounce(() => {
      if (esDesktop() && menuAbierto) {
        cerrarMenu();
      }
    }, 150),
  );
}

/* ==========================================================
   MÓDULO 4: LANG TOGGLE
   Maneja el selector de idioma ES / EN.
   ========================================================== */

/**
 * Inicializa el toggle de idioma.
 *
 * En este MVP, el toggle solo actualiza el estado visual
 * (aria-pressed, clase activa). La lógica real de i18n
 * se implementa en la fase siguiente del proyecto.
 *
 * @param {NodeList} botones - Todos los botones de idioma
 */
function initLangToggle(botones) {
  botones.forEach((boton) => {
    boton.addEventListener("click", () => {
      const idiomaSeleccionado = boton.dataset.lang;

      // Actualiza aria-pressed y clase activa en todos los botones
      botones.forEach((btn) => {
        const esActivo = btn.dataset.lang === idiomaSeleccionado;
        btn.setAttribute("aria-pressed", esActivo ? "true" : "false");
        btn.classList.toggle("navbar__lang-btn--active", esActivo);
      });

      // Actualiza el atributo lang del documento
      document.documentElement.setAttribute("lang", idiomaSeleccionado);

      /**
       * TODO (fase 2): Implementar lógica de traducción real.
       * Opciones: i18next, atributos data-i18n en elementos,
       * o redirección a /en/ según la arquitectura del proyecto.
       */
      console.info(`[Navbar] Idioma seleccionado: ${idiomaSeleccionado}`);
    });
  });
}

/* ==========================================================
   FUNCIÓN PRINCIPAL DE INICIALIZACIÓN
   Orquesta todos los submódulos del navbar.
   Exportada e invocada desde main.js.
   ========================================================== */

/**
 * Inicializa el módulo completo del navbar.
 *
 * Flujo de ejecución:
 *   1. Obtiene referencias a los elementos del DOM
 *   2. Valida que los elementos existen (early return si no)
 *   3. Inicializa cada submódulo independientemente
 *
 * @returns {void}
 */
export function initNavbar() {
  // ── Obtener elementos del DOM por data-js ──
  const navbar = document.querySelector('[data-js="navbar"]');
  const toggle = document.querySelector('[data-js="navbar-toggle"]');
  const menu = document.getElementById("navbarMenu");
  const hero = document.getElementById("hero");
  const triggers = document.querySelectorAll('[data-js="dropdown-trigger"]');
  const langBtns = document.querySelectorAll('[data-js="lang-btn"]');

  // ── Validación: el navbar es un elemento crítico ──
  if (!navbar) {
    console.warn(
      "[Navbar] No se encontró el elemento del navbar. " +
        'Verifica que data-js="navbar" esté en el HTML.',
    );
    return;
  }

  // ── Inicializar submódulos ──

  // 1. Scroll behavior (siempre activo)
  initScrollBehavior(navbar, hero);

  // 2. Dropdown desktop (solo si hay triggers)
  if (triggers.length > 0) {
    initDropdownDesktop(triggers);
  }

  // 3. Menú mobile (solo si existen toggle y menu)
  if (toggle && menu) {
    initMenuMobile(toggle, menu, triggers);
  } else {
    console.warn(
      "[Navbar] Toggle o menú no encontrados. " +
        'Verifica data-js="navbar-toggle" e id="navbarMenu".',
    );
  }

  // 4. Lang toggle (solo si hay botones de idioma)
  if (langBtns.length > 0) {
    initLangToggle(langBtns);
  }

  console.info("[Navbar] Módulo inicializado correctamente.");
}
