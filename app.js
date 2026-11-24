/*
 * app.js
 * Interfaz, flujo de pre-permiso y plan B manual para geolocalización.
 *
 * Consume el módulo geo-helper.js. Sin librerías y sin async/await:
 * toda la asincronía se resuelve con .then(), .catch() y .finally().
 */

'use strict';

const PRECISION_MANUAL = 5000;

const ZONAS = [
  { id: 'cuernavaca', nombre: 'Cuernavaca Centro, Morelos', latitud: 18.9242, longitud: -99.2216 },
  { id: 'emiliano', nombre: 'Emiliano Zapata (UTEZ), Morelos', latitud: 18.8783, longitud: -99.2277 },
  { id: 'cdmx', nombre: 'Ciudad de México, Zócalo', latitud: 19.4326, longitud: -99.1332 },
  { id: 'guadalajara', nombre: 'Guadalajara Centro, Jalisco', latitud: 20.6597, longitud: -103.3496 },
  { id: 'monterrey', nombre: 'Monterrey Centro, Nuevo León', latitud: 25.6866, longitud: -100.3161 },
  { id: 'puebla', nombre: 'Puebla Centro, Puebla', latitud: 19.0414, longitud: -98.2063 },
  { id: 'merida', nombre: 'Mérida Centro, Yucatán', latitud: 20.9674, longitud: -89.5926 }
];

let consultaPermisoEnProceso = false;
let lecturaEnProceso = false;
let ultimaUbicacion = null;
let eventoInstalacionDiferido = null;

/* --------------------------------------------------------------- utilidades */

function $(id) {
  return document.getElementById(id);
}

function anotar(mensaje) {
  const lista = $('bitacora');
  if (!lista) {
    return;
  }

  const item = document.createElement('li');
  const ahora = new Date();

  item.textContent = ('0' + ahora.getHours()).slice(-2) + ':' +
    ('0' + ahora.getMinutes()).slice(-2) + ':' +
    ('0' + ahora.getSeconds()).slice(-2) + '  ' + mensaje;

  lista.insertBefore(item, lista.firstChild);

  const ultimo = $('ultimo-aviso');
  if (ultimo) {
    ultimo.textContent = mensaje;
  }

  while (lista.children.length > 40) {
    lista.removeChild(lista.lastChild);
  }
}

function actualizarEstado(mensaje, tipo) {
  const texto = $('mensaje-estado');
  if (texto) {
    texto.textContent = mensaje;
  }

  const clase = tipo === 'activa' ? 'dot online'
    : tipo === 'error' ? 'dot offline'
      : 'dot';

  const badge = $('badge-estado');
  if (badge) {
    badge.className = clase;
    badge.title = mensaje;
    badge.setAttribute('aria-label', mensaje);
  }

  const punto = $('punto-estado');
  if (punto) {
    punto.className = clase;
  }
}

function formatearHora(marca) {
  if (!marca) {
    return '—';
  }

  const d = new Date(marca);
  return ('0' + d.getHours()).slice(-2) + ':' +
    ('0' + d.getMinutes()).slice(-2) + ':' +
    ('0' + d.getSeconds()).slice(-2);
}

function construirEnlaceMapa(ubicacion) {
  const lat = Number(ubicacion.latitud).toFixed(6);
  const lon = Number(ubicacion.longitud).toFixed(6);
  return 'https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lon +
    '#map=16/' + lat + '/' + lon;
}

/* ------------------------------------------------------------------ pintado */

function pintarResultado(ubicacion, modo) {
  const clasificacion = modo === 'manual'
    ? { nivel: 'manual', etiqueta: 'Zona manual (referencia)', clase: 'manual' }
    : clasificarPrecision(ubicacion.precisionMetros);

  const fuente = modo === 'manual'
    ? 'Zona manual'
    : (clasificacion.nivel === 'alta' ? 'GPS' : 'Wi-Fi / IP');

  $('valor-latitud').textContent = Number(ubicacion.latitud).toFixed(6);
  $('valor-longitud').textContent = Number(ubicacion.longitud).toFixed(6);
  $('valor-precision').textContent = (modo === 'manual' ? '≈ ' : '') +
    ubicacion.precisionMetros + ' m';
  $('valor-fuente').textContent = fuente;
  $('valor-hora').textContent = formatearHora(ubicacion.timestamp);

  const pastilla = $('pastilla-precision');
  pastilla.textContent = clasificacion.etiqueta;
  pastilla.className = 'pastilla ' + clasificacion.clase;

  const enlace = $('enlace-mapa');
  enlace.href = construirEnlaceMapa(ubicacion);

  $('resultado').hidden = false;
  $('plan-b').hidden = true;
  $('aviso-permiso').hidden = true;

  actualizarEstado('Ubicación lista: ' + clasificacion.etiqueta + '.', 'activa');
  anotar('Coordenadas ' + Number(ubicacion.latitud).toFixed(5) + ', ' +
    Number(ubicacion.longitud).toFixed(5) + ' · precisión ' +
    ubicacion.precisionMetros + ' m · ' + clasificacion.etiqueta + '.');
}

/* ------------------------------------------------------------------- flujos */

function mostrarAvisoPermiso() {
  const aviso = $('aviso-permiso');
  aviso.hidden = false;

  const confirmar = $('btn-confirmar-permiso');
  if (confirmar) {
    confirmar.focus();
  }

  if (aviso.scrollIntoView) {
    aviso.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  anotar('Aviso de pre-permiso mostrado. La ubicación aún no se ha solicitado.');
}

function mostrarPlanB(mensaje, permisoDenegado) {
  const plan = $('plan-b');
  const texto = $('plan-b-texto');
  const nota = $('nota-permiso');

  if (texto) {
    texto.textContent = mensaje + ' Puedes elegir una zona de referencia para continuar.';
  }

  plan.hidden = false;
  nota.hidden = !permisoDenegado;

  const select = $('select-zona');
  if (select) {
    select.focus();
  }

  if (plan.scrollIntoView) {
    plan.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function mostrarError(mensaje, permisoDenegado) {
  actualizarEstado(mensaje, 'error');
  anotar(mensaje);
  mostrarPlanB(mensaje, permisoDenegado);
}

function solicitarUbicacion() {
  if (lecturaEnProceso) {
    return;
  }

  lecturaEnProceso = true;

  const boton = $('btn-ubicacion');
  if (boton) {
    boton.disabled = true;
  }

  $('aviso-permiso').hidden = true;
  actualizarEstado('Solicitando ubicación al dispositivo...', 'proceso');
  anotar('Llamando a obtenerUbicacionActual()...');

  obtenerUbicacionActual({ enableHighAccuracy: true, timeout: 8000 })
    .then(function (ubicacion) {
      ultimaUbicacion = ubicacion;
      pintarResultado(ubicacion, 'gps');
      return true;
    })
    .catch(function (error) {
      mostrarError(error.message, error.codigo === 1);
      return false;
    })
    .finally(function () {
      lecturaEnProceso = false;
      if (boton) {
        boton.disabled = false;
      }
    });
}

function alPulsarUbicacion() {
  if (consultaPermisoEnProceso || lecturaEnProceso) {
    return;
  }

  consultaPermisoEnProceso = true;

  const boton = $('btn-ubicacion');
  if (boton) {
    boton.disabled = true;
  }

  actualizarEstado('Consultando el estado del permiso...', 'proceso');

  consultarEstadoPermisoGeo()
    .then(function (estado) {
      anotar('Estado del permiso de ubicación: ' + estado + '.');

      if (estado === 'granted') {
        consultaPermisoEnProceso = false;
        if (boton) {
          boton.disabled = false;
        }
        solicitarUbicacion();
        return;
      }

      if (estado === 'denied') {
        mostrarError('El permiso de ubicación está bloqueado en este navegador.', true);
        return;
      }

      mostrarAvisoPermiso();
    })
    .catch(function () {
      mostrarAvisoPermiso();
    })
    .finally(function () {
      consultaPermisoEnProceso = false;
      if (boton) {
        boton.disabled = false;
      }
    });
}

function confirmarPermiso() {
  $('aviso-permiso').hidden = true;
  solicitarUbicacion();
}

function cancelarPermiso() {
  $('aviso-permiso').hidden = true;
  actualizarEstado('No se solicitó la ubicación.', 'apagada');
  anotar('El usuario canceló el pre-permiso de ubicación.');
}

function poblarZonas() {
  const select = $('select-zona');
  if (!select) {
    return;
  }

  ZONAS.forEach(function (zona) {
    const opcion = document.createElement('option');
    opcion.value = zona.id;
    opcion.textContent = zona.nombre;
    select.appendChild(opcion);
  });
}

function usarZonaManual() {
  const select = $('select-zona');
  const id = select ? select.value : null;

  const zona = ZONAS.filter(function (item) {
    return item.id === id;
  })[0];

  if (!zona) {
    anotar('No se encontró la zona seleccionada.');
    return;
  }

  const ubicacion = {
    latitud: zona.latitud,
    longitud: zona.longitud,
    precisionMetros: PRECISION_MANUAL,
    timestamp: Date.now()
  };

  ultimaUbicacion = ubicacion;
  pintarResultado(ubicacion, 'manual');
  actualizarEstado('Zona manual aplicada: ' + zona.nombre + '.', 'activa');
  anotar('Zona manual elegida: ' + zona.nombre + '.');
}

/* ------------------------------------------------------------ instalación */

function manejarInstalacion() {
  const boton = $('btn-instalar');

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    eventoInstalacionDiferido = event;
    if (boton) {
      boton.hidden = false;
    }
    anotar('Instalación disponible: botón habilitado.');
  });

  if (boton) {
    boton.addEventListener('click', function () {
      if (!eventoInstalacionDiferido) {
        return;
      }

      eventoInstalacionDiferido.prompt();

      if (!eventoInstalacionDiferido.userChoice) {
        boton.hidden = true;
        eventoInstalacionDiferido = null;
        return;
      }

      eventoInstalacionDiferido.userChoice
        .then(function (resultado) {
          anotar(resultado.outcome === 'accepted'
            ? 'Instalación aceptada por el usuario.'
            : 'Instalación cancelada por el usuario.');
          eventoInstalacionDiferido = null;
          boton.hidden = true;
        })
        .catch(function (error) {
          anotar('No se pudo completar la instalación: ' + error.message);
        });
    });
  }

  window.addEventListener('appinstalled', function () {
    if (boton) {
      boton.hidden = true;
    }
    eventoInstalacionDiferido = null;
    anotar('Aplicación instalada en el dispositivo.');
  });
}

/* ------------------------------------------------------------ service worker */

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    anotar('Este navegador no soporta Service Workers.');
    return;
  }

  navigator.serviceWorker.register('./sw.js')
    .then(function (registro) {
      anotar('Service Worker registrado (alcance: ' + registro.scope + ').');
    })
    .catch(function (error) {
      anotar('Fallo al registrar el Service Worker: ' + error.message);
    });
}

/* ------------------------------------------------------------------ inicio */

function iniciar() {
  actualizarEstado('Sin ubicación todavía.', 'apagada');
  poblarZonas();

  const botonUbicacion = $('btn-ubicacion');
  if (botonUbicacion) {
    botonUbicacion.addEventListener('click', alPulsarUbicacion);
  }

  const botonZona = $('btn-zona-manual');
  if (botonZona) {
    botonZona.addEventListener('click', function () {
      mostrarPlanB('Puedes usar una zona de referencia en lugar de la lectura del dispositivo.', false);
    });
  }

  const confirmar = $('btn-confirmar-permiso');
  if (confirmar) {
    confirmar.addEventListener('click', confirmarPermiso);
  }

  const cancelar = $('btn-cancelar-permiso');
  if (cancelar) {
    cancelar.addEventListener('click', cancelarPermiso);
  }

  const usarZona = $('btn-usar-zona');
  if (usarZona) {
    usarZona.addEventListener('click', usarZonaManual);
  }

  manejarInstalacion();
  registrarServiceWorker();

  anotar('Aplicación lista. La ubicación se solicita solo bajo demanda.');
}

document.addEventListener('DOMContentLoaded', iniciar);
