# Instalar Shelby Gym

La app de gestión puede abrirse desde un icono en una ventana propia, sin barra de direcciones. Usa el mismo alojamiento y la misma base de datos; instalarla no copia ni separa los clientes. No requiere tienda de aplicaciones ni una cuenta adicional. La contraseña sigue siendo necesaria y los datos necesitan internet.

URL oficial: https://darling-smakager-792ffe.netlify.app

## Android

1. Abrir el enlace en Chrome, fuera del navegador interno de WhatsApp/Instagram.
2. En el acceso o en Ajustes, desplegar **Instalar Shelby Gym**. Si el navegador ofrece el botón **Instalar en este dispositivo**, pulsarlo y aceptar.
3. Si no aparece, usar el menú ⋮ de Chrome → **Instalar app** o **Añadir a pantalla de inicio** y confirmar. La etiqueta depende de la versión.
4. Abrir desde el icono Shelby Gym. Se conserva la protección de acceso.

## iPhone / iPad

1. Abrir el enlace en Safari.
2. Pulsar **Compartir → Añadir a pantalla de inicio**.
3. Si aparece la opción **Abrir como app web**, dejarla activada y confirmar **Añadir**.
4. Abrir desde el nuevo icono. Puede pedir iniciar sesión la primera vez: la sesión del navegador no siempre se comparte con la app instalada.

Safari no permite que el sitio instale la app por sí solo. Estos pasos se realizan una vez por dispositivo.

## PC

En Chrome o Edge, utilizar el icono de instalación de la barra de direcciones o la opción de instalar la página como aplicación del menú. Se abre en una ventana propia. Otros navegadores pueden ofrecer opciones diferentes.

## Actualizaciones, conexión y privacidad

- Se sigue usando la misma URL. Las actualizaciones del sitio llegan al volver a abrir o recargar la app; no hace falta reinstalar por cada cambio.
- `/sw.js` declara `no-store` y alcance raíz tanto en Next como en `netlify.toml`: los archivos públicos servidos por la CDN no heredan los headers del servidor Next.
- No se registran pagos ni otras operaciones sin conexión. La pantalla de desconexión permite volver a intentar, sin afirmar que una operación se guardó.
- El worker no almacena clientes, historiales, respuestas de Auth ni sesiones en una caché offline. Mantener los controles `no-store` y revisar este límite antes de ampliar funcionalidades.
- Instalar no pide permisos ni activa mensajes por sí solo. El dueño puede activar voluntariamente Web Push desde **Avisos**, también con la app cerrada; ver [guía](OWNER_NOTIFICATIONS.md). No activa WhatsApp automático.
- El icono conserva el logo del perro provisto por el usuario. Sus tamaños normal, Apple y maskable son derivados para empaquetado del mismo recurso, sin rediseño de marca.

## Verificación

Los tests de navegador validan manifest público, tamaños PNG, metadatos Apple, instrucciones, entrega de la invitación de instalación, opción de posponer y pantalla de desconexión sin caché de fichas. La confirmación nativa del sistema se verifica en los teléfonos físicos del comprador; una invitación simulada no acredita instalación real de Android/iOS.

Fuentes: [guía de PWA de Next.js](https://nextjs.org/docs/app/guides/progressive-web-apps) y documentación local de la versión instalada en `node_modules/next/dist/docs/`.
