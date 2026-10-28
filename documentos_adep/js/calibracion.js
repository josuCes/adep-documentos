/* ==========================================================
   calibracion.js · HERRAMIENTA DE AJUSTE (solo para desarrollo)
   Se activa abriendo la página con "?calibrar" al final:
       index.html?calibrar
   Pone la foto de la boleta física, semitransparente, encima de
   la boleta digital para comparar posiciones y tamaños.
   Sin "?calibrar" este archivo no hace nada.
   ========================================================== */

(function () {
  "use strict";

  if (!/[?&]calibrar(&|=|$)/.test(window.location.search)) { return; }

  var hoja = document.getElementById("boleta");
  var vista = document.querySelector(".editor__vista");
  var escala = document.getElementById("boleta-escala");
  if (!hoja || !vista || !escala) { return; }

  // Foto encima de la hoja
  var foto = document.createElement("img");
  foto.className = "b-foto-ref";
  foto.src = "assets/referencia/boleta-foto.jpg";
  foto.alt = "";
  hoja.appendChild(foto);

  // Panel con casilla y control de transparencia
  var panel = document.createElement("div");
  panel.className = "calibracion";
  panel.innerHTML =
    '<label><input type="checkbox" id="cal-mostrar" checked> Mostrar foto de referencia</label>' +
    '<label>Transparencia <input type="range" id="cal-opacidad" min="10" max="90" value="50"></label>';
  vista.insertBefore(panel, escala);

  document.getElementById("cal-mostrar").addEventListener("change", function (e) {
    foto.style.display = e.target.checked ? "" : "none";
  });
  document.getElementById("cal-opacidad").addEventListener("input", function (e) {
    foto.style.opacity = e.target.value / 100;
  });
})();
