# Avisos y facturas con foto — 27/10/2026

## Para el dueño

Abrir **Avisos** (campana de la cabecera). La bandeja reúne cuotas de clientes activos y facturas con saldo: próximas, de hoy y vencidas. Filtrar por tipo y revisión. **Marcar revisado no paga ni renueva**. Los pagos parciales actualizan el importe; al saldar, renovar o desactivar el perfil desaparece la situación anterior.

En **Preferencias de vencimiento** configurar anticipación, día del vencimiento, repetición posterior y hora argentina. Inicialmente: 3 días antes, ese día y cada día vencido, desde las 9. La bandeja funciona sin permiso de notificaciones.

Para avisos con la app cerrada: **Notificaciones con la app cerrada → Activar notificaciones**, aceptar el permiso y pulsar **Probar notificación**. En iPhone/iPad se necesita iOS/iPadOS 16.4 o posterior y abrir la app instalada desde su icono (Safari → Compartir → Añadir a pantalla de inicio). Repetir en cada equipo deseado. No requiere cuenta Apple Developer.

El programador revisa cada hora; envía como máximo un resumen diario por dispositivo, a partir de la hora elegida, si hay asuntos que corresponda avisar. El aviso previo no se repite para la misma situación. El sistema operativo puede demorar/silenciar avisos; la bandeja es la referencia actual y muestra la última revisión automática. Cerrar sesión/cambiar contraseña invalida la vinculación anterior; volver a entrar reactiva una suscripción existente y autorizada.

El texto de la pantalla bloqueada es genérico, sin nombres, saldos ni datos de factura. Al tocarlo abre `/avisos`, que exige sesión. WhatsApp sigue siendo individual y semiautomático: revisar destinatario/texto y confirmar envío en WhatsApp. No se usa Cloud API ni se generan cargos de Meta por estos avisos.

## Registrar una factura

1. **Resumen → Gastos → Nuevo gasto → Registrar una factura con foto**. También desde **Ajustar concepto o importe** de un gasto existente, para no duplicar la obligación recurrente.
2. Tomar/elegir foto. Se procesa en el dispositivo, con un modelo español descargado desde el mismo sitio. La primera lectura descarga recursos; no es instantánea ni infalible.
3. Revisar/corregir **proveedor o servicio, número de factura, importe total y vencimiento**. Importes/fechas ambiguos quedan para completar. No se infiere vencimiento desde emisión/CAE ni se convierten dólares/euros.
4. Confirmar revisión y pulsar **Usar estos datos y descartar foto**. Después **Registrar gasto** (o guardar ajuste). Registra la obligación, no su pago; éste se registra por separado.

La foto y texto OCR no se suben a servidores ni se guardan en Supabase, Cache Storage o IndexedDB. Se libera la vista previa al descartar/cambiar/cerrar. **No se puede borrar el original de la galería**. Sólo persisten campos revisados con validaciones existentes. Proveedor+número repetidos se rechazan para evitar duplicados. Máximo 12 MB y 24 megapíxeles; si el formato no se decodifica o es ilegible, usar carga manual.

## Operación técnica

- Migración `20261027125308_owner_notifications_and_invoice_data.sql`: campos de factura, preferencias/lecturas con RLS, vista de avisos y cola/dispositivos privados. No almacena imágenes. Retira reglas WhatsApp de boletas a dueños, conserva campañas manuales e historial previo.
- Función Netlify `owner-notifications`, cron `0 * * * *` UTC; reglas en Argentina. Hasta 8 dispositivos por ejecución, tiempos de red limitados y leases. Resultado incierto no se reintenta indiscriminadamente. 404/410 desactiva dispositivo; aceptación del proveedor no demuestra lectura.
- Auth exclusivo del programador: app metadata administrada `shelby_notification_worker=true`, **sin fila en staff**. Sólo reclama/confirma cola; no lee clientes, cuotas, pagos ni gastos. Sin service role en Netlify.
- Variables de servidor vacías en `.env.example`: identidad técnica y VAPID. Aprovisionar por canal privado, contexto Production. Netlify Free rechaza scopes granulares (HTTP 403); se usan los scopes estándar del plan, también disponibles al build, sin prefijo NEXT_PUBLIC ni inclusión en bundles cliente. Conservar claves VAPID: rotarlas exige renovar suscripciones. Nunca copiar credenciales de QA.
- DB comprueba sesiones vivas/rol actual; claves y endpoints privados vinculados a dueño/sesión. Proveedores HTTPS conocidos, sin destinos arbitrarios ni contenido libre enviado por el navegador.
- OCR generado antes de build/dev por `scripts/prepare-ocr-assets.mjs`, ignorado por Git y servido en `/ocr/` con licencias. Worker/WASM sólo al elegir foto. Un lector a la vez; cancelar termina worker y libera canvas/URL.
- Sin proveedor OCR de pago ni API Meta. Consume cuotas de Netlify, Supabase y transferencia; revisar planes, sin prometer uso ilimitado.

## Verificar y aceptar

`node scripts/test-owner-alerts.mjs` exige Supabase **local** y fixtures de `pnpm test:integration`. Prueba permisos, sesiones, idempotencia y cola sin enviar a teléfonos. `tests/e2e/owner-alerts.spec.ts` cubre bandeja, cinco anchos, axe, acceso de monitor y OCR real de comprobante sintético. No ejecutar fixtures en producción.

Aceptación física pendiente: permiso y aviso recibido con app cerrada en cada teléfono; tocar aviso sin sesión; foto real legible/borrosa; guardar/saldar y confirmar desaparición; frecuencia/hora acordadas. Chromium emulado no acredita iPhone físico.

Fuentes: [Netlify Scheduled Functions](https://docs.netlify.com/build/functions/scheduled-functions/), [Web Push en iOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [Tesseract.js](https://github.com/naptha/tesseract.js), [web-push](https://github.com/web-push-libs/web-push).
