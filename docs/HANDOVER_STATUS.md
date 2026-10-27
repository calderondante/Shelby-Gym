# Estado de entrega — 27/10/2026

**Aplicación operativa publicada; cierre de entrega pendiente de aceptación y recuperación de datos.**

URL de gestión: https://darling-smakager-792ffe.netlify.app

## Disponible

- Una base compartida en Supabase, accesible desde PC y celular. PWA instalable con logo e icono propios; requiere internet.
- Entrada del dueño con contraseña y cambio desde Ajustes; mínimo 8 caracteres. Registro público deshabilitado y sesiones anteriores revocadas al cambiar la clave.
- Clientes, teléfono, Instagram, cumpleaños, alta de hoy y carga histórica desde papel.
- Actividades y combinaciones, precios, ofertas, vigencia en meses o packs de clases, con importes históricos conservados.
- Cobros registrados manualmente en ARS, medios combinados, saldo parcial y deuda anterior visible al regresar.
- Baja/archivo y recuperación de perfiles; movimientos y caja por mes/día, pendientes mensuales, gastos y correcciones auditadas.
- Filtros de cumpleaños y elegibilidad del sorteo con estados de cuota. Reglas detalladas en PRODUCT.md.
- WhatsApp manual: selección de clientes, texto individual preparado, apertura de cada chat y confirmación humana en WhatsApp. Las marcas de revisión no acreditan entrega.

Las funciones enumeradas están implementadas y tienen pruebas locales con datos sintéticos; la aceptación comercial del comprador es un paso distinto.

## Comprobación del entorno real

- Netlify despliega `main` con el adaptador oficial de Next.js. La app utiliza Supabase de la organización Shelby Gym (`smgxymlfjcdxabgippby`).
- 18 migraciones y **26/26 tablas públicas con RLS**. Un dueño activo; registro público deshabilitado y mínimo de contraseña de 8 verificado por lectura de configuración.
- En la consulta de esta revisión: **0 actividades, 0 clientes y 0 cobros**. No se cargaron datos ficticios en producción; falta incorporar el trabajo del gimnasio.
- La instalación y el acceso desde Android se observaron en el video del usuario. La fluidez de la nueva versión y los recorridos completos en dispositivos físicos todavía deben aceptarse.
- La API de backups devolvió **0 copias disponibles** y `pitr_enabled = false`. No hay una recuperación de datos de producción comprobada. Drive y GitHub contienen entregables/código, no una copia actual de la base.

## Para cerrar la entrega

1. **Asegurar los datos:** definir responsable, frecuencia y destino privado de las copias, y comprobar una restauración en un entorno separado. Conservar un procedimiento para recuperar el acceso si se olvida la clave.
2. **Cargar la operación real:** confirmar actividades, precios, packs, saldos y vencimientos desde papel; conciliar los totales iniciales con el dueño.
3. **Aceptar en equipos reales:** probar iPhone/Safari, Android/Chrome y PC. Recorrer alta, pago completo/mixto/parcial, deuda anterior, vencido, regreso, boleta, historial y WhatsApp manual. Comprobar reconexión y nueva apertura desde el icono.
4. **Entregar instrucciones y soporte:** acordar alcance, responsable de cuentas/backups, cobertura de mantenimiento y registro de aceptación. No compartir contraseñas por Git ni documentos públicos.

## Funciones que siguen pendientes

- WhatsApp automático, programador de avisos, estados de entrega y conexión oficial de Meta.
- Conexión/bandeja de Instagram. Guardar el @ no conecta su API.
- Operaciones sin internet y aplicación nativa de tienda: la solución actual es una PWA.

Si los envíos automáticos o la bandeja de Instagram forman parte del alcance vendido, esa parte de la entrega sigue sin completar. El uso manual de WhatsApp funciona sin Cloud API; no se presenta como envío automático.

## Optimización de esta revisión

Ver [mediciones y límites](PERFORMANCE_2026-10-27.md). Se reducen lecturas innecesarias, viajes consecutivos a la base y tamaño del logo; se prepara navegación de forma limitada y sin caché persistente de fichas. Se mantienen Auth, RLS, revocación de sesiones y respuestas privadas `no-store`.
