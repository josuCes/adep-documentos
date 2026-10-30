(function () {
  "use strict";

  var boton = document.getElementById("btn-instalar");
  var estado = document.getElementById("estado-instalacion");
  var eventoInstalacion = null;

  function estaInstalada() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  if (estaInstalada()) {
    boton.hidden = true;
  }

  window.addEventListener("beforeinstallprompt", function (evento) {
    evento.preventDefault();
    eventoInstalacion = evento;
  });

  boton.addEventListener("click", async function () {
    var continuar = await window.dialogosApp.confirmar(
      "¿Instalar ADEP?",
      "Se añadirá la aplicación a este dispositivo. Tus documentos guardados se quedarán aquí.",
      "Instalar"
    );
    if (!continuar) { return; }

    if (eventoInstalacion) {
      eventoInstalacion.prompt();
      var resultado = await eventoInstalacion.userChoice;
      eventoInstalacion = null;
      estado.textContent = resultado.outcome === "accepted"
        ? "Instalación iniciada."
        : "Puedes instalarla más tarde desde el menú del navegador.";
      return;
    }

    await window.dialogosApp.aviso(
      "Instala ADEP desde Chrome",
      "Abre el menú ⋮ y elige «Instalar aplicación» o «Añadir a pantalla de inicio». No se descargará un APK."
    );
  });

  window.addEventListener("appinstalled", function () {
    boton.hidden = true;
    estado.textContent = "ADEP quedó instalada en este dispositivo.";
  });

  if ("serviceWorker" in navigator && window.isSecureContext) {
    navigator.serviceWorker.register("./service-worker.js").catch(function (error) {
      console.error("No se pudo registrar el modo sin conexión:", error);
      estado.textContent = "La instalación estará disponible cuando la página esté publicada mediante HTTPS.";
    });
  }
})();