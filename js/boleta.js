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
    texto.style.maxWidth = "";
    texto.style.overflow = "";
    var base = parseFloat(window.getComputedStyle(texto).fontSize);
    var tamano = base;

    while (texto.offsetWidth > disponible && tamano > 5) {
      tamano -= 0.25;
      texto.style.fontSize = tamano + "px";
    }
    if (texto.offsetWidth > disponible) {
      texto.style.maxWidth = Math.max(0, disponible) + "px";
      texto.style.overflow = "hidden";
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
  var hoja = document.getElementById("boleta");
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

  var dialogoVista = document.getElementById("dialogo-vista-previa");
  var areaVista = document.getElementById("area-vista-previa");
  var escalaVista = document.getElementById("escala-vista-previa");
  var nivelVista = document.getElementById("nivel-vista-previa");
  var botonAlejar = document.getElementById("alejar-vista-previa");
  var botonAcercar = document.getElementById("acercar-vista-previa");
  var botonAjustar = document.getElementById("ajustar-vista-previa");
  var copiaVista = null;
  var factorZoom = 1;
  var escalaAjuste = 1;
  var escalaActual = 1;
  var margenIzquierdo = 0;
  var margenSuperior = 0;
  var punteros = {};
  var gestoZoom = null;
  var arrastre = null;

  function ajustarVistaAmpliada() {
    if (!copiaVista || !dialogoVista.open) { return; }
    var ancho = copiaVista.offsetWidth;
    var alto = copiaVista.offsetHeight;
    var disponibleAncho = areaVista.clientWidth;
    var disponibleAlto = areaVista.clientHeight;
    if (!ancho || !alto || !disponibleAncho || !disponibleAlto) { return; }

    escalaAjuste = Math.min(1, disponibleAncho / ancho, disponibleAlto / alto);
    factorZoom = Math.min(factorZoom, limiteZoom());
    mostrarEscalaVista();
  }

  function limiteZoom() {
    return Math.min(4, Math.max(1, 2 / escalaAjuste));
  }

  function mostrarEscalaVista(ancla) {
    var escalaAnterior = escalaActual;
    var margenAnteriorIzquierdo = margenIzquierdo;
    var margenAnteriorSuperior = margenSuperior;
    escalaActual = escalaAjuste * factorZoom;
    var ancho = copiaVista.offsetWidth * escalaActual;
    var alto = copiaVista.offsetHeight * escalaActual;
    margenIzquierdo = Math.max(0, (areaVista.clientWidth - ancho) / 2);
    margenSuperior = Math.max(0, (areaVista.clientHeight - alto) / 2);

    copiaVista.style.transform = "scale(" + escalaActual + ")";
    escalaVista.style.width = ancho + "px";
    escalaVista.style.height = alto + "px";
    escalaVista.style.marginLeft = margenIzquierdo + "px";
    escalaVista.style.marginTop = margenSuperior + "px";
    nivelVista.textContent = Math.round(factorZoom * 100) + "%";
    botonAlejar.disabled = factorZoom <= 1;
    botonAcercar.disabled = factorZoom >= limiteZoom();

    if (ancla && escalaAnterior) {
      var contenidoX = (areaVista.scrollLeft + ancla.x - margenAnteriorIzquierdo) / escalaAnterior;
      var contenidoY = (areaVista.scrollTop + ancla.y - margenAnteriorSuperior) / escalaAnterior;
      areaVista.scrollLeft = Math.max(0, contenidoX * escalaActual + margenIzquierdo - ancla.x);
      areaVista.scrollTop = Math.max(0, contenidoY * escalaActual + margenSuperior - ancla.y);
    }
  }

  function cambiarZoom(factor, ancla) {
    factorZoom = Math.max(1, Math.min(limiteZoom(), factor));
    mostrarEscalaVista(ancla);
  }

  function anclaCentro() {
    return { x: areaVista.clientWidth / 2, y: areaVista.clientHeight / 2 };
  }

  function abrirVistaAmpliada() {
    copiaVista = hoja.cloneNode(true);
    copiaVista.removeAttribute("id");
    copiaVista.removeAttribute("role");
    copiaVista.removeAttribute("tabindex");
    copiaVista.removeAttribute("aria-label");
    copiaVista.querySelectorAll("[id]").forEach(function (elemento) { elemento.removeAttribute("id"); });
    copiaVista.style.transform = "none";
    escalaVista.replaceChildren(copiaVista);
    factorZoom = 1;
    escalaActual = 0;
    dialogoVista.showModal();
    requestAnimationFrame(ajustarVistaAmpliada);
  }

  botonAlejar.addEventListener("click", function () { cambiarZoom(factorZoom / 1.25, anclaCentro()); });
  botonAcercar.addEventListener("click", function () { cambiarZoom(factorZoom * 1.25, anclaCentro()); });
  botonAjustar.addEventListener("click", function () {
    cambiarZoom(1);
    areaVista.scrollLeft = 0;
    areaVista.scrollTop = 0;
  });

  areaVista.addEventListener("pointerdown", function (evento) {
    evento.preventDefault();
    areaVista.setPointerCapture(evento.pointerId);
    punteros[evento.pointerId] = { x: evento.clientX, y: evento.clientY };
    var ids = Object.keys(punteros);

    if (ids.length === 2) {
      var primero = punteros[ids[0]];
      var segundo = punteros[ids[1]];
      gestoZoom = {
        distancia: Math.hypot(segundo.x - primero.x, segundo.y - primero.y),
        factor: factorZoom
      };
      arrastre = null;
    } else if (factorZoom > 1) {
      arrastre = {
        id: evento.pointerId,
        x: evento.clientX,
        y: evento.clientY,
        izquierda: areaVista.scrollLeft,
        arriba: areaVista.scrollTop
      };
    }
  });

  areaVista.addEventListener("pointermove", function (evento) {
    if (!Object.prototype.hasOwnProperty.call(punteros, evento.pointerId)) { return; }
    punteros[evento.pointerId] = { x: evento.clientX, y: evento.clientY };
    var ids = Object.keys(punteros);

    if (ids.length >= 2 && gestoZoom) {
      var primero = punteros[ids[0]];
      var segundo = punteros[ids[1]];
      var distancia = Math.hypot(segundo.x - primero.x, segundo.y - primero.y);
      var rectangulo = areaVista.getBoundingClientRect();
      cambiarZoom(gestoZoom.factor * distancia / Math.max(1, gestoZoom.distancia), {
        x: (primero.x + segundo.x) / 2 - rectangulo.left,
        y: (primero.y + segundo.y) / 2 - rectangulo.top
      });
      evento.preventDefault();
    } else if (arrastre && arrastre.id === evento.pointerId) {
      areaVista.scrollLeft = arrastre.izquierda - (evento.clientX - arrastre.x);
      areaVista.scrollTop = arrastre.arriba - (evento.clientY - arrastre.y);
      evento.preventDefault();
    }
  });

  function terminarPuntero(evento) {
    delete punteros[evento.pointerId];
    gestoZoom = null;
    arrastre = null;
    var ids = Object.keys(punteros);
    if (ids.length === 1 && factorZoom > 1) {
      var restante = punteros[ids[0]];
      arrastre = {
        id: Number(ids[0]),
        x: restante.x,
        y: restante.y,
        izquierda: areaVista.scrollLeft,
        arriba: areaVista.scrollTop
      };
    }
  }

  areaVista.addEventListener("pointerup", terminarPuntero);
  areaVista.addEventListener("pointercancel", terminarPuntero);

  hoja.addEventListener("click", abrirVistaAmpliada);
  hoja.addEventListener("keydown", function (evento) {
    if (evento.key === "Enter" || evento.key === " ") {
      evento.preventDefault();
      abrirVistaAmpliada();
    }
  });
  document.getElementById("cerrar-vista-previa").addEventListener("click", function () {
    dialogoVista.close();
  });
  dialogoVista.addEventListener("click", function (evento) {
    if (evento.target === dialogoVista) { dialogoVista.close(); }
  });
  dialogoVista.addEventListener("close", function () {
    escalaVista.replaceChildren();
    copiaVista = null;
    punteros = {};
    gestoZoom = null;
    arrastre = null;
  });
  window.addEventListener("resize", ajustarVistaAmpliada);

})();
