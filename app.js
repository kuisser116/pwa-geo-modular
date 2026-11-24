'use strict';

const CLAVE = 'pwa-geo-aviso-aceptado';
const ZONAS = [
  { id: 'cuernavaca', nombre: 'Cuernavaca Centro, Morelos', lat: 18.9242, lon: -99.2216 },
  { id: 'emiliano', nombre: 'Emiliano Zapata (UTEZ), Morelos', lat: 18.8783, lon: -99.2277 },
  { id: 'cdmx', nombre: 'Ciudad de México, Zócalo', lat: 19.4326, lon: -99.1332 },
  { id: 'guadalajara', nombre: 'Guadalajara Centro, Jalisco', lat: 20.6597, lon: -103.3496 },
  { id: 'monterrey', nombre: 'Monterrey Centro, Nuevo León', lat: 25.6866, lon: -100.3161 },
  { id: 'puebla', nombre: 'Puebla Centro, Puebla', lat: 19.0414, lon: -98.2063 },
  { id: 'merida', nombre: 'Mérida Centro, Yucatán', lat: 20.9674, lon: -89.5926 }
];

function $(id) { return document.getElementById(id); }

function estado(msg, tipo) {
  const clase = tipo === 'activa' ? 'dot online' : tipo === 'error' ? 'dot offline' : 'dot';
  const b = $('badge-estado');
  if (b) { b.className = clase; b.title = msg; }
  const p = $('punto-estado');
  if (p) p.className = clase;
  const t = $('mensaje-estado');
  if (t) t.textContent = msg;
}

function hora(ts) {
  const d = new Date(ts);
  return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) +
    ':' + ('0' + d.getSeconds()).slice(-2);
}

function leer() {
  try { return localStorage.getItem(CLAVE) === '1'; } catch (e) { return false; }
}

function guardar() {
  try { localStorage.setItem(CLAVE, '1'); } catch (e) { /* modo privado */ }
}

function pintar(u, manual) {
  const k = manual ? { nivel: 'manual', etiqueta: 'Zona manual (referencia)', clase: 'manual' }
    : GeoHelper.clasificarPrecision(u.precisionMetros);
  const fuente = manual ? 'Zona manual' : (k.nivel === 'alta' ? 'GPS' : 'Wi-Fi / IP');

  $('valor-latitud').textContent = Number(u.latitud).toFixed(6);
  $('valor-longitud').textContent = Number(u.longitud).toFixed(6);
  $('valor-precision').textContent = (manual ? '≈ ' : '') + u.precisionMetros + ' m';
  $('valor-fuente').textContent = fuente;
  $('valor-hora').textContent = hora(u.timestamp);
  $('pastilla-precision').textContent = k.etiqueta;
  $('pastilla-precision').className = 'pastilla ' + k.clase;

  $('resultado').hidden = false;
  $('aviso-permiso').hidden = true;
  $('plan-b').hidden = true;
  estado('Ubicación lista: ' + k.etiqueta + '.', 'activa');
}

function aviso(mostrar) {
  $('aviso-permiso').hidden = !mostrar;
  $('plan-b').hidden = true;
  if (mostrar) $('btn-confirmar-permiso').focus();
}

function planB(msg, denegado) {
  $('aviso-permiso').hidden = true;
  $('plan-b-texto').textContent = msg + ' Puedes elegir una zona de referencia.';
  $('plan-b').hidden = false;
  $('nota-permiso').hidden = !denegado;
  $('select-zona').focus();
}

let ocupado = false;

function solicitar() {
  if (ocupado) return;
  ocupado = true;
  aviso(false);
  estado('Solicitando ubicación...', 'proceso');

  obtenerUbicacionActual({ enableHighAccuracy: true, timeout: 8000 })
    .then(function (u) { pintar(u, false); })
    .catch(function (e) { estado(e.message, 'error'); planB(e.message, e.codigo === 1); })
    .finally(function () { ocupado = false; });
}

function alPulsar() {
  estado('Consultando permiso...', 'proceso');
  consultarEstadoPermisoGeo()
    .then(function (p) {
      if (p === 'granted' || (p === 'prompt' && leer())) { solicitar(); return; }
      if (p === 'denied') {
        estado('Permiso de ubicación bloqueado.', 'error');
        planB('El permiso de ubicación está bloqueado.', true);
        return;
      }
      aviso(true);
    })
    .catch(function () { if (leer()) solicitar(); else aviso(true); });
}

function confirmar() { guardar(); aviso(false); solicitar(); }
function cancelar() { aviso(false); estado('No se solicitó la ubicación.', 'apagada'); }

function poblar() {
  ZONAS.forEach(function (z) {
    const o = document.createElement('option');
    o.value = z.id;
    o.textContent = z.nombre;
    $('select-zona').appendChild(o);
  });
}

function usarZona() {
  const z = ZONAS.filter(function (x) { return x.id === $('select-zona').value; })[0];
  if (!z) return;
  pintar({ latitud: z.lat, longitud: z.lon, precisionMetros: 5000, timestamp: Date.now() }, true);
}

function iniciar() {
  estado('Sin ubicación todavía.', 'apagada');
  poblar();

  $('btn-ubicacion').addEventListener('click', alPulsar);
  $('btn-zona-manual').addEventListener('click', function () {
    planB('Puedes usar una zona de referencia.', false);
  });
  $('btn-confirmar-permiso').addEventListener('click', confirmar);
  $('btn-cancelar-permiso').addEventListener('click', cancelar);
  $('btn-usar-zona').addEventListener('click', usarZona);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(function () {});
}

document.addEventListener('DOMContentLoaded', iniciar);
