/*
 * geo-helper.js
 * Módulo reutilizable de geolocalización en JavaScript Vanilla.
 *
 * Encapsula navigator.geolocation y la Permissions API en funciones que
 * devuelven Promesas. Cualquier pantalla puede pedir coordenadas con una
 * sola línea: obtenerUbicacionActual().then(...)
 *
 * Sin librerías y sin async/await.
 */

'use strict';

/**
 * Traduce los códigos numéricos nativos a mensajes claros.
 * 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
 */
function traducirErrorGeolocalizacion(error) {
  const codigo = error && error.code;

  switch (codigo) {
    case 1:
      return 'Permiso de ubicación denegado. Puedes ingresar tu zona manualmente.';
    case 2:
      return 'No fue posible determinar tu ubicación (señal GPS o Wi-Fi no disponible).';
    case 3:
      return 'Se agotó el tiempo de espera intentando obtener las coordenadas.';
    default:
      return 'Ocurrió un error inesperado al consultar la ubicación.';
  }
}

/**
 * Lectura única de la posición actual.
 * Devuelve una Promesa con { latitud, longitud, precisionMetros, timestamp }.
 */
function obtenerUbicacionActual(opcionesPersonalizadas) {
  const opciones = Object.assign(
    {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 30000
    },
    opcionesPersonalizadas || {}
  );

  return new Promise(function (resolve, reject) {
    if (!('geolocation' in navigator)) {
      reject(new Error('Este navegador no soporta la API de Geolocalización.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function (posicion) {
        resolve({
          latitud: posicion.coords.latitude,
          longitud: posicion.coords.longitude,
          precisionMetros: Math.round(posicion.coords.accuracy),
          timestamp: posicion.timestamp
        });
      },
      function (error) {
        const fallo = new Error(traducirErrorGeolocalizacion(error));
        fallo.codigo = error && error.code;
        reject(fallo);
      },
      opciones
    );
  });
}

/**
 * Consulta el estado del permiso sin disparar el diálogo nativo.
 * Devuelve 'granted', 'denied' o 'prompt'. Si el navegador no soporta
 * la Permissions API para geolocalización, se asume 'prompt'.
 */
function consultarEstadoPermisoGeo() {
  if (!('permissions' in navigator) || !navigator.permissions.query) {
    return Promise.resolve('prompt');
  }

  return navigator.permissions.query({ name: 'geolocation' })
    .then(function (resultado) {
      return resultado.state;
    })
    .catch(function () {
      return 'prompt';
    });
}

/**
 * Clasifica el margen de error en metros para la interfaz.
 * Menos de 30 m se considera precisión GPS alta; el resto, aproximada.
 */
function clasificarPrecision(metros) {
  const valor = Number(metros);

  if (!isFinite(valor)) {
    return { nivel: 'desconocida', etiqueta: 'Precisión desconocida', clase: 'manual' };
  }

  if (valor < 30) {
    return { nivel: 'alta', etiqueta: 'Precisión GPS alta', clase: 'alta' };
  }

  return {
    nivel: 'aproximada',
    etiqueta: 'Ubicación aproximada (Wi-Fi / IP)',
    clase: 'aproximada'
  };
}

/* Espacio de nombres ordenado, además de las funciones globales. */
const GeoHelper = {
  traducirErrorGeolocalizacion: traducirErrorGeolocalizacion,
  obtenerUbicacionActual: obtenerUbicacionActual,
  consultarEstadoPermisoGeo: consultarEstadoPermisoGeo,
  clasificarPrecision: clasificarPrecision
};

if (typeof window !== 'undefined') {
  window.GeoHelper = GeoHelper;
}

if (typeof self !== 'undefined') {
  self.GeoHelper = GeoHelper;
}
