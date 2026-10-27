# Estado de entrega — 27/10/2026

**Aplicación operativa publicada; cierre de entrega pendiente de aceptación y recuperación de datos.**

URL de gestión: https://darling-smakager-792ffe.netlify.app

## Simplificación de uso — 27/10/2026

- Mensajes: preparar WhatsApp, lista para abrir y ajustes secundarios. Envío confirmado por persona; Instagram no se ofrece como canal conectado.
- Resumen sustituye Historial en la navegación; conserva cifras del mes, historial diario desplegable e informes/descarga en las rutas existentes.
- Gastos: Por pagar / Pagados / Todos; guía carga frente a pago, gastos fijos e historial separados. Los totales conservan su definición contable.
- Selección blanca y texto oscuro en pestañas, filtros y tipo de registro; guía de instalación y permisos de avisos en iPhone.
- Sin cambios de schema, importes históricos, credenciales o permisos. La recepción push con la app cerrada requiere aceptación en iPhone físico; la emulación solo comprueba las instrucciones y condiciones de instalación.

## Disponible

- Una base compartida en Supabase, accesible desde PC y celular. PWA instalable con logo e icono propios; requiere internet.
- Entrada del dueño con contraseña y cambio desde Ajustes; mínimo 8 caracteres. Registro público deshabilitado y sesiones anteriores revocadas al cambiar la clave.
- Clientes, teléfono, Instagram, cumpleaños, alta de hoy y carga histórica desde papel.
- Camarita en el formulario de alta/carga desde papel: propone datos para revisión sin crear registros hasta guardar. [Guía](REGISTRATION_PHOTO.md); falta muestra real anonimizada para calibrar escritura y probar en celular físico.
- Actividades y combinaciones, precios, ofertas, vigencia en meses o packs de clases, con importes históricos conservados.
- Cobros registrados manualmente en ARS, medios combinados, saldo parcial y deuda anterior visible al regresar.
- Baja/archivo y recuperación de perfiles; movimientos y caja por mes/día, pendientes mensuales, gastos y correcciones auditadas.
- Filtros de cumpleaños y elegibilidad del sorteo con estados de cuota. Reglas detalladas en PRODUCT.md.
- WhatsApp manual: selección de clientes, texto individual preparado, apertura de cada chat y confirmación humana en WhatsApp. Las marcas de revisión no acreditan entrega.
- Avisos al dueño: bandeja, filtros/marcas de revisión y Web Push con permiso de cada equipo; preferencias de cuotas/facturas, revisión horaria y resumen diario. Sin Meta. [Activación y límites](OWNER_NOTIFICATIONS.md).
- Factura por foto: lectura local de proveedor/servicio, número, importe y vencimiento; revisión obligatoria, descarte de foto y guardado de datos. Puede ajustar un gasto existente sin duplicarlo.

Las funciones enumeradas están implementadas y tienen pruebas locales con datos sintéticos; la aceptación comercial del comprador es un paso distinto.

## Comprobación del entorno real

- Netlify despliega `main` con el adaptador oficial de Next.js. La app utiliza Supabase de la organización Shelby Gym (`smgxymlfjcdxabgippby`).
- 19 migraciones y **28/28 tablas públicas con RLS**, verificado tras aplicar la actualización de avisos. Un dueño activo; registro público deshabilitado y mínimo de contraseña de 8. La identidad programadora carece de fila staff/acceso a gestión; claves sólo en configuración privada.
- En la consulta de esta revisión: **0 actividades, 0 clientes y 0 cobros**. No se cargaron datos ficticios en producción; falta incorporar el trabajo del gimnasio.
- La instalación y el acceso desde Android se observaron en el video del usuario. La fluidez de la nueva versión y los recorridos completos en dispositivos físicos todavía deben aceptarse.
- La API de backups devolvió **0 copias disponibles** y `pitr_enabled = false`. No hay una recuperación de datos de producción comprobada. Drive y GitHub contienen entregables/código, no una copia actual de la base.

## Para cerrar la entrega

1. **Asegurar los datos:** definir responsable, frecuencia y destino privado de las copias, y comprobar una restauración en un entorno separado. Conservar un procedimiento para recuperar el acceso si se olvida la clave.
2. **Cargar la operación real:** confirmar actividades, precios, packs, saldos y vencimientos desde papel; conciliar los totales iniciales con el dueño.
3. **Aceptar en equipos reales:** probar iPhone/Safari, Android/Chrome y PC. Recorrer alta, pagos, deuda, regreso, boleta, historial y WhatsApp manual. Comprobar foto real/revisión y notificación recibida con app cerrada tras activar permiso; reconexión y apertura desde icono.
4. **Entregar instrucciones y soporte:** acordar alcance, responsable de cuentas/backups, cobertura de mantenimiento y registro de aceptación. No compartir contraseñas por Git ni documentos públicos.

## Funciones que siguen pendientes

- WhatsApp automático y conexión oficial de Meta/estados de entrega. El programador Web Push para el dueño es independiente y está implementado; la recepción física necesita su permiso y aceptación.
- Conexión/bandeja de Instagram. Guardar el @ no conecta su API.
- Operaciones sin internet y aplicación nativa de tienda: la solución actual es una PWA.

Si los envíos automáticos o la bandeja de Instagram forman parte del alcance vendido, esa parte de la entrega sigue sin completar. El uso manual de WhatsApp funciona sin Cloud API; no se presenta como envío automático.

## Optimización de esta revisión

Ver [mediciones y límites](PERFORMANCE_2026-10-27.md). Se reducen lecturas innecesarias, viajes consecutivos a la base y tamaño del logo; se prepara navegación de forma limitada y sin caché persistente de fichas. Se mantienen Auth, RLS, revocación de sesiones y respuestas privadas `no-store`.
