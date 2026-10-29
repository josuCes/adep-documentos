/* ==========================================================
   app.js · Navegación entre pantallas
   Cada botón con data-ir="id-de-pantalla" lleva a esa pantalla.
   ========================================================== */

(function () {
  "use strict";

  var CLASE_ACTIVA = "pantalla--activa";

  // Muestra la pantalla con el id indicado y oculta las demás
  function mostrarPantalla(id) {
    var destino = document.getElementById(id);
    if (!destino) {
      console.error("No existe la pantalla: " + id);
      return;
    }
    document.querySelectorAll(".pantalla").forEach(function (p) {
      p.classList.remove(CLASE_ACTIVA);
    });
    destino.classList.add(CLASE_ACTIVA);
    window.scrollTo(0, 0);
  }

  // Un solo "oyente" para todos los botones de navegación
  document.addEventListener("click", function (evento) {
    var boton = evento.target.closest("[data-ir]");
    if (boton) {
      mostrarPantalla(boton.getAttribute("data-ir"));
    }
  });
})();
