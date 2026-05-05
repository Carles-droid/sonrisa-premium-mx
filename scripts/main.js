/**
 * ============================================================
 * SONRISA PREMIUM MX — main.js
 * Entry point — orquesta e inicializa todos los módulos
 *
 * Orden de inicialización:
 *   1. Navbar
 *   2. Slider
 *   3. Animaciones de entrada (IntersectionObserver)
 *   4. Año dinámico en el footer
 *
 * Autor: Insomne × Sonrisa Premium MX
 * ============================================================
 */

"use strict";

import { initNavbar } from "./modules/navbar.js";
import { initSlider } from "./modules/slider.js";

/* ==========================================================
   ANIMACIONES DE ENTRADA
   IntersectionObserver que añade/remueve .animar-entrada--oculto
   Asigna data-delay escalonado a hijos de grids.
   ========================================================== */

/**
 * Inicializa las animaciones de scroll para elementos
 * con la clase .animar-entrada definida en home.css.
 */
function initAnimacionesEntrada() {
  // Selecciona todos los elementos animables del Home
  const elementos = document.querySelectorAll(".animar-entrada");
  if (elementos.length === 0) return;

  // Estado inicial: todos ocultos
  elementos.forEach((el) => el.classList.add("animar-entrada--oculto"));

  // Asigna delay escalonado a hijos directos de grids
  document
    .querySelectorAll(
      ".servicios-destacados__grid, .dentistas-preview__grid, .nosotros__metrics",
    )
    .forEach((grid) => {
      Array.from(grid.children).forEach((hijo, i) => {
        hijo.dataset.delay = i;
      });
    });

  // Observer: revela el elemento cuando entra al viewport
  const observer = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;

        entrada.target.classList.remove("animar-entrada--oculto");

        // Deja de observar una vez revelado (animación de entrada = una sola vez)
        observer.unobserve(entrada.target);
      });
    },
    {
      // Dispara cuando el 12% del elemento es visible
      threshold: 0.12,
      // Empieza a observar 40px antes de que entre al viewport
      rootMargin: "0px 0px -40px 0px",
    },
  );

  elementos.forEach((el) => observer.observe(el));
}

/* ==========================================================
   AÑO DINÁMICO EN EL FOOTER
   Actualiza el span#currentYear con el año actual.
   ========================================================== */

function initAnioFooter() {
  const spanAnio = document.getElementById("currentYear");
  if (spanAnio) {
    spanAnio.textContent = new Date().getFullYear();
  }
}

/* ==========================================================
   INICIALIZACIÓN PRINCIPAL
   DOMContentLoaded garantiza que el HTML esté parseado
   antes de cualquier consulta al DOM.
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initSlider();
  initAnimacionesEntrada();
  initAnioFooter();

  console.info("[Main] Sonrisa Premium MX — inicializado.");
});
