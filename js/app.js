/* ==========================================================
   app.js · Navegación entre pantallas
   Cada botón con data-ir="id-de-pantalla" lleva a esa pantalla.
   ========================================================== */

(function () {
  "use strict";

  var CLASE_ACTIVA = "pantalla--activa";
  var CLAVE_DOCUMENTOS = "adep-documentos-v1";
  var NOMBRE_BASE = "adep-documentos";
  var documentoActualId = null;
  var documentosActuales = [];
  var baseDatos = null;

  function abrirBaseDatos() {
    if (baseDatos) { return Promise.resolve(baseDatos); }
    return new Promise(function (resolver, rechazar) {
      if (!window.indexedDB) { rechazar(new Error("IndexedDB no está disponible.")); return; }
      var solicitud = window.indexedDB.open(NOMBRE_BASE, 1);
      solicitud.onupgradeneeded = function () {
        solicitud.result.createObjectStore("documentos", { keyPath: "id" });
      };
      solicitud.onsuccess = function () { baseDatos = solicitud.result; resolver(baseDatos); };
      solicitud.onerror = function () { rechazar(solicitud.error); };
    });
  }

  function listarEnBase() {
    return abrirBaseDatos().then(function (db) {
      return new Promise(function (resolver, rechazar) {
        var solicitud = db.transaction("documentos", "readonly").objectStore("documentos").getAll();
        solicitud.onsuccess = function () { resolver(solicitud.result || []); };
        solicitud.onerror = function () { rechazar(solicitud.error); };
      });
    });
  }

  function guardarEnBase(documento) {
    return abrirBaseDatos().then(function (db) {
      return new Promise(function (resolver, rechazar) {
        var transaccion = db.transaction("documentos", "readwrite");
        transaccion.objectStore("documentos").put(documento);
        transaccion.oncomplete = resolver;
        transaccion.onerror = function () { rechazar(transaccion.error); };
        transaccion.onabort = function () { rechazar(transaccion.error); };
      });
    });
  }

  function eliminarDeBase(id) {
    return abrirBaseDatos().then(function (db) {
      return new Promise(function (resolver, rechazar) {
        var transaccion = db.transaction("documentos", "readwrite");
        transaccion.objectStore("documentos").delete(id);
        transaccion.oncomplete = resolver;
        transaccion.onerror = function () { rechazar(transaccion.error); };
      });
    });
  }

  function cargarDocumentos() {
    return listarEnBase().then(function (documentos) {
      var anteriores = [];
      try { anteriores = JSON.parse(localStorage.getItem(CLAVE_DOCUMENTOS) || "[]"); } catch (error) { anteriores = []; }
      if (!documentos.length && Array.isArray(anteriores) && anteriores.length) {
        return Promise.all(anteriores.map(guardarEnBase)).then(function () {
          localStorage.removeItem(CLAVE_DOCUMENTOS);
          return anteriores;
        });
      }
      return documentos;
    }).catch(function () {
      try {
        var anteriores = JSON.parse(localStorage.getItem(CLAVE_DOCUMENTOS) || "[]");
        return Array.isArray(anteriores) ? anteriores : [];
      } catch (error) { return []; }
    }).then(function (documentos) {
      documentosActuales = documentos;
      pintarDocumentos();
    });
  }

  function leerDocumentos() {
    return documentosActuales;
  }

  function textoFecha(valor) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor || "");
    return m ? m[3] + "/" + m[2] + "/" + m[1] : "Sin fecha";
  }

  function crearElemento(etiqueta, clase, texto) {
    var elemento = document.createElement(etiqueta);
    if (clase) { elemento.className = clase; }
    if (texto) { elemento.textContent = texto; }
    return elemento;
  }

  function pintarDocumentos() {
    var lista = document.getElementById("lista-documentos");
    if (!lista) { return; }
    lista.textContent = "";

    var documentos = leerDocumentos().sort(function (a, b) {
      return (b.actualizado || b.creado).localeCompare(a.actualizado || a.creado);
    });

    if (!documentos.length) {
      lista.appendChild(crearElemento("p", "lista-documentos__vacio", "Todavía no hay documentos guardados."));
      return;
    }

    documentos.forEach(function (documento) {
      var articulo = crearElemento("article", "documento-guardado");
      var imagen = crearElemento("img", "documento-guardado__preview");
      imagen.src = documento.miniatura || "assets/adep-logo-boleta.png";
      imagen.alt = documento.miniatura ? "Vista previa de la boleta guardada" : "Logotipo de ADEP";
      articulo.appendChild(imagen);
      var informacion = crearElemento("div", "documento-guardado__info");
      var titulo = documento.datos.funcionario || "Boleta para horas extras";
      var detalle = [documento.datos.area, textoFecha(documento.datos.fecha)].filter(Boolean).join(" · ");
      var fechaGuardado = new Date(documento.actualizado || documento.creado).toLocaleString("es-CR");

      informacion.appendChild(crearElemento("h3", "documento-guardado__titulo", titulo));
      informacion.appendChild(crearElemento("p", "documento-guardado__detalle", detalle));
      if (documento.datos.trabajo) {
        informacion.appendChild(crearElemento("p", "documento-guardado__trabajo", documento.datos.trabajo));
      }
      informacion.appendChild(crearElemento("p", "documento-guardado__fecha", "Guardado: " + fechaGuardado));

      var acciones = crearElemento("div", "documento-guardado__acciones");
      var abrir = crearElemento("button", "boton boton--secundario", "Abrir");
      abrir.type = "button";
      abrir.setAttribute("data-abrir-documento", documento.id);
      var eliminar = crearElemento("button", "boton boton--texto", "Eliminar");
      eliminar.type = "button";
      eliminar.setAttribute("data-eliminar-documento", documento.id);
      acciones.appendChild(abrir);
      acciones.appendChild(eliminar);
      articulo.appendChild(informacion);
      articulo.appendChild(acciones);
      lista.appendChild(articulo);
    });
  }

  function emitirActualizacion() {
    document.getElementById("formulario-boleta").dispatchEvent(new Event("input", { bubbles: true }));
  }

  function restablecerFormulario() {
    documentoActualId = null;
    ["in-funcionario", "in-area", "in-trabajo", "in-justificacion", "in-fecha", "in-inicio", "in-fin"]
      .forEach(function (id) { document.getElementById(id).value = ""; });
    document.querySelectorAll(".selector").forEach(function (selector) {
      var boton = selector.querySelector(".selector__boton");
      boton.textContent = boton.getAttribute("data-vacio");
      boton.classList.add("selector__boton--vacio");
    });
    emitirActualizacion();
  }

  function actualizarBotonSelector(id, texto) {
    var boton = document.getElementById(id).parentElement.querySelector(".selector__boton");
    boton.textContent = texto || boton.getAttribute("data-vacio");
    boton.classList.toggle("selector__boton--vacio", !texto);
  }

  function abrirDocumento(id) {
    var documento = leerDocumentos().find(function (item) { return item.id === id; });
    if (!documento) { return; }
    documentoActualId = documento.id;
    Object.keys(documento.datos).forEach(function (campo) {
      var entrada = document.getElementById("in-" + campo);
      if (entrada) { entrada.value = documento.datos[campo] || ""; }
    });
    actualizarBotonSelector("in-area", documento.datos.area);
    actualizarBotonSelector("in-fecha", textoFecha(documento.datos.fecha) === "Sin fecha" ? "" : textoFecha(documento.datos.fecha));
    var horaInicio = documento.datos.inicio || "";
    var horaFin = documento.datos.fin || "";
    actualizarBotonSelector("in-inicio", formatearHora(horaInicio));
    actualizarBotonSelector("in-fin", formatearHora(horaFin));
    mostrarPantalla("pantalla-editor");
    window.requestAnimationFrame(emitirActualizacion);
  }

  function formatearHora(valor) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(valor || "");
    if (!m) { return ""; }
    var horas = parseInt(m[1], 10);
    var sufijo = horas >= 12 ? "pm" : "am";
    horas = horas % 12 || 12;
    return horas + ":" + m[2] + " " + sufijo;
  }

  function formatoFechaBoleta(valor) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor || "");
    return m ? m[3] + "/" + m[2] + "/" + m[1].slice(2) : "";
  }

  function crearMiniatura(datos) {
    if (!window.html2canvas) { return Promise.resolve(""); }
    var original = document.getElementById("boleta");
    var copia = original.cloneNode(true);
    copia.removeAttribute("id");
    copia.querySelectorAll("[id]").forEach(function (elemento) { elemento.removeAttribute("id"); });
    copia.style.transform = "none";
    copia.style.boxShadow = "none";
    copia.style.position = "fixed";
    copia.style.left = "-10000px";
    copia.style.top = "0";
    copia.querySelectorAll(".b-foto-ref").forEach(function (foto) { foto.remove(); });

    var salidas = [
      [".f1 .b-campo__texto", datos.funcionario],
      [".f2 .b-campo__texto", datos.area],
      [".f3 .b-campo__texto", datos.trabajo],
      [".f4 .b-campo__texto", datos.justificacion],
      [".f5 .b-campo__texto", formatoFechaBoleta(datos.fecha)],
      [".f6 .b-linea--inicio .b-campo__texto", formatearHora(datos.inicio)],
      [".f6 .b-linea--fin .b-campo__texto", formatearHora(datos.fin)]
    ];
    salidas.forEach(function (salida) {
      var elemento = copia.querySelector(salida[0]);
      if (elemento) { elemento.textContent = salida[1] || ""; }
    });
    document.body.appendChild(copia);

    return window.html2canvas(copia, {
      scale: 0.45,
      backgroundColor: "#ffffff",
      logging: false,
      width: copia.offsetWidth,
      height: copia.offsetHeight
    }).then(function (canvas) {
      copia.remove();
      return canvas.toDataURL("image/jpeg", 0.72);
    }).catch(function (error) {
      copia.remove();
      console.error("No se pudo crear la vista previa:", error);
      return "";
    });
  }

  async function guardarDocumento() {
    var botonGuardar = document.getElementById("btn-guardar");
    botonGuardar.disabled = true;
    botonGuardar.textContent = "Guardando...";
    var ahora = new Date().toISOString();
    var datos = {
      funcionario: document.getElementById("in-funcionario").value.trim(),
      area: document.getElementById("in-area").value,
      trabajo: document.getElementById("in-trabajo").value.trim(),
      justificacion: document.getElementById("in-justificacion").value.trim(),
      fecha: document.getElementById("in-fecha").value,
      inicio: document.getElementById("in-inicio").value,
      fin: document.getElementById("in-fin").value
    };
    var documento = documentosActuales.find(function (item) { return item.id === documentoActualId; });

    if (documento) {
      documento.datos = datos;
      documento.actualizado = ahora;
    } else {
      documento = {
        id: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
        tipo: "horas-extras",
        datos: datos,
        creado: ahora,
        actualizado: ahora
      };
    }

    try {
      documento.miniatura = await crearMiniatura(datos) || documento.miniatura || "";
      if (navigator.storage && navigator.storage.persist) {
        try { await navigator.storage.persist(); } catch (error) { /* El navegador puede rechazar la persistencia. */ }
      }
      await guardarEnBase(documento);
      documentosActuales = documentosActuales.filter(function (item) { return item.id !== documento.id; });
      documentosActuales.push(documento);
      localStorage.removeItem(CLAVE_DOCUMENTOS);
    } catch (error) {
      try {
        var respaldo = documentosActuales.filter(function (item) { return item.id !== documento.id; });
        respaldo.push(documento);
        localStorage.setItem(CLAVE_DOCUMENTOS, JSON.stringify(respaldo));
        documentosActuales = respaldo;
      } catch (errorLocal) {
        window.alert("No se pudo guardar. Compruebe el espacio disponible en el dispositivo.");
        botonGuardar.disabled = false;
        botonGuardar.textContent = "Guardar";
        return;
      }
    }

    documentoActualId = documento.id;
    pintarDocumentos();
    botonGuardar.disabled = false;
    botonGuardar.textContent = "Guardar";
    mostrarPantalla("pantalla-inicio");
  }

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
      if (boton.hasAttribute("data-plantilla")) { restablecerFormulario(); }
      mostrarPantalla(boton.getAttribute("data-ir"));
      return;
    }

    var guardar = evento.target.closest("#btn-guardar");
    if (guardar) {
      guardarDocumento();
      return;
    }

    var abrir = evento.target.closest("[data-abrir-documento]");
    if (abrir) {
      abrirDocumento(abrir.getAttribute("data-abrir-documento"));
      return;
    }

    var eliminar = evento.target.closest("[data-eliminar-documento]");
    if (eliminar) {
      if (!window.confirm("¿Eliminar este documento guardado de este dispositivo?")) { return; }
      var id = eliminar.getAttribute("data-eliminar-documento");
      eliminarDeBase(id).then(function () {
        documentosActuales = documentosActuales.filter(function (documento) { return documento.id !== id; });
        pintarDocumentos();
      }).catch(function () {
        documentosActuales = documentosActuales.filter(function (documento) { return documento.id !== id; });
        try { localStorage.setItem(CLAVE_DOCUMENTOS, JSON.stringify(documentosActuales)); } catch (error) { /* El registro ya no se muestra en esta sesión. */ }
        pintarDocumentos();
      });
    }
  });

  cargarDocumentos();
  if (navigator.storage && navigator.storage.persist) { navigator.storage.persist(); }
})();
