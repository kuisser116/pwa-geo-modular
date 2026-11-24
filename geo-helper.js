'use strict';

function traducirErrorGeolocalizacion(e) {
  const c = e && e.code;
  return c === 1 ? 'Permiso de ubicación denegado. Puedes ingresar tu zona manualmente.'
    : c === 2 ? 'No fue posible determinar tu ubicación (GPS o Wi-Fi no disponible).'
      : c === 3 ? 'Se agotó el tiempo de espera intentando obtener las coordenadas.'
        : 'Ocurrió un error inesperado al consultar la ubicación.';
}

function obtenerUbicacionActual(opciones) {
  const o = Object.assign({ enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }, opciones || {});
  return new Promise(function (resolve, reject) {
    if (!('geolocation' in navigator)) {
      reject(new Error('Este navegador no soporta geolocalización.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (p) {
        resolve({
          latitud: p.coords.latitude,
          longitud: p.coords.longitude,
          precisionMetros: Math.round(p.coords.accuracy),
          timestamp: p.timestamp
        });
      },
      function (e) {
        const err = new Error(traducirErrorGeolocalizacion(e));
        err.codigo = e && e.code;
        reject(err);
      },
      o
    );
  });
}

function consultarEstadoPermisoGeo() {
  if (!('permissions' in navigator) || !navigator.permissions.query) return Promise.resolve('prompt');
  return navigator.permissions.query({ name: 'geolocation' })
    .then(function (r) { return r.state; })
    .catch(function () { return 'prompt'; });
}

function clasificarPrecision(metros) {
  const n = Number(metros);
  if (!isFinite(n)) return { nivel: 'desconocida', etiqueta: 'Precisión desconocida', clase: 'manual' };
  if (n < 30) return { nivel: 'alta', etiqueta: 'Precisión GPS alta', clase: 'alta' };
  return { nivel: 'aproximada', etiqueta: 'Ubicación aproximada (Wi-Fi / IP)', clase: 'aproximada' };
}

if (typeof window !== 'undefined') {
  window.GeoHelper = {
    traducirErrorGeolocalizacion: traducirErrorGeolocalizacion,
    obtenerUbicacionActual: obtenerUbicacionActual,
    consultarEstadoPermisoGeo: consultarEstadoPermisoGeo,
    clasificarPrecision: clasificarPrecision
  };
}
