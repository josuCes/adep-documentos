/* ==========================================================
   pdf.js · Imprimir y guardar como PDF
   Usa la impresión del propio navegador: no necesita librerías.
   Las reglas @media print de boleta.css dejan solo la hoja carta.
   ========================================================== */

(function () {
  "use strict";

  var tituloOriginal = document.title;

  // Chrome y Edge usan el título de la página como nombre sugerido del PDF
  function nombreSugerido() {
    var funcionario = document.getElementById("in-funcionario").value.trim();
    var fecha = document.getElementById("b-fecha").textContent.replace(/\//g, "-");
    var nombre = "Boleta horas extras";
    if (funcionario) { nombre += " - " + funcionario; }
    if (fecha) { nombre += " - " + fecha; }
    return nombre;
  }

  function imprimir(conNombreDeArchivo) {
    if (conNombreDeArchivo) { document.title = nombreSugerido(); }
    window.print();
  }

  // Al cerrar el diálogo de impresión se restaura el título normal
  window.addEventListener("afterprint", function () {
    document.title = tituloOriginal;
  });

  var botonDescargar = document.getElementById("btn-descargar");
  var botonImprimir = document.getElementById("btn-imprimir");

  if (botonDescargar) {
    botonDescargar.addEventListener("click", function () { imprimir(true); });
  }
  if (botonImprimir) {
    botonImprimir.addEventListener("click", function () { imprimir(false); });
  }
})();
