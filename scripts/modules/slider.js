/**
 * ============================================================
 * SONRISA PREMIUM MX — slider.js
 * Módulo: Hero Image Slider
 *
 * Responsabilidades (SRP):
 *   - Navegación prev / next
 *   - Autoplay con pausa inteligente
 *   - Indicators / dots sincronizados
 *   - Swipe touch (móvil) y drag mouse (desktop)
 *   - Pausa en hover, focus y visibilidad de pestaña
 *   - Accesibilidad: aria-live, aria-selected, teclado
 *   - Respeto a prefers-reduced-motion
 *
 * Dependencias: ninguna (vanilla JS puro)
 * Exporta: initSlider()
 *
 * Selectores via data-js:
 *   data-js="hero-slider"
 *   data-js="slide-track"
 *   data-js="slider-prev"
 *   data-js="slider-next"
 *   data-js="slider-indicator"
 *
 * Arquitectura interna:
 *   El estado del slider vive en un único objeto `estado`.
 *   Todas las funciones reciben `ctx` (contexto) con los
 *   elementos del DOM y el estado — sin variables globales.
 *
 * Autor: Insomne × Sonrisa Premium MX
 * ============================================================
 */

"use strict";

/* ==========================================================
   CONSTANTES DE CONFIGURACIÓN
   ========================================================== */

/** Intervalo del autoplay en ms */
const AUTOPLAY_INTERVALO_MS = 5000;

/** Duración de la transición CSS del track (debe coincidir con --duracion-slider) */
const TRANSICION_DURACION_MS = 600;

/** Umbral mínimo de swipe en px para considerar el gesto válido */
const SWIPE_UMBRAL_PX = 50;

/** Máximo desplazamiento vertical permitido en swipe (evita conflicto con scroll) */
const SWIPE_MAX_VERTICAL_PX = 80;

/** Clase activa en los slides */
const CLASE_SLIDE_ACTIVO = "hero__slide--active";

/** Clase activa en los indicators */
const CLASE_INDICATOR_ACTIVO = "hero__indicator--active";

/* ==========================================================
   UTILIDADES INTERNAS
   ========================================================== */

/**
 * Verifica si el usuario prefiere movimiento reducido.
 * Desactiva el autoplay y la transición CSS si es true.
 *
 * @returns {boolean}
 */
function prefiereMenosMovimiento() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Normaliza un índice de slide para que nunca salga del rango.
 * Implementa la lógica circular: -1 → último, N → 0.
 *
 * @param {number} indice - Índice candidato
 * @param {number} total  - Número total de slides
 * @returns {number}      - Índice normalizado
 */
function normalizarIndice(indice, total) {
  return ((indice % total) + total) % total;
}

/* ==========================================================
   MÓDULO 1: RENDERIZADO
   Actualiza el DOM según el estado actual del slider.
   ========================================================== */

/**
 * Aplica la transición visual al slide activo.
 * Mueve el track con transform para performance óptima
 * (usa la GPU — no dispara layout recalc).
 *
 * @param {Object} ctx - Contexto del slider
 */
function renderizarSlide(ctx) {
  const { track, slides, indicators, estado } = ctx;
  const { indiceActual } = estado;

  // ── Mover el track al slide correspondiente ──
  // Cada slide ocupa el 100% del ancho del track.
  // Transform: 0% → slide 0, -100% → slide 1, etc.
  if (!prefiereMenosMovimiento()) {
    track.style.transform = `translateX(-${indiceActual * 100}%)`;
    track.style.transition = `transform ${TRANSICION_DURACION_MS}ms var(--ease-suave, cubic-bezier(0.25, 0.46, 0.45, 0.94))`;
  } else {
    // Sin animación: salto instantáneo
    track.style.transition = "none";
    track.style.transform = `translateX(-${indiceActual * 100}%)`;
  }

  // ── Actualizar clases y aria en slides ──
  slides.forEach((slide, i) => {
    const esActivo = i === indiceActual;

    slide.classList.toggle(CLASE_SLIDE_ACTIVO, esActivo);

    // aria-hidden: oculta slides inactivos a lectores de pantalla
    slide.setAttribute("aria-hidden", esActivo ? "false" : "true");
  });

  // ── Actualizar indicators ──
  indicators.forEach((indicator, i) => {
    const esActivo = i === indiceActual;

    indicator.classList.toggle(CLASE_INDICATOR_ACTIVO, esActivo);
    indicator.setAttribute("aria-selected", esActivo ? "true" : "false");
    indicator.setAttribute("tabindex", esActivo ? "0" : "-1");
  });

  // ── Actualizar aria-live del slider ──
  // Anuncia el cambio de slide solo cuando es iniciado por el usuario.
  // Cuando es autoplay (estado.esPorUsuario = false), no anuncia
  // para evitar interrupciones molestas en lectores de pantalla.
  if (estado.esPorUsuario) {
    ctx.slider.setAttribute(
      "aria-label",
      `Slide ${indiceActual + 1} de ${slides.length}`,
    );
  }
}

/* ==========================================================
   MÓDULO 2: NAVEGACIÓN
   Lógica de cambio de slide.
   ========================================================== */

/**
 * Navega al slide indicado por su índice.
 * Función central — llamada por todos los métodos de navegación.
 *
 * @param {Object}  ctx         - Contexto del slider
 * @param {number}  nuevoIndice - Índice destino (puede estar fuera de rango)
 * @param {boolean} porUsuario  - true si el cambio fue iniciado por el usuario
 */
function irASlide(ctx, nuevoIndice, porUsuario = false) {
  const { estado } = ctx;

  // Evita ir al slide que ya está activo
  const indiceNormalizado = normalizarIndice(nuevoIndice, ctx.slides.length);
  if (indiceNormalizado === estado.indiceActual) return;

  // Actualiza el estado
  estado.indiceActual = indiceNormalizado;
  estado.esPorUsuario = porUsuario;

  // Renderiza el nuevo estado
  renderizarSlide(ctx);
}

/**
 * Navega al slide anterior.
 * @param {Object} ctx
 */
function irAlAnterior(ctx) {
  irASlide(ctx, ctx.estado.indiceActual - 1, true);
}

/**
 * Navega al slide siguiente.
 * @param {Object} ctx
 */
function irAlSiguiente(ctx) {
  irASlide(ctx, ctx.estado.indiceActual + 1, true);
}

/* ==========================================================
   MÓDULO 3: AUTOPLAY
   Gestiona el inicio, pausa y reanudación del autoplay.
   ========================================================== */

/**
 * Inicia el autoplay del slider.
 * No inicia si el usuario prefiere menos movimiento.
 *
 * @param {Object} ctx
 */
function iniciarAutoplay(ctx) {
  if (prefiereMenosMovimiento()) return;
  if (ctx.estado.pausado) return;

  // Evita intervalos duplicados
  detenerAutoplay(ctx);

  ctx.estado.intervaloId = setInterval(() => {
    // Avanza al siguiente sin marcar como "por usuario"
    irASlide(ctx, ctx.estado.indiceActual + 1, false);
  }, AUTOPLAY_INTERVALO_MS);
}

/**
 * Detiene el autoplay limpiando el intervalo.
 * @param {Object} ctx
 */
function detenerAutoplay(ctx) {
  if (ctx.estado.intervaloId) {
    clearInterval(ctx.estado.intervaloId);
    ctx.estado.intervaloId = null;
  }
}

/**
 * Pausa el autoplay de forma inteligente.
 * Registra el motivo para poder reanudar correctamente.
 *
 * @param {Object} ctx
 * @param {string} motivo - 'hover' | 'focus' | 'visibilidad' | 'manual'
 */
function pausarAutoplay(ctx, motivo) {
  ctx.estado.pausas.add(motivo);
  detenerAutoplay(ctx);
}

/**
 * Reanuda el autoplay si ya no hay motivos de pausa activos.
 *
 * @param {Object} ctx
 * @param {string} motivo - El motivo de pausa que se está liberando
 */
function reanudarAutoplay(ctx, motivo) {
  ctx.estado.pausas.delete(motivo);

  // Solo reanuda si todos los motivos de pausa fueron liberados
  if (ctx.estado.pausas.size === 0) {
    iniciarAutoplay(ctx);
  }
}

/* ==========================================================
   MÓDULO 4: EVENTOS DE NAVEGACIÓN
   Botones prev/next e indicators.
   ========================================================== */

/**
 * Inicializa los eventos de los botones prev y next.
 * @param {Object} ctx
 */
function initBotonesNavegacion(ctx) {
  const { btnPrev, btnNext } = ctx;

  if (btnPrev) {
    btnPrev.addEventListener("click", () => {
      irAlAnterior(ctx);
      // Reinicia el autoplay tras interacción del usuario
      detenerAutoplay(ctx);
      iniciarAutoplay(ctx);
    });
  }

  if (btnNext) {
    btnNext.addEventListener("click", () => {
      irAlSiguiente(ctx);
      detenerAutoplay(ctx);
      iniciarAutoplay(ctx);
    });
  }
}

/**
 * Inicializa los eventos de los indicators / dots.
 * @param {Object} ctx
 */
function initIndicators(ctx) {
  ctx.indicators.forEach((indicator, i) => {
    // Click: ir al slide correspondiente
    indicator.addEventListener("click", () => {
      irASlide(ctx, i, true);
      detenerAutoplay(ctx);
      iniciarAutoplay(ctx);
    });

    // Teclado: Enter y Space también navegan (accesibilidad)
    indicator.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter" || evento.key === " ") {
        evento.preventDefault();
        irASlide(ctx, i, true);
        detenerAutoplay(ctx);
        iniciarAutoplay(ctx);
      }

      // Flechas: navegan entre indicators sin cambiar el slide activo
      if (evento.key === "ArrowLeft" || evento.key === "ArrowRight") {
        evento.preventDefault();
        const direccion = evento.key === "ArrowRight" ? 1 : -1;
        const nuevoIndice = normalizarIndice(
          i + direccion,
          ctx.indicators.length,
        );
        ctx.indicators[nuevoIndice].focus();
      }
    });
  });
}

/* ==========================================================
   MÓDULO 5: NAVEGACIÓN POR TECLADO (SLIDER COMPLETO)
   Flechas izquierda/derecha cuando el slider tiene el foco.
   ========================================================== */

/**
 * Inicializa la navegación por teclado del slider completo.
 * @param {Object} ctx
 */
function initNavegacionTeclado(ctx) {
  ctx.slider.addEventListener("keydown", (evento) => {
    switch (evento.key) {
      case "ArrowLeft":
        evento.preventDefault();
        irAlAnterior(ctx);
        detenerAutoplay(ctx);
        iniciarAutoplay(ctx);
        break;

      case "ArrowRight":
        evento.preventDefault();
        irAlSiguiente(ctx);
        detenerAutoplay(ctx);
        iniciarAutoplay(ctx);
        break;

      // Pausa manual con Space (convención de carruseles accesibles)
      case " ":
        evento.preventDefault();
        if (ctx.estado.pausas.has("manual")) {
          reanudarAutoplay(ctx, "manual");
        } else {
          pausarAutoplay(ctx, "manual");
        }
        break;
    }
  });
}

/* ==========================================================
   MÓDULO 6: PAUSA INTELIGENTE
   Hover, focus y visibilidad de pestaña del navegador.
   ========================================================== */

/**
 * Inicializa la pausa por hover sobre el slider.
 * @param {Object} ctx
 */
function initPausaHover(ctx) {
  ctx.slider.addEventListener("mouseenter", () => pausarAutoplay(ctx, "hover"));
  ctx.slider.addEventListener("mouseleave", () =>
    reanudarAutoplay(ctx, "hover"),
  );
}

/**
 * Inicializa la pausa cuando algún elemento del slider recibe foco.
 * Permite que los usuarios de teclado no sean interrumpidos.
 * @param {Object} ctx
 */
function initPausaFoco(ctx) {
  ctx.slider.addEventListener("focusin", () => pausarAutoplay(ctx, "focus"));
  ctx.slider.addEventListener("focusout", () => reanudarAutoplay(ctx, "focus"));
}

/**
 * Inicializa la pausa cuando la pestaña no es visible.
 * Evita que el slider avance mientras el usuario está en otra pestaña.
 * @param {Object} ctx
 */
function initPausaVisibilidad(ctx) {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pausarAutoplay(ctx, "visibilidad");
    } else {
      reanudarAutoplay(ctx, "visibilidad");
    }
  });
}

/* ==========================================================
   MÓDULO 7: SWIPE TOUCH Y DRAG MOUSE
   Gestión unificada de gestos táctiles y de ratón.
   ========================================================== */

/**
 * Inicializa el soporte de swipe en dispositivos táctiles
 * y drag en desktop para navegar entre slides.
 *
 * Estrategia: captura las coordenadas de inicio y fin del gesto.
 * Si el desplazamiento horizontal supera SWIPE_UMBRAL_PX y el
 * vertical no supera SWIPE_MAX_VERTICAL_PX (evita conflicto con
 * el scroll natural de la página), cambia el slide.
 *
 * @param {Object} ctx
 */
function initSwipe(ctx) {
  const { slider } = ctx;

  // Estado del gesto — reseteado en cada inicio de contacto
  let gestureState = {
    activo: false,
    inicioX: 0,
    inicioY: 0,
    deltaX: 0,
    deltaY: 0,
    esMouse: false,
  };

  // ── Inicio del gesto ──

  function onInicioGesto(clientX, clientY, esMouse) {
    gestureState = {
      activo: true,
      inicioX: clientX,
      inicioY: clientY,
      deltaX: 0,
      deltaY: 0,
      esMouse,
    };

    pausarAutoplay(ctx, "swipe");
  }

  // ── Movimiento del gesto ──

  function onMovimientoGesto(clientX, clientY) {
    if (!gestureState.activo) return;

    gestureState.deltaX = clientX - gestureState.inicioX;
    gestureState.deltaY = clientY - gestureState.inicioY;

    // Si el movimiento es mayormente vertical, cancela el gesto
    // para no bloquear el scroll natural de la página
    if (Math.abs(gestureState.deltaY) > SWIPE_MAX_VERTICAL_PX) {
      gestureState.activo = false;
      reanudarAutoplay(ctx, "swipe");
    }
  }

  // ── Fin del gesto ──

  function onFinGesto() {
    if (!gestureState.activo) return;

    const { deltaX } = gestureState;
    gestureState.activo = false;

    // Evalúa si el desplazamiento fue suficiente para cambiar slide
    if (Math.abs(deltaX) >= SWIPE_UMBRAL_PX) {
      if (deltaX < 0) {
        // Swipe hacia la izquierda → siguiente slide
        irAlSiguiente(ctx);
      } else {
        // Swipe hacia la derecha → slide anterior
        irAlAnterior(ctx);
      }
    }

    reanudarAutoplay(ctx, "swipe");
  }

  // ── Eventos Touch ──

  slider.addEventListener(
    "touchstart",
    (e) => {
      const toque = e.touches[0];
      onInicioGesto(toque.clientX, toque.clientY, false);
    },
    { passive: true },
  );

  slider.addEventListener(
    "touchmove",
    (e) => {
      const toque = e.touches[0];
      onMovimientoGesto(toque.clientX, toque.clientY);
    },
    { passive: true },
  );

  slider.addEventListener("touchend", onFinGesto, { passive: true });
  slider.addEventListener("touchcancel", onFinGesto, { passive: true });

  // ── Eventos Mouse (drag en desktop) ──

  slider.addEventListener("mousedown", (e) => {
    // Solo botón principal del ratón
    if (e.button !== 0) return;
    onInicioGesto(e.clientX, e.clientY, true);
    // Evita la selección de texto al hacer drag
    e.preventDefault();
  });

  // mousemove y mouseup en document para capturar el gesto
  // aunque el cursor salga del slider durante el drag
  document.addEventListener("mousemove", (e) => {
    if (!gestureState.activo || !gestureState.esMouse) return;
    onMovimientoGesto(e.clientX, e.clientY);
  });

  document.addEventListener("mouseup", (e) => {
    if (!gestureState.activo || !gestureState.esMouse) return;
    onFinGesto();
  });
}

/* ==========================================================
   FUNCIÓN PRINCIPAL DE INICIALIZACIÓN
   Construye el contexto y orquesta todos los submódulos.
   ========================================================== */

/**
 * Inicializa el módulo completo del slider.
 *
 * Flujo de ejecución:
 *   1. Obtiene y valida elementos del DOM
 *   2. Construye el objeto de contexto (ctx) con estado y refs
 *   3. Renderiza el estado inicial
 *   4. Inicializa cada submódulo
 *   5. Inicia el autoplay
 *
 * @returns {void}
 */
export function initSlider() {
  // ── Obtener elementos del DOM ──
  const slider = document.querySelector('[data-js="hero-slider"]');
  const track = document.querySelector('[data-js="slide-track"]');
  const btnPrev = document.querySelector('[data-js="slider-prev"]');
  const btnNext = document.querySelector('[data-js="slider-next"]');
  const slides = document.querySelectorAll("[data-slide-index]");
  const indicators = document.querySelectorAll('[data-js="slider-indicator"]');

  // ── Validación: elementos críticos ──
  if (!slider || !track || slides.length === 0) {
    console.warn(
      "[Slider] Elementos del slider no encontrados. " +
        'Verifica data-js="hero-slider", data-js="slide-track" ' +
        "y data-slide-index en los slides.",
    );
    return;
  }

  // Si solo hay un slide, no tiene sentido inicializar el slider
  if (slides.length === 1) {
    console.info("[Slider] Solo un slide detectado — slider desactivado.");
    // Oculta los controles si solo hay un slide
    btnPrev?.setAttribute("hidden", "");
    btnNext?.setAttribute("hidden", "");
    indicators.forEach((i) => i.parentElement?.setAttribute("hidden", ""));
    return;
  }

  // ── Construir el contexto del slider ──
  // Objeto único que concentra estado + referencias al DOM.
  // Se pasa por referencia a todos los submódulos.
  const ctx = {
    // Referencias al DOM
    slider,
    track,
    btnPrev,
    btnNext,
    slides: Array.from(slides),
    indicators: Array.from(indicators),

    // Estado mutable del slider
    estado: {
      indiceActual: 0, // slide actualmente visibgitle
      esPorUsuario: false, // si el último cambio fue del usuario
      intervaloId: null, // referencia al setInterval del autoplay
      pausas: new Set(), // conjunto de motivos de pausa activos
    },
  };

  // ── Configurar accesibilidad inicial del slider ──
  slider.setAttribute("role", "region");
  slider.setAttribute(
    "aria-label",
    `Slider de imágenes, 1 de ${slides.length}`,
  );
  slider.setAttribute("tabindex", "0"); // hacemos el slider enfocable

  // ── Renderizar el estado inicial (slide 0) ──
  renderizarSlide(ctx);

  // ── Inicializar submódulos ──
  initBotonesNavegacion(ctx);
  initIndicators(ctx);
  initNavegacionTeclado(ctx);
  initPausaHover(ctx);
  initPausaFoco(ctx);
  initPausaVisibilidad(ctx);
  initSwipe(ctx);

  // ── Iniciar autoplay ──
  iniciarAutoplay(ctx);

  console.info(`[Slider] Módulo inicializado — ${slides.length} slides.`);
}
