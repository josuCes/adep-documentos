(function () {
  "use strict";

  var dialogo = document.getElementById("dialogo-app");
  var titulo = document.getElementById("dialogo-titulo");
  var mensaje = document.getElementById("dialogo-mensaje");
  var cancelar = document.getElementById("dialogo-cancelar");
  var aceptar = document.getElementById("dialogo-aceptar");

  function mostrar(encabezado, detalle, permitirCancelar, textoAceptar) {
    titulo.textContent = encabezado;
    mensaje.textContent = detalle;
    cancelar.hidden = !permitirCancelar;
    aceptar.textContent = textoAceptar || "Aceptar";
    dialogo.returnValue = "";

    return new Promise(function (resolver) {
      dialogo.addEventListener("close", function () {
        resolver(dialogo.returnValue === "aceptar");
      }, { once: true });
      dialogo.showModal();
    });
  }

  window.dialogosApp = {
    confirmar: function (encabezado, detalle, textoAceptar) {
      return mostrar(encabezado, detalle, true, textoAceptar || "Continuar");
    },
    aviso: function (encabezado, detalle) {
      return mostrar(encabezado, detalle, false, "Aceptar");
    }
  };
})();