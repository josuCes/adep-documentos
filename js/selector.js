/* ==========================================================
   selector.js · Selectores propios: fecha, hora y lista (sin librerías)
   ----------------------------------------------------------
   Cada selector es un <div class="selector" data-tipo="..."> con:
     - un <input type="hidden"> que guarda el valor real
         fecha → "AAAA-MM-DD"      hora → "HH:MM" (24 horas)
         lista → el texto de la opción elegida
     - un botón que muestra el valor y abre el panel
   Al elegir algo se actualiza el campo oculto y se avisa al
   formulario con un evento "input", igual que si se escribiera.
   ========================================================== */

(function () {
  "use strict";

  var MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio",
               "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  var DIAS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

  function dos(n) { return (n < 10 ? "0" : "") + n; }

  /* ---------- Utilidades de formato ---------- */

  function textoFecha(valor) {          // "2026-10-21" → "21/10/2026"
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
    return m ? m[3] + "/" + m[2] + "/" + m[1] : "";
  }

  function textoHora(valor) {           // "16:00" → "4:00 pm"
    var m = /^(\d{1,2}):(\d{2})$/.exec(valor);
    if (!m) { return ""; }
    var h = parseInt(m[1], 10);
    var suf = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    return h + ":" + m[2] + " " + suf;
  }

  function crear(etiqueta, clase, texto) {
    var e = document.createElement(etiqueta);
    if (clase) { e.className = clase; }
    if (texto !== undefined) { e.textContent = texto; }
    return e;
  }

  /* ---------- Un solo panel abierto a la vez ---------- */

  var abierto = null;                   // { cerrar: function }

  function cerrarAbierto() {
    if (abierto) { abierto.cerrar(); abierto = null; }
  }

  /* ---------- Inicializar cada selector ---------- */

  function iniciar(contenedor) {
    var tipo = contenedor.getAttribute("data-tipo");
    var oculto = contenedor.querySelector('input[type="hidden"]');
    var boton = contenedor.querySelector(".selector__boton");
    var panel = null;

    function valor() { return oculto.value; }

    function pintarBoton() {
      var t = tipo === "fecha" ? textoFecha(valor())
            : tipo === "hora"  ? textoHora(valor())
            : valor();                                  // lista: se muestra la opción elegida
      boton.textContent = t || boton.getAttribute("data-vacio");
      boton.classList.toggle("selector__boton--vacio", !t);
    }

    function guardar(nuevo) {
      oculto.value = nuevo;
      pintarBoton();
      // Avisa al formulario (boleta.js escucha "input" en el formulario)
      oculto.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function cerrar() {
      if (panel) { panel.remove(); panel = null; }
      boton.setAttribute("aria-expanded", "false");
    }

    function abrir() {
      cerrarAbierto();
      panel = crear("div", "selector__panel");
      panel.setAttribute("role", tipo === "lista" ? "listbox" : "dialog");
      panel.setAttribute("aria-label", tipo === "fecha" ? "Elegir fecha"
                                     : tipo === "hora"  ? "Elegir hora" : "Elegir una opción");
      contenedor.appendChild(panel);
      boton.setAttribute("aria-expanded", "true");
      abierto = { cerrar: cerrar };
      if (tipo === "fecha") { dibujarCalendario(); }
      else if (tipo === "hora") { dibujarHora(); }
      else { dibujarLista(); }
    }

    /* ----- Lista desplegable (opciones en data-opciones, separadas con "|") ----- */

    function dibujarLista() {
      panel.classList.add("selector__panel--lista");
      panel.innerHTML = "";
      var opciones = (contenedor.getAttribute("data-opciones") || "")
        .split("|")
        .filter(function (o) { return o.trim() !== ""; })
        .sort(function (a, b) { return a.localeCompare(b, "es"); });   // orden alfabético

      opciones.forEach(function (texto) {
        var b = crear("button", "lista__op", texto);
        b.type = "button";
        b.setAttribute("role", "option");
        if (texto === valor()) {
          b.classList.add("lista__op--elegido");
          b.setAttribute("aria-selected", "true");
        }
        b.addEventListener("click", function () {
          guardar(texto); cerrar(); abierto = null; boton.focus();
        });
        panel.appendChild(b);
      });
    }

    /* ----- Calendario ----- */

    var vistaAnio, vistaMes;            // mes que se está mostrando (mes 0-11)

    function dibujarCalendario() {
      var actual = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor());
      if (vistaAnio === undefined) {
        var base = actual ? new Date(+actual[1], +actual[2] - 1, 1) : new Date();
        vistaAnio = base.getFullYear();
        vistaMes = base.getMonth();
      }
      panel.innerHTML = "";

      // Cabecera: ‹  Mes Año  ›
      var cab = crear("div", "cal__cab");
      var ant = crear("button", "cal__nav", "‹");
      ant.type = "button"; ant.setAttribute("aria-label", "Mes anterior");
      var sig = crear("button", "cal__nav", "›");
      sig.type = "button"; sig.setAttribute("aria-label", "Mes siguiente");
      var tit = crear("div", "cal__titulo", MESES[vistaMes] + " " + vistaAnio);
      ant.addEventListener("click", function () { moverMes(-1); });
      sig.addEventListener("click", function () { moverMes(1); });
      cab.appendChild(ant); cab.appendChild(tit); cab.appendChild(sig);
      panel.appendChild(cab);

      // Días de la semana (la semana empieza en lunes)
      var rejilla = crear("div", "cal__rejilla");
      DIAS.forEach(function (d) { rejilla.appendChild(crear("div", "cal__dia-semana", d)); });

      var primero = new Date(vistaAnio, vistaMes, 1);
      var hueco = (primero.getDay() + 6) % 7;            // lunes = 0
      var total = new Date(vistaAnio, vistaMes + 1, 0).getDate();
      var hoy = new Date();
      var hoyTexto = hoy.getFullYear() + "-" + dos(hoy.getMonth() + 1) + "-" + dos(hoy.getDate());

      for (var i = 0; i < hueco; i++) { rejilla.appendChild(crear("div", "cal__vacio")); }
      for (var d = 1; d <= total; d++) {
        var texto = vistaAnio + "-" + dos(vistaMes + 1) + "-" + dos(d);
        var b = crear("button", "cal__dia", String(d));
        b.type = "button";
        if (texto === valor()) { b.classList.add("cal__dia--elegido"); }
        if (texto === hoyTexto) { b.classList.add("cal__dia--hoy"); }
        b.setAttribute("data-fecha", texto);
        b.addEventListener("click", function (e) {
          guardar(e.currentTarget.getAttribute("data-fecha"));
          cerrar(); abierto = null; boton.focus();
        });
        rejilla.appendChild(b);
      }
      panel.appendChild(rejilla);

      // Pie: Hoy · Borrar
      var pie = crear("div", "selector__pie");
      var bHoy = crear("button", "selector__accion", "Hoy");
      bHoy.type = "button";
      bHoy.addEventListener("click", function () {
        guardar(hoyTexto); cerrar(); abierto = null; boton.focus();
      });
      var bBorrar = crear("button", "selector__accion selector__accion--suave", "Borrar");
      bBorrar.type = "button";
      bBorrar.addEventListener("click", function () {
        guardar(""); cerrar(); abierto = null; boton.focus();
      });
      pie.appendChild(bHoy); pie.appendChild(bBorrar);
      panel.appendChild(pie);
    }

    function moverMes(delta) {
      vistaMes += delta;
      if (vistaMes < 0) { vistaMes = 11; vistaAnio--; }
      if (vistaMes > 11) { vistaMes = 0; vistaAnio++; }
      dibujarCalendario();
    }

    /* ----- Hora: horas 1-12 · minutos 00-59 · am/pm ----- */

    var sel;                             // { h: 1-12, m: 0-59, pm: bool }

    function dibujarHora() {
      var m = /^(\d{1,2}):(\d{2})$/.exec(valor());
      if (!sel) {
        sel = m ? { h: (+m[1] % 12) || 12, m: +m[2], pm: +m[1] >= 12 }
                : { h: 12, m: 0, pm: false, sinElegir: true };
      }
      panel.innerHTML = "";

      var cols = crear("div", "hora__cols");
      cols.appendChild(columna("Hora", 1, 12, sel.h, function (v) { sel.h = v; sel.sinElegir = false; aplicar(); }, false));
      cols.appendChild(columna("Min", 0, 59, sel.m, function (v) { sel.m = v; sel.sinElegir = false; aplicar(); }, true));

      var ampm = crear("div", "hora__ampm");
      ["am", "pm"].forEach(function (s) {
        var b = crear("button", "hora__op", s);
        b.type = "button";
        if ((s === "pm") === sel.pm) { b.classList.add("hora__op--elegido"); }
        b.addEventListener("click", function () { sel.pm = (s === "pm"); sel.sinElegir = false; aplicar(); });
        ampm.appendChild(b);
      });
      cols.appendChild(ampm);
      panel.appendChild(cols);

      var pie = crear("div", "selector__pie");
      var bListo = crear("button", "selector__accion", "Listo");
      bListo.type = "button";
      bListo.addEventListener("click", function () { cerrar(); abierto = null; boton.focus(); });
      var bBorrar = crear("button", "selector__accion selector__accion--suave", "Borrar");
      bBorrar.type = "button";
      bBorrar.addEventListener("click", function () {
        sel = undefined; guardar(""); cerrar(); abierto = null; boton.focus();
      });
      pie.appendChild(bListo); pie.appendChild(bBorrar);
      panel.appendChild(pie);

      // Llevar la hora y el minuto elegidos a la vista dentro de cada lista
      panel.querySelectorAll(".hora__op--elegido").forEach(function (e) {
        if (e.parentElement.classList.contains("hora__lista")) {
          e.parentElement.scrollTop = e.offsetTop - e.parentElement.clientHeight / 2 + e.offsetHeight / 2;
        }
      });
    }

    function columna(titulo, desde, hasta, elegido, alElegir, conCeros) {
      var caja = crear("div", "hora__col");
      caja.appendChild(crear("div", "hora__titulo", titulo));
      var lista = crear("div", "hora__lista");
      for (var n = desde; n <= hasta; n++) {
        (function (n) {
          var b = crear("button", "hora__op", conCeros ? dos(n) : String(n));
          b.type = "button";
          if (n === elegido && !sel.sinElegir) { b.classList.add("hora__op--elegido"); }
          b.addEventListener("click", function () { alElegir(n); });
          lista.appendChild(b);
        })(n);
      }
      caja.appendChild(lista);
      return caja;
    }

    // Convierte lo elegido a "HH:MM" (24 h), lo guarda y redibuja el panel
    function aplicar() {
      var h24 = sel.h % 12 + (sel.pm ? 12 : 0);
      guardar(dos(h24) + ":" + dos(sel.m));
      var tops = Array.prototype.map.call(panel.querySelectorAll(".hora__lista"), function (l) { return l.scrollTop; });
      dibujarHora();
      panel.querySelectorAll(".hora__lista").forEach(function (l, i) { l.scrollTop = tops[i]; });
    }

    /* ----- Eventos del botón ----- */

    boton.addEventListener("click", function () {
      if (panel) { cerrar(); abierto = null; } else {
        vistaAnio = undefined; sel = undefined;   // vuelve a partir del valor actual
        abrir();
      }
    });

    if (tipo === "lista") { boton.classList.add("selector__boton--lista"); }   // muestra la flechita ▾
    pintarBoton();
  }

  document.querySelectorAll(".selector").forEach(iniciar);

  // Cerrar al hacer clic fuera o al pulsar Escape
  // OJO: al elegir un valor el panel se redibuja y el botón pulsado deja de
  // estar en la página. Por eso se usa composedPath() (la ruta del clic tal
  // como era al pulsar) en vez de e.target.closest(), que fallaría.
  document.addEventListener("click", function (e) {
    if (!abierto) { return; }
    var ruta = e.composedPath ? e.composedPath() : [];
    var dentro = ruta.some(function (n) {
      return n.classList && n.classList.contains("selector");
    });
    if (!dentro) { cerrarAbierto(); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && abierto) { cerrarAbierto(); }
  });
})();
