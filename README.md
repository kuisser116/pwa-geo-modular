# pwa-geo-modular

PWA con geolocalización consciente y un módulo reutilizable (`geo-helper.js`).

Materia: Desarrollo de Aplicaciones Web Progresivas (PWA)
Tema: 6.3 Geolocalización Consciente y Reutilizable.

## Restricciones que cumple

- JavaScript 100% vanilla, sin librerías.
- Sin async/await: `new Promise()` con `.then()`, `.catch()` y `.finally()`.
- Rutas relativas (`./`) para GitHub Pages.
- HTTPS mediante GitHub Pages.
- `./geo-helper.js` incluido en el precaché del Service Worker.

## Estructura

```
pwa-geo-modular/
├── index.html
├── styles.css
├── geo-helper.js   Módulo reutilizable de geolocalización
├── app.js          UI, pre-permiso y plan B
├── sw.js           App Shell en Cache First
├── manifest.json
└── icons/
    ├── icon.svg
    ├── icon-192.png
    └── icon-512.png
```

## API de geo-helper.js

- `obtenerUbicacionActual(opciones)` → Promesa con
  `{ latitud, longitud, precisionMetros, timestamp }`.
  Opciones por defecto: `enableHighAccuracy: true`, `timeout: 8000`,
  `maximumAge: 30000`.
- `consultarEstadoPermisoGeo()` → Promesa con `'granted'`, `'denied'` o
  `'prompt'`.
- `clasificarPrecision(metros)` → etiqueta y clase visual.
- `traducirErrorGeolocalizacion(error)` → mensaje legible para los códigos
  1, 2 y 3.

## Flujo de UX

1. El usuario pulsa "Adjuntar mi ubicación".
2. Se consulta el estado del permiso sin abrir el diálogo nativo.
3. Si ya está concedido, se lee la ubicación de inmediato.
4. Si está en `prompt`, aparece una tarjeta explicativa y el botón de
   confirmación dispara la lectura real.
5. Si está denegado o falla por TIMEOUT, se habilita el selector manual de
   zona y se explica cómo reactivar el permiso.
6. La lectura se clasifica: menos de 30 m es precisión GPS alta; el resto es
   ubicación aproximada por Wi-Fi o IP.

## Pruebas

1. Abrir la URL de GitHub Pages en la laptop y en el teléfono.
2. Comparar el valor de precisión en metros entre ambos equipos.
3. Verificar que la tarjeta de pre-permiso aparece antes del diálogo nativo.
4. Rechazar el permiso y comprobar que aparece el selector manual.
5. Elegir una zona y verificar que se muestra como referencia manual, no como
   lectura GPS.
