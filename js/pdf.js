/* ==========================================================
  pdf.js · Descargar la boleta directamente como PDF
  ========================================================== */

(function () {
  "use strict";

  function nombreSugerido() {
    var funcionario = document.getElementById("in-funcionario").value.trim();
    var fecha = document.getElementById("b-fecha").textContent.replace(/\//g, "-");
    var nombre = "Boleta horas extras";
    if (funcionario) { nombre += " - " + funcionario; }
    if (fecha) { nombre += " - " + fecha; }
    return nombre.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim() + ".pdf";
  }

  async function descargar() {
    var boton = document.getElementById("btn-descargar");
    var hoja = document.getElementById("boleta");
    if (!window.html2canvas || !window.jspdf || !window.jspdf.jsPDF) {
      window.alert("No se pudo cargar el módulo PDF. Compruebe la conexión a internet e inténtelo de nuevo.");
      return;
    }

    boton.disabled = true;
    var copia = hoja.cloneNode(true);
    copia.removeAttribute("id");
    copia.style.transform = "none";
    copia.style.boxShadow = "none";
    copia.style.position = "fixed";
    copia.style.left = "-10000px";
    copia.style.top = "0";
    copia.querySelectorAll(".b-foto-ref").forEach(function (foto) { foto.remove(); });
    document.body.appendChild(copia);

    try {
      if (document.fonts && document.fonts.ready) { await document.fonts.ready; }
      var canvas = await window.html2canvas(copia, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        width: copia.offsetWidth,
        height: copia.offsetHeight
      });
      var pdf = new window.jspdf.jsPDF({ orientation: "portrait", unit: "mm", format: "letter", compress: true });
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 215.9, 139.7, undefined, "FAST");
      pdf.save(nombreSugerido());
      await window.dialogosApp.aviso("PDF descargado", "La boleta se descargó en este dispositivo.");
    } catch (error) {
      console.error("No se pudo generar el PDF:", error);
      await window.dialogosApp.aviso("No se pudo descargar", "Inténtalo de nuevo. Si el problema continúa, usa el botón Imprimir.");
    } finally {
      copia.remove();
      boton.disabled = false;
    }
  }

  var botonDescargar = document.getElementById("btn-descargar");
  var botonImprimir = document.getElementById("btn-imprimir");

  if (botonDescargar) {
    botonDescargar.addEventListener("click", descargar);
  }
  if (botonImprimir) {
    botonImprimir.addEventListener("click", function () { window.print(); });
  }
})();
