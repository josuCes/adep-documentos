/* ==========================================================
   boleta.js · Pasa lo que se escribe en el formulario a la boleta
   (vista previa en vivo) y escala la hoja para que quepa en pantalla.
   ========================================================== */

(function () {
  "use strict";

  /* ---------- Formatos de lo que se muestra en la boleta ---------- */

  function formatoTexto(valor) {
    return valor.trim();
  }

  // El selector de fecha entrega "2026-10-21"; la boleta muestra "21/10/26"
  function formatoFecha(valor) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
    return m ? m[3] + "/" + m[2] + "/" + m[1].slice(2) : "";
  }

  // El selector de hora entrega "16:00"; la boleta muestra "4:00 pm"
  function formatoHora(valor) {
    var m = /^(\d{1,2}):(\d{2})/.exec(valor);
    if (!m) { return ""; }
    var horas = parseInt(m[1], 10);
    var sufijo = horas >= 12 ? "pm" : "am";
    horas = horas % 12;
    if (horas === 0) { horas = 12; }
    return horas + ":" + m[2] + " " + sufijo;
  }

  /* ---------- Qué campo del formulario va a qué línea de la boleta ---------- */

  var CAMPOS = [
    { entrada: "in-funcionario",   salida: "b-funcionario",   aviso: "aviso-funcionario",   formato: formatoTexto },
    { entrada: "in-area",          salida: "b-area",          aviso: null,                  formato: formatoTexto },
    { entrada: "in-trabajo",       salida: "b-trabajo",       aviso: "aviso-trabajo",       formato: formatoTexto },
    { entrada: "in-justificacion", salida: "b-justificacion", aviso: "aviso-justificacion", formato: formatoTexto },
    { entrada: "in-fecha",         salida: "b-fecha",         aviso: null,                  formato: formatoFecha },
    { entrada: "in-inicio",        salida: "b-inicio",        aviso: null,                  formato: formatoHora },
    { entrada: "in-fin",           salida: "b-fin",           aviso: null,                  formato: formatoHora }
  ];

  /* ---------- Ajuste del texto a la línea ----------
     Si el texto es más largo que la línea, se reduce un poco la letra
     (hasta el 75 %). Si aun así no cabe, se avisa para que lo acorten. */

  function ajustarALinea(texto) {
    var linea = texto.parentElement;
    var estilo = window.getComputedStyle(linea);
    var relleno = parseFloat(estilo.paddingLeft) + parseFloat(estilo.paddingRight);
    var disponible = linea.clientWidth - relleno;

    texto.style.fontSize = "";                       // vuelve al tamaño normal
    var base = parseFloat(window.getComputedStyle(texto).fontSize);
    var tamano = base;

    while (texto.offsetWidth > disponible && tamano > base * 0.75) {
      tamano -= 0.25;
      texto.style.fontSize = tamano + "px";
    }
    return texto.offsetWidth <= disponible;
  }

  /* ---------- Actualizar la boleta ---------- */

  function actualizar() {
    CAMPOS.forEach(function (c) {
      var entrada = document.getElementById(c.entrada);
      var salida = document.getElementById(c.salida);
      if (!entrada || !salida) { return; }

      salida.textContent = c.formato(entrada.value);
      var cabe = ajustarALinea(salida);

      if (c.aviso) {
        var aviso = document.getElementById(c.aviso);
        if (aviso) { aviso.hidden = cabe; }
        entrada.classList.toggle("entrada--excede", !cabe);
      }
    });
  }

  /* ---------- Escalar la hoja para que quepa en la pantalla ----------
     La hoja siempre mide 215,9 mm de ancho; en pantalla se reduce con
     "transform: scale" solo para verla. Al imprimir se usa el tamaño real. */

  function escalar() {
    var contenedor = document.getElementById("boleta-escala");
    var hoja = document.getElementById("boleta");
    if (!contenedor || !hoja) { return; }

    var disponible = contenedor.clientWidth;
    if (disponible === 0) { return; }                // pantalla oculta: no hay nada que escalar

    var escala = Math.min(1, disponible / hoja.offsetWidth);
    hoja.style.transform = "scale(" + escala + ")";
    contenedor.style.height = (hoja.offsetHeight * escala) + "px";
  }

  /* ---------- Conexión de eventos ---------- */

  var formulario = document.getElementById("formulario-boleta");
  if (formulario) {
    formulario.addEventListener("input", actualizar);
    formulario.addEventListener("submit", function (e) { e.preventDefault(); });
  }

  window.addEventListener("resize", escalar);

  // Cuando la pantalla del editor pasa de oculta a visible, su tamaño cambia:
  // aprovechamos para escalar la hoja y reajustar los textos.
  var contenedor = document.getElementById("boleta-escala");
  if (contenedor && "ResizeObserver" in window) {
    new ResizeObserver(function () { escalar(); actualizar(); }).observe(contenedor);
  }

  // Esperar a que cargue la fuente antes de medir los textos
  var listaFuentes = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  listaFuentes.then(function () { escalar(); actualizar(); });

})();
