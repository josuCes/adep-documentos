/* ==========================================================
   plantillas.js · Creador, uso y descarga de plantillas propias
   ========================================================== */

(function () {
  "use strict";

  var CLAVE_PLANTILLAS = "adep-plantillas-v1";
  var LIMITE_BLOQUES = 20;
  var TIPOS = {
    titulo: "Título",
    subtitulo: "Subtítulo",
    texto: "Texto para completar",
    linea: "Campo con raya",
    doble: "Dos campos en una línea"
  };
  var plantillas = leerPlantillas();
  var bloques = [];
  var plantillaEnEdicion = null;
  var plantillaActual = null;
  var valoresActuales = {};
  var documentoActualId = null;
  var temporizadorVista = 0;

  var listaPlantillas = document.getElementById("lista-plantillas-personalizadas");
  var formularioPlantilla = document.getElementById("formulario-plantilla");
  var formularioDocumento = document.getElementById("formulario-documento-personalizado");
  var vistaMolde = document.getElementById("vista-plantilla-creador");
  var vistaDocumento = document.getElementById("vista-personalizada");

  function nuevoId() {
    return window.crypto && window.crypto.randomUUID
      ? window.crypto.randomUUID()
      : String(Date.now()) + Math.random().toString(16).slice(2);
  }

  function leerPlantillas() {
    try {
      var guardadas = JSON.parse(localStorage.getItem(CLAVE_PLANTILLAS) || "[]");
      return Array.isArray(guardadas) ? guardadas.filter(function (item) {
        return item && typeof item.id === "string" && Array.isArray(item.bloques);
      }) : [];
    } catch (error) {
      console.error("No se pudieron leer las plantillas guardadas:", error);
      return [];
    }
  }

  function guardarPlantillas() {
    try {
      localStorage.setItem(CLAVE_PLANTILLAS, JSON.stringify(plantillas));
      return true;
    } catch (error) {
      console.error("No se pudieron guardar las plantillas:", error);
      window.dialogosApp.aviso("No se pudo guardar", "Comprueba el espacio disponible en el dispositivo e inténtalo de nuevo.");
      return false;
    }
  }

  function agregarTexto(padre, etiqueta, clase, texto) {
    var elemento = document.createElement(etiqueta);
    if (clase) { elemento.className = clase; }
    if (texto) { elemento.textContent = texto; }
    padre.appendChild(elemento);
    return elemento;
  }

  function guardarBloquesDesdeEditor() {
    bloques = Array.prototype.slice.call(document.querySelectorAll(".bloque-plantilla")).map(function (tarjeta) {
      var bloque = {
        id: tarjeta.getAttribute("data-id"),
        tipo: tarjeta.getAttribute("data-tipo"),
        negrita: tarjeta.querySelector('[data-prop="negrita"]').checked,
        cursiva: tarjeta.querySelector('[data-prop="cursiva"]').checked
      };
      bloque.etiqueta = tarjeta.querySelector('[data-prop="etiqueta"]').value.trim();
      if (bloque.tipo === "doble") {
        bloque.etiquetaDerecha = tarjeta.querySelector('[data-prop="etiquetaDerecha"]').value.trim();
      }
      return bloque;
    });
  }

  function crearCampoConfiguracion(bloque, propiedad, valor, etiqueta) {
    var envoltura = document.createElement("label");
    envoltura.className = "bloque-plantilla__campo";
    envoltura.appendChild(document.createTextNode(etiqueta));
    var entrada = document.createElement("input");
    entrada.type = "text";
    entrada.maxLength = 100;
    entrada.value = valor;
    entrada.setAttribute("data-prop", propiedad);
    entrada.setAttribute("aria-label", etiqueta);
    envoltura.appendChild(entrada);
    bloque.appendChild(envoltura);
    return entrada;
  }

  function pintarBloques() {
    var contenedor = document.getElementById("lista-bloques-plantilla");
    contenedor.replaceChildren();
    bloques.forEach(function (datos, indice) {
      var tarjeta = document.createElement("article");
      tarjeta.className = "bloque-plantilla";
      tarjeta.setAttribute("data-id", datos.id);
      tarjeta.setAttribute("data-tipo", datos.tipo);

      var cabecera = agregarTexto(tarjeta, "div", "bloque-plantilla__cabecera");
      agregarTexto(cabecera, "strong", "", (indice + 1) + ". " + TIPOS[datos.tipo]);

      var acciones = agregarTexto(cabecera, "div", "bloque-plantilla__acciones");
      [
        { simbolo: "↑", accion: "subir", nombre: "Subir" },
        { simbolo: "↓", accion: "bajar", nombre: "Bajar" },
        { simbolo: "×", accion: "quitar", nombre: "Quitar" }
      ].forEach(function (opcion) {
        var boton = agregarTexto(acciones, "button", "boton-orden-bloque", opcion.simbolo);
        boton.type = "button";
        boton.setAttribute("data-accion-bloque", opcion.accion);
        boton.setAttribute("aria-label", opcion.nombre + " " + TIPOS[datos.tipo].toLowerCase());
        boton.disabled = (opcion.accion === "subir" && indice === 0)
          || (opcion.accion === "bajar" && indice === bloques.length - 1);
      });

      if (datos.tipo === "titulo" || datos.tipo === "subtitulo") {
        crearCampoConfiguracion(tarjeta, "etiqueta", datos.etiqueta, "Texto fijo");
      } else if (datos.tipo === "doble") {
        crearCampoConfiguracion(tarjeta, "etiqueta", datos.etiqueta, "Etiqueta izquierda");
        crearCampoConfiguracion(tarjeta, "etiquetaDerecha", datos.etiquetaDerecha, "Etiqueta derecha");
      } else {
        crearCampoConfiguracion(tarjeta, "etiqueta", datos.etiqueta, "Etiqueta del campo");
      }

      var estilo = agregarTexto(tarjeta, "div", "bloque-plantilla__estilo");
      [
        { propiedad: "negrita", texto: "Negrita", valor: datos.negrita },
        { propiedad: "cursiva", texto: "Cursiva", valor: datos.cursiva }
      ].forEach(function (opcion) {
        var etiqueta = document.createElement("label");
        var casilla = document.createElement("input");
        casilla.type = "checkbox";
        casilla.checked = !!opcion.valor;
        casilla.setAttribute("data-prop", opcion.propiedad);
        etiqueta.appendChild(casilla);
        etiqueta.appendChild(document.createTextNode(" " + opcion.texto));
        estilo.appendChild(etiqueta);
      });
      contenedor.appendChild(tarjeta);
    });
    document.getElementById("aviso-limite-bloques").textContent =
      bloques.length >= LIMITE_BLOQUES ? "Llegaste al límite de 20 elementos para esta plantilla." : "";
    document.getElementById("agregar-bloque").disabled = bloques.length >= LIMITE_BLOQUES;
    programarVistaMolde();
  }

  function valoresVacios(plantilla) {
    var valores = {};
    plantilla.bloques.forEach(function (bloque) {
      if (bloque.tipo === "texto" || bloque.tipo === "linea") { valores[bloque.id] = ""; }
      if (bloque.tipo === "doble") {
        valores[bloque.id + "-izquierda"] = "";
        valores[bloque.id + "-derecha"] = "";
      }
    });
    return valores;
  }

  function crearBloqueVisual(bloque, valores) {
    var elemento;
    var clase = "documento-personalizado__bloque";
    if (bloque.negrita) { clase += " documento-personalizado__bloque--negrita"; }
    if (bloque.cursiva) { clase += " documento-personalizado__bloque--cursiva"; }

    if (bloque.tipo === "titulo" || bloque.tipo === "subtitulo") {
      elemento = document.createElement(bloque.tipo === "titulo" ? "h2" : "h3");
      elemento.className = clase + " documento-personalizado__" + bloque.tipo;
      elemento.textContent = bloque.etiqueta;
      return elemento;
    }

    if (bloque.tipo === "doble") {
      elemento = agregarTexto(document.createElement("div"), "div", clase + " documento-personalizado__par");
      [
        { etiqueta: bloque.etiqueta, valor: valores[bloque.id + "-izquierda"] },
        { etiqueta: bloque.etiquetaDerecha, valor: valores[bloque.id + "-derecha"] }
      ].forEach(function (campo) {
        var columna = agregarTexto(elemento, "div", "documento-personalizado__columna");
        agregarTexto(columna, "span", "documento-personalizado__etiqueta", campo.etiqueta);
        agregarTexto(columna, "span", "documento-personalizado__valor", campo.valor || "\u00a0");
      });
      return elemento;
    }

    elemento = agregarTexto(document.createElement("div"), "div", clase + " documento-personalizado__campo");
    agregarTexto(elemento, "span", "documento-personalizado__etiqueta", bloque.etiqueta);
    agregarTexto(elemento, "span", "documento-personalizado__valor", valores[bloque.id] || "\u00a0");
    if (bloque.tipo === "linea") { elemento.classList.add("documento-personalizado__campo--raya"); }
    return elemento;
  }

  function crearMediaHoja(plantilla, valores, completa) {
    var mitad = document.createElement("section");
    mitad.className = "documento-personalizado__mitad";
    mitad.classList.add("documento-personalizado__mitad--logo-" + plantilla.logo.tamano);
    if (plantilla.papel === "carta") {
      mitad.classList.add("documento-personalizado__mitad--carta");
    }

    var logo = document.createElement("img");
    logo.className = "documento-personalizado__logo documento-personalizado__logo--" + plantilla.logo.tamano
      + " documento-personalizado__logo--" + plantilla.logo.posicion;
    logo.src = "assets/adep-logo-boleta.png";
    logo.alt = "Logotipo de ADEP";
    mitad.appendChild(logo);

    var contenido = agregarTexto(mitad, "div", "documento-personalizado__contenido");
    plantilla.bloques.forEach(function (bloque) {
      contenido.appendChild(crearBloqueVisual(bloque, valores));
    });

    if (plantilla.papel !== "carta") {
      agregarTexto(mitad, "div", "documento-personalizado__borde-final");
    }
    if (completa && plantilla.papel === "media") {
      mitad.classList.add("documento-personalizado__mitad--una");
    }
    return mitad;
  }

  function renderizarPagina(plantilla, valores, completa) {
    var pagina = document.createElement("div");
    pagina.className = "documento-personalizado";
    var alto = plantilla.papel === "carta" || plantilla.papel === "duplicado" || completa ? 279.4 : 139.7;
    pagina.style.height = alto + "mm";
    pagina.appendChild(crearMediaHoja(plantilla, valores, completa));
    if (plantilla.papel === "duplicado") {
      pagina.appendChild(crearMediaHoja(plantilla, valores, completa));
    }
    return pagina;
  }

  function ajustarVista(contenedor, pagina) {
    if (!contenedor || !pagina) { return; }
    pagina.style.transform = "none";
    pagina.style.transformOrigin = "top left";
    var ancho = pagina.offsetWidth;
    var alto = pagina.offsetHeight;
    var disponible = contenedor.clientWidth;
    if (!ancho || !alto || !disponible) { return; }
    var escala = Math.min(1, disponible / ancho);
    pagina.style.transform = "scale(" + escala + ")";
    contenedor.style.height = (alto * escala) + "px";
  }

  function mostrarVistaMolde() {
    guardarBloquesDesdeEditor();
    var plantilla = leerFormularioPlantilla();
    var pagina = renderizarPagina(plantilla, valoresVacios(plantilla), false);
    vistaMolde.replaceChildren(pagina);
    requestAnimationFrame(function () {
      ajustarVista(document.getElementById("vista-molde-contenedor"), pagina);
    });
  }

  function programarVistaMolde() {
    window.clearTimeout(temporizadorVista);
    temporizadorVista = window.setTimeout(mostrarVistaMolde, 80);
  }

  function leerFormularioPlantilla() {
    return {
      id: plantillaEnEdicion || nuevoId(),
      nombre: document.getElementById("nombre-plantilla").value.trim() || "Mi plantilla",
      papel: document.querySelector('input[name="papel-plantilla"]:checked').value,
      logo: {
        tamano: document.getElementById("tamano-logo").value,
        posicion: document.getElementById("posicion-logo").value
      },
      bloques: bloques.slice(),
      favorito: false
    };
  }

  function crearPlantillaNueva(plantilla) {
    plantillaEnEdicion = plantilla ? plantilla.id : null;
    bloques = plantilla ? JSON.parse(JSON.stringify(plantilla.bloques)) : [];
    document.getElementById("nombre-plantilla").value = plantilla ? plantilla.nombre : "";
    document.querySelector('input[name="papel-plantilla"][value="' + (plantilla ? plantilla.papel : "media") + '"]').checked = true;
    document.getElementById("tamano-logo").value = plantilla ? plantilla.logo.tamano : "mediano";
    document.getElementById("posicion-logo").value = plantilla ? plantilla.logo.posicion : "izquierda";
    document.getElementById("titulo-crear-plantilla").textContent = plantilla ? "Editar plantilla" : "Diseñar plantilla";
    document.getElementById("guardar-plantilla").textContent = plantilla ? "Guardar cambios" : "Guardar plantilla";
    pintarBloques();
    document.getElementById("pantalla-crear-plantilla").classList.add("pantalla--activa");
    document.querySelectorAll(".pantalla").forEach(function (pantalla) {
      if (pantalla.id !== "pantalla-crear-plantilla") { pantalla.classList.remove("pantalla--activa"); }
    });
    window.scrollTo(0, 0);
    requestAnimationFrame(mostrarVistaMolde);
  }

  function descripcionPapel(papel) {
    return papel === "carta" ? "Carta · una página"
      : papel === "duplicado" ? "Media hoja · 2 copias en una página"
        : "Media hoja · una página";
  }

  function pintarPlantillas() {
    listaPlantillas.replaceChildren();
    if (!plantillas.length) {
      agregarTexto(listaPlantillas, "p", "lista-documentos__vacio", "Tus plantillas guardadas aparecerán aquí.");
      return;
    }
    plantillas.slice().sort(function (a, b) {
      return Number(!!b.favorito) - Number(!!a.favorito) || a.nombre.localeCompare(b.nombre);
    }).forEach(function (plantilla) {
      var tarjeta = agregarTexto(listaPlantillas, "article", "tarjeta-plantilla");
      agregarTexto(tarjeta, "span", "tarjeta__titulo", plantilla.nombre);
      agregarTexto(tarjeta, "span", "tarjeta__texto", descripcionPapel(plantilla.papel));
      var acciones = agregarTexto(tarjeta, "div", "tarjeta-plantilla__acciones");
      [
        { clase: "boton boton--principal", texto: "Usar", accion: "usar" },
        { clase: "boton boton--secundario", texto: "Editar", accion: "editar" },
        { clase: "boton boton--texto", texto: plantilla.favorito ? "★ Favorita" : "☆ Favoritos", accion: "favorito" },
        { clase: "boton boton--texto", texto: "Eliminar", accion: "eliminar" }
      ].forEach(function (opcion) {
        var boton = agregarTexto(acciones, "button", opcion.clase, opcion.texto);
        boton.type = "button";
        boton.setAttribute("data-accion-plantilla", opcion.accion);
        boton.setAttribute("data-id-plantilla", plantilla.id);
      });
    });
  }

  function agregarBloque(tipo) {
    if (bloques.length >= LIMITE_BLOQUES) {
      document.getElementById("aviso-limite-bloques").textContent =
        "Llegaste al límite de 20 elementos para esta plantilla.";
      return;
    }
    var defecto = tipo === "titulo" ? "Título del documento"
      : tipo === "subtitulo" ? "Subtítulo"
        : tipo === "doble" ? "Campo izquierdo" : "Nombre del campo";
    bloques.push({
      id: nuevoId(),
      tipo: tipo,
      etiqueta: defecto,
      etiquetaDerecha: tipo === "doble" ? "Campo derecho" : "",
      negrita: tipo === "titulo",
      cursiva: false
    });
    pintarBloques();
  }

  function abrirEditorDocumento(plantilla, valores, documentoId) {
    plantillaActual = plantilla;
    valoresActuales = valores || valoresVacios(plantilla);
    documentoActualId = documentoId || null;
    document.getElementById("titulo-documento-personalizado").textContent = plantilla.nombre;
    document.getElementById("nombre-documento-personalizado").textContent = "Datos del documento";
    formularioDocumento.replaceChildren();

    plantilla.bloques.forEach(function (bloque) {
      if (bloque.tipo === "titulo" || bloque.tipo === "subtitulo") { return; }
      var campos = bloque.tipo === "doble"
        ? [
          { id: bloque.id + "-izquierda", etiqueta: bloque.etiqueta || "Campo izquierdo" },
          { id: bloque.id + "-derecha", etiqueta: bloque.etiquetaDerecha || "Campo derecho" }
        ]
        : [{ id: bloque.id, etiqueta: bloque.etiqueta || "Campo" }];
      campos.forEach(function (campo) {
        var grupo = agregarTexto(formularioDocumento, "div", "campo-form");
        var etiqueta = agregarTexto(grupo, "label", "", campo.etiqueta);
        var entrada = document.createElement("input");
        entrada.type = "text";
        entrada.maxLength = 500;
        entrada.value = valoresActuales[campo.id] || "";
        entrada.setAttribute("data-valor-plantilla", campo.id);
        entrada.setAttribute("aria-label", campo.etiqueta);
        etiqueta.htmlFor = "valor-" + campo.id;
        entrada.id = "valor-" + campo.id;
        grupo.appendChild(entrada);
      });
    });
    actualizarVistaDocumento();
    document.querySelectorAll(".pantalla").forEach(function (pantalla) {
      pantalla.classList.toggle("pantalla--activa", pantalla.id === "pantalla-editor-personalizada");
    });
    window.scrollTo(0, 0);
    requestAnimationFrame(actualizarVistaDocumento);
  }

  function leerValoresDocumento() {
    valoresActuales = {};
    formularioDocumento.querySelectorAll("[data-valor-plantilla]").forEach(function (entrada) {
      valoresActuales[entrada.getAttribute("data-valor-plantilla")] = entrada.value;
    });
    actualizarVistaDocumento();
  }
  formularioDocumento.addEventListener("input", leerValoresDocumento);

  function actualizarVistaDocumento() {
    if (!plantillaActual) { return; }
    var pagina = renderizarPagina(plantillaActual, valoresActuales, false);
    vistaDocumento.replaceChildren(pagina);
    requestAnimationFrame(function () {
      ajustarVista(document.getElementById("vista-personalizada-contenedor"), pagina);
    });
  }

  function completarValores(plantilla, valoresGuardados) {
    var valores = valoresVacios(plantilla);
    Object.keys(valoresGuardados || {}).forEach(function (id) {
      if (Object.prototype.hasOwnProperty.call(valores, id)) { valores[id] = valoresGuardados[id]; }
    });
    return valores;
  }

  function abrirPlantilla(plantilla) {
    if (!plantilla) { return; }
    abrirEditorDocumento(plantilla, valoresVacios(plantilla), null);
  }

  function nombreArchivo(nombre) {
    return (nombre || "documento").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
      .replace(/\s+/g, " ").trim() || "documento";
  }

  function crearPaginaPdf() {
    var pagina = renderizarPagina(plantillaActual, valoresActuales, true);
    pagina.style.position = "fixed";
    pagina.style.left = "-10000px";
    pagina.style.top = "0";
    document.body.appendChild(pagina);
    return pagina;
  }

  async function descargarPdf() {
    var boton = document.getElementById("descargar-documento-personalizado");
    if (!window.html2canvas || !window.jspdf || !window.jspdf.jsPDF) {
      await window.dialogosApp.aviso("No se pudo generar el PDF", "Comprueba que los módulos PDF estén cargados e inténtalo de nuevo.");
      return;
    }
    boton.disabled = true;
    var pagina = crearPaginaPdf();
    try {
      if (document.fonts && document.fonts.ready) { await document.fonts.ready; }
      var canvas = await window.html2canvas(pagina, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        width: pagina.offsetWidth,
        height: pagina.offsetHeight
      });
      var pdf = new window.jspdf.jsPDF({ orientation: "portrait", unit: "mm", format: "letter", compress: true });
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 215.9, 279.4, undefined, "FAST");
      pdf.save(nombreArchivo(plantillaActual.nombre) + ".pdf");
      await window.dialogosApp.aviso("PDF descargado", "El documento se descargó en una sola página tamaño carta.");
    } catch (error) {
      console.error("No se pudo generar el PDF de la plantilla:", error);
      await window.dialogosApp.aviso("No se pudo descargar", "Inténtalo de nuevo. Si el problema continúa, guarda el documento e inténtalo más tarde.");
    } finally {
      pagina.remove();
      boton.disabled = false;
    }
  }

  async function guardarDocumento() {
    leerValoresDocumento();
    var id = documentoActualId || nuevoId();
    var documento = {
      id: id,
      tipo: "personalizada",
      nombre: plantillaActual.nombre,
      nombrePlantilla: plantillaActual.nombre,
      plantillaId: plantillaActual.id,
      plantilla: JSON.parse(JSON.stringify(plantillaActual)),
      valores: JSON.parse(JSON.stringify(valoresActuales)),
      datos: { funcionario: plantillaActual.nombre, area: descripcionPapel(plantillaActual.papel) },
      creado: new Date().toISOString(),
      actualizado: new Date().toISOString()
    };
    try {
      await window.adepDocumentos.guardar(documento);
      documentoActualId = id;
      await window.dialogosApp.aviso("Documento guardado", "Quedó guardado en este dispositivo.");
    } catch (error) {
      await window.dialogosApp.aviso("No se pudo guardar", "Comprueba el espacio disponible en el dispositivo e inténtalo de nuevo.");
    }
  }

  formularioPlantilla.addEventListener("submit", function (evento) {
    evento.preventDefault();
    guardarBloquesDesdeEditor();
    if (!bloques.length) {
      window.dialogosApp.aviso("Agrega elementos", "La plantilla debe tener al menos un título, texto o campo.");
      return;
    }
    var nombre = document.getElementById("nombre-plantilla").value.trim();
    if (!nombre) {
      document.getElementById("nombre-plantilla").focus();
      return;
    }
    var existente = plantillas.find(function (item) { return item.id === plantillaEnEdicion; });
    var plantilla = leerFormularioPlantilla();
    plantilla.nombre = nombre;
    plantilla.favorito = existente ? !!existente.favorito : false;
    plantillas = plantillas.filter(function (item) { return item.id !== plantilla.id; });
    plantillas.push(plantilla);
    if (!guardarPlantillas()) { return; }
    pintarPlantillas();
    document.querySelectorAll(".pantalla").forEach(function (pantalla) {
      pantalla.classList.toggle("pantalla--activa", pantalla.id === "pantalla-plantillas");
    });
    window.scrollTo(0, 0);
  });

  document.getElementById("crear-plantilla").addEventListener("click", function () { crearPlantillaNueva(null); });
  document.getElementById("agregar-bloque").addEventListener("click", function () {
    agregarBloque(document.getElementById("tipo-bloque").value);
  });

  ["input", "change"].forEach(function (evento) {
    formularioPlantilla.addEventListener(evento, programarVistaMolde);
  });
  document.getElementById("lista-bloques-plantilla").addEventListener("input", programarVistaMolde);
  document.getElementById("lista-bloques-plantilla").addEventListener("change", programarVistaMolde);
  document.getElementById("lista-bloques-plantilla").addEventListener("click", function (evento) {
    var boton = evento.target.closest("[data-accion-bloque]");
    if (!boton) { return; }
    guardarBloquesDesdeEditor();
    var tarjeta = boton.closest(".bloque-plantilla");
    var indice = bloques.findIndex(function (bloque) { return bloque.id === tarjeta.getAttribute("data-id"); });
    var accion = boton.getAttribute("data-accion-bloque");
    if (accion === "quitar") { bloques.splice(indice, 1); }
    if (accion === "subir" && indice > 0) { bloques.splice(indice - 1, 0, bloques.splice(indice, 1)[0]); }
    if (accion === "bajar" && indice < bloques.length - 1) { bloques.splice(indice + 1, 0, bloques.splice(indice, 1)[0]); }
    pintarBloques();
  });

  listaPlantillas.addEventListener("click", async function (evento) {
    var boton = evento.target.closest("[data-accion-plantilla]");
    if (!boton) { return; }
    var plantilla = plantillas.find(function (item) { return item.id === boton.getAttribute("data-id-plantilla"); });
    if (!plantilla) { return; }
    var accion = boton.getAttribute("data-accion-plantilla");
    if (accion === "usar") { abrirPlantilla(plantilla); }
    if (accion === "editar") { crearPlantillaNueva(plantilla); }
    if (accion === "favorito") {
      plantilla.favorito = !plantilla.favorito;
      if (guardarPlantillas()) { pintarPlantillas(); }
    }
    if (accion === "eliminar") {
      var confirmar = await window.dialogosApp.confirmar("¿Eliminar plantilla?", "Los documentos que ya guardaste conservarán su copia de este molde.", "Eliminar");
      if (!confirmar) { return; }
      plantillas = plantillas.filter(function (item) { return item.id !== plantilla.id; });
      if (guardarPlantillas()) { pintarPlantillas(); }
    }
  });

  document.getElementById("guardar-documento-personalizado").addEventListener("click", guardarDocumento);
  document.getElementById("descargar-documento-personalizado").addEventListener("click", descargarPdf);
  document.getElementById("imprimir-documento-personalizado").addEventListener("click", function () {
    document.body.classList.add("imprimiendo-personalizado");
    window.print();
  });
  window.addEventListener("afterprint", function () { document.body.classList.remove("imprimiendo-personalizado"); });
  window.addEventListener("resize", function () {
    ajustarVista(document.getElementById("vista-molde-contenedor"), vistaMolde.firstElementChild);
    ajustarVista(document.getElementById("vista-personalizada-contenedor"), vistaDocumento.firstElementChild);
  });

  window.adepPlantillas = {
    abrirDocumento: function (documento) {
      var plantilla = documento.plantilla || plantillas.find(function (item) { return item.id === documento.plantillaId; });
      if (!plantilla) {
        window.dialogosApp.aviso("Plantilla no disponible", "No se encontró el molde guardado para este documento.");
        return;
      }
      abrirEditorDocumento(plantilla, completarValores(plantilla, documento.valores), documento.id);
    }
  };

  pintarPlantillas();
})();
