# Carga inicial desde papel

Actualización del 26/10/2026. El gimnasio lleva principalmente registros en papel: no hace falta preparar un Excel. La importación existente sigue disponible como alternativa.

27/10/2026: la [camarita del formulario](REGISTRATION_PHOTO.md) permite proponer datos desde una ficha individual sin nuevas pestañas. Revisión obligatoria y campos históricos seleccionados/confirmados aparte; conserva la carga manual y reglas de caja.

## Uso por el dueño

1. Crear las actividades que figuran en el cuaderno. Si un pack antiguo tenía otra cantidad de clases, usar una plantilla con esa cantidad; también se pueden elegir actividades inactivas al cargar historia.
2. Abrir **Nuevo cliente → Cargar desde papel** y completar sus datos de contacto, Instagram y mes de cumpleaños cuando se conozcan.
3. Elegir actividad e indicar el **inicio anterior**. Para cuotas por tiempo, revisar el vencimiento sugerido y corregirlo según el papel: puede haber vencido o seguir vigente. Para packs, indicar las clases ya usadas.
4. Escribir el **importe originalmente pactado**, sin reemplazarlo por el precio actual, y el total que ya había abonado. Se admite cero y se calcula el saldo pendiente.
5. Solo si se conocen, añadir pagos anteriores con fecha real e importes por efectivo, transferencia o Mercado Pago. Se pueden combinar medios. El detalle no puede superar el total abonado.
6. Guardar y comprobar el perfil, sus fechas, estado y saldo. Un pago que se recibe hoy se registra después con **Registrar abono**.

## Qué significa cada dato

- El inicio y vencimiento describen el período anterior. **La fecha de creación del perfil sigue siendo la fecha real de carga**; no se falsifican antigüedad ni participaciones de sorteos cerrados.
- Lo abonado sin detalle queda como crédito de apertura aplicado a esa cuota. No se inventa fecha, medio ni ingreso en la caja de hoy.
- Un pago histórico detallado aparece en la fecha indicada. No se vuelve a contar como dinero recibido al cargar el cliente.
- Las clases usadas previamente reducen las disponibles, sin inventar eventos de asistencia con fechas desconocidas.
- Una cuota vencida no se renueva al cargarla ni al completar una deuda. Si el cliente vuelve, se inicia un período nuevo desde el regreso y se conserva la deuda anterior.
- Los meses cerrados se respetan: no se puede introducir un inicio o pago que cambie un cierre existente. Revisar los registros antes de cerrar meses.
- Este modo es exclusivo del dueño. El alta normal del día y los permisos del monitor no cambian.

## Guardado y despliegue

En la aplicación Next, el guardado es atómico en Supabase, con autorización, validación y protección frente a reintentos. Debe aplicarse `20261026170933_paper_registration.sql` junto con las migraciones previas antes de usarlo en remoto. No se aplicó esa migración al proyecto remoto nuevo desde esta sesión.

Importar el repositorio en Netlify ahora es compatible con futuras actualizaciones de `main`. Volver a desplegar el código no borra registros de Supabase ni exige importar de nuevo el sitio. La demo de GitHub Pages conserva datos únicamente en el navegador y no sustituye la base real.

Ver [conexión Netlify y Supabase](NETLIFY_SUPABASE.md).

## Verificación

`pnpm test:paper` usa exclusivamente Supabase local con datos sintéticos; comprueba saldos, pagos históricos/mixtos, idempotencia, rollback, clases usadas, permisos y meses cerrados. `pnpm test:pages:paper` verifica la demo en contexto aislado. Los E2E están en `tests/e2e/paper-registration.spec.ts`.
