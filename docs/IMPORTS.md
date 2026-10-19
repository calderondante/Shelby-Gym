# Importar un gimnasio desde Excel

Implementado el 2026-10-04 por solicitud del usuario. Entrada: **Clientes → Importar Excel**, disponible solo para el dueño. Permite traer perfiles, edad, varias actividades/períodos, precios históricos, pagos anteriores y saldo pendiente. La app sigue usando ARS y horario de Argentina.

## Preparar el archivo

1. Usar `.xlsx`. Para un `.xls` o CSV, abrirlo en Excel/LibreOffice y guardar una copia `.xlsx`.
2. La primera fila contiene encabezados; cada fila siguiente representa un cliente sin cuota, una cuota sin detalle de pagos o una línea de un pago. Sin celdas combinadas, subtotales ni títulos antes de los encabezados.
3. Se puede descargar una plantilla vacía desde la app. También se pueden relacionar las columnas de una planilla propia; no hace falta que tengan nuestros nombres.
4. Seleccionar una hoja. Si el historial está separado en varias hojas/archivos, reunirlo por cliente antes de importar: esta versión no hace cruces automáticos entre hojas.
5. Conservar IDs estables del sistema anterior. Si no existen, agregar una columna de IDs únicos y guardarla en la planilla. No usar números de fila cambiantes. Guardar IDs/teléfonos como texto para conservar ceros iniciales.
6. Sustituir las fórmulas por sus valores en una copia. El importador las rechaza, no ejecuta ni confía en cálculos guardados. No admite macros, archivos cifrados ni vínculos externos.

No subir archivos reales al repositorio o a Drive para probar. El Excel se procesa en un worker del navegador, no se almacena en el servidor. Al pulsar **Revisar importación** se envían únicamente los campos seleccionados al servidor autorizado para validar. Al salir/recargar se pierde la preparación no guardada; no hay caché local de estos datos.

## Columnas

| Campo | Requisito | Cómo se interpreta |
| --- | --- | --- |
| ID de cliente | Obligatorio | Une todas las filas de una misma persona; junto con el origen evita reimportaciones |
| Nombre y apellido | Obligatorio | Debe coincidir en las filas del mismo ID |
| Edad | Opcional | Entero de 0 a 120. Se guarda la fecha seleccionada en «Edad referida al». No inferimos nacimiento ni actualizamos años automáticamente |
| Teléfono / Correo | Opcionales | Si se repite el cliente, conservar los mismos valores en todas sus filas |
| ID de cuota | Si hay actividad | Identifica un período dentro del cliente; mantenerlo al repetir sus pagos |
| Actividad | Si hay cuota | Se relaciona con una plantilla existente. Crear la plantilla si falta; el precio actual no se aplica retroactivamente |
| Inicio / Vencimiento | Si hay cuota | Fechas originales. Admitimos fechas reales de Excel, DD/MM/AAAA o AAAA-MM-DD; no números de serie sin formato de fecha |
| Cuota histórica | Si hay cuota | Importe total de ese período en ARS, aunque hoy la actividad cueste más |
| Saldo pendiente | Si hay cuota | Importe que todavía falta pagar. **0 significa pagado; vacío no se interpreta como 0** |
| ID de pago / Fecha del pago | Si hay detalle de pago | Identifican una recepción real de dinero dentro de la cuota; no se inventa la hora |
| Medio de pago / Importe del pago | Si hay detalle de pago | Efectivo, transferencia o Mercado Pago. Importe positivo |

Importes como celdas numéricas o texto argentino `25.000,50`; no usar formatos ambiguos con miles anglosajones. La UI muestra la moneda antes de confirmar. El límite actual por cuota es ARS 1.000.000, compartido con el modelo existente.

### Varias cuotas y pagos mixtos

Repetir el ID de cliente para distintas cuotas, con IDs de cuota diferentes. Repetir el ID de cuota para sus pagos. Si un pago se dividió entre efectivo y transferencia, usar dos filas con el mismo ID de pago y fecha, un medio distinto en cada fila. Repetir un mismo medio bajo ese ID se considera posible duplicación y se rechaza.

Todos los datos de perfil y condiciones de cuota deben coincidir cuando se repiten. No se suman dos cuotas porque tengan el mismo nombre de actividad; se distinguen por ID de cuota.

### Inflación y datos incompletos

Cada período conserva el monto del Excel. No recalculamos desde la tarifa actual ni aplicamos un índice de inflación.

`Abonado previo = cuota histórica − saldo pendiente`.

Si los pagos detallados suman menos que el abonado previo, la diferencia se guarda como **saldo de apertura abonado sin detalle**, con procedencia de importación. No se inventa efectivo, Mercado Pago, transferencia ni fecha de cobro. Si los pagos suman más que el abonado previo, se bloquea la importación para corregir la inconsistencia.

Los cobros posteriores se agregan al ledger normal y no pueden superar el saldo, incluido el crédito de apertura. No alteran inicio ni vencimiento.

## Revisión y confirmación

- Primero se valida en el navegador y luego en DB: permisos, campos, actividades, fechas, importes, duplicados y configuración de moneda.
- No se guarda ninguna fila durante la vista previa. Las observaciones indican la fila del Excel.
- El resumen muestra cantidades, deuda del archivo, apertura sin detalle y vista paginada de todos los clientes. Se puede abrir el detalle de pagos de cada cuota.
- El dueño confirma expresamente. Se vuelve a validar dentro de una transacción: todo el lote se guarda o no se guarda ninguna fila.
- Un reintento con el mismo UUID no duplica. Reimportar con el mismo origen/ID e historial idéntico se omite, incluso con filas reordenadas; no pisa abonos registrados después en Shelby.
- Un ID ya importado con otro historial se bloquea. Coincidencias por nombre, teléfono o correo también requieren revisión; no se fusionan personas automáticamente. Los homónimos/contactos compartidos deben resolverse fuera del lote por el operador antes de continuar.

**Alcance:** incorporación inicial de clientes nuevos. No agrega historia a un cliente existente ni actualiza importaciones anteriores. Reunir la historia completa de cada cliente antes de migrar; dividir lotes por clientes completos. La corrección/anulación auditada posterior continúa pendiente: esta pantalla no borra ni sobrescribe datos.

## Límites y seguridad

2 MB comprimidos; 12 MB declarados descomprimidos; 200 entradas ZIP; 10 hojas; hasta 1.000 filas de datos y 50 columnas por hoja; 500 clientes / 500 cuotas / 1.000 pagos por operación y payload de 700 KB. Timeout de lectura de 15 s, con terminación del worker. Estas cotas mantienen la operación pequeña y controlable; los datos no válidos no se truncan para importar silenciosamente.

Lectura y descarga de plantilla usan `read-excel-file` 9.3.10 y `fflate` 0.8.3 (MIT), versiones fijadas. El parser se empaqueta en un worker cargado solo al elegir archivo; la plantilla se carga bajo demanda. No se incorporaron SheetJS/XLSX obsoleto, ExcelJS, servicios externos ni un framework de animación.

RPC de importación solo para dueño, sin service role. RLS y grants niegan escritura directa. `import_batches` e `import_customers` preservan actor, origen, identificación e idempotencia; su lectura es exclusiva del dueño. Perfiles, períodos y pagos quedan disponibles al personal según los permisos operativos existentes.

## Pruebas

`pnpm test:import` necesita Supabase local y las cuentas sintéticas creadas por `pnpm test:integration`. Comprueba precios históricos, edad, detalle mixto, saldo de apertura, bloqueo de sobrepago, fechas inalteradas, preview sin escrituras, rollback, permisos, concurrencia, reintentos, reordenación y duplicados. `tests/import.test.ts` verifica normalización/agrupación y que la plantilla sea un XLSX válido. `tests/e2e/import.spec.ts` verifica el recorrido real con archivos generados de QA, accesibilidad, responsive, archivo corrupto y preferencias de movimiento.
