# Modelo de datos

## Ciclo de vida del cliente (2026-10-19)

- `customers.status`: `active`, `inactive` o `retired`. La expiración de una cuota no cambia este campo.
- `customers.status_changed_at` y `revision`: fecha del último cambio y control de edición concurrente.
- `customer_events`: registro de baja, retiro y reactivación, con actor y momento; solo se escribe mediante funciones autorizadas.
- `change_customer_status`: baja/recuperación reversible. Retirar requiere rol de dueño.
- `enroll_customer`: si el cliente regresa y se crea un período nuevo, lo reactiva en la misma transacción. Las suscripciones anteriores y sus saldos se mantienen.
- El historial mensual agrupa por fecha argentina las altas, períodos, abonos y eventos de estado. Los abonos importados usan `occurred_on` y los nuevos, `created_at` convertido al huso del gimnasio. Cada suscripción conserva su precio original.
- El total cobrado suma `payment_entries.amount_cents` del mes; la deuda pendiente actual suma los saldos de `subscription_balances` de todas las cuotas en la moneda del gimnasio. El pendiente mensual filtra esas cuotas por `starts_on` en el mes elegido. Ambos saldos son actuales, no una foto histórica del mes elegido.
- `customers.birth_month` guarda sólo el mes (1–12), con índice para consultar sorteos. `raffle_draws` fija de forma inmutable la fecha de cierre por año y mes; el dueño registra el cierre mediante RPC. La elegibilidad reconstruye alta, última vigencia iniciada hasta esa fecha y estado según `customer_events`. El día 31 tras vencer se excluye. La lista de participantes no es una instantánea almacenada.

Estado: primera implementación para **un único gimnasio**, 2026-10-03. Migración inicial en `supabase/migrations/20261003204842_initial_gym.sql`. No hay multitenancy ni cuentas de clientes finales.

## Entidades y campos

| Entidad           | Campos centrales                                                                                                                        | Propósito                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `staff`           | id → auth.users, name, role owner/monitor, active                                                                                       | Identidad y autorización del personal; no usa metadata editable            |
| `gym_settings`    | singleton id, currency, time_zone                                                                                                       | Moneda y fecha civil de operación confirmadas por el dueño                 |
| `activities`      | name, description, price_cents, offer_price_cents, offer_label, duration_count/unit, active, revision                                   | Plantillas de disciplinas o combinaciones; configuración comercial         |
| `customers`       | name, phone/email/notes opcionales, revision, created_by                                                                                | Perfil operativo con datos mínimos                                         |
| `subscriptions`   | customer/activity FKs, snapshot de nombre/detalle/oferta/precio/moneda/duración, starts_on, ends_on, request_id/fingerprint, created_by | Un período contratado; sus condiciones no cambian al editar la plantilla   |
| `payment_batches` | subscription FK, request_id, created_by, created_at                                                                                     | Una recepción de dinero e idempotencia de su registro                      |
| `payment_entries` | batch FK, method, amount_cents                                                                                                          | Importe por efectivo/transferencia/Mercado Pago; varios medios en un abono |

UUID como claves. Importes enteros en centavos, rango positivo acotado; nunca float. Instantes `timestamptz` y fechas civiles `date`. No se guardan tarjetas, CBU, comprobantes, datos médicos ni claves del cliente. Las notas advierten evitar información sensible.

## Relaciones e integridad

Cliente 1:N períodos; actividad 1:N períodos; período 1:N abonos; abono 1:N medios. Todas son FKs reales con borrado restringido. Personal vinculado a todas las escrituras con responsable. No se eliminan ni reescriben movimientos financieros desde esta versión.

- `total_cents > 0`; oferta menor que precio habitual y con etiqueta; duración 1–365 días o 1–24 meses.
- Vencimiento posterior al inicio. Inicio en la fecha del primer abono según zona del gimnasio; fin exclusivo a las 00:00 de la fecha mostrada. Mes calendario ajustado al último día disponible, documentado como criterio inicial a validar.
- Todo período nace con un abono positivo. Un pago parcial activa el período; completar saldo no cambia las fechas.
- Medios conocidos, importes positivos y una línea por medio en cada abono.
- Suma pagada ≤ cuota: comprobada dentro de RPC con bloqueo de la fila de suscripción. Dos monitores no pueden exceder juntos el saldo.
- Idempotencia: UUID de operación + responsable + contenido. Reintento idéntico devuelve el mismo resultado; mismo UUID con otros datos falla.
- Alta de perfil, período y abono en una transacción. Si el pago falla, no queda un perfil huérfano.
- La UI envía precio/revisión/fecha que mostró; el servidor DB reconsulta y rechaza condiciones desactualizadas.
- No se inicia otro período de la misma plantilla mientras siga vigente. Renovación vencida empieza con el abono de hoy; deuda anterior permanece. Renovación anticipada, pausas, cambios de actividad, anulación/corrección y reembolsos requieren reglas adicionales.
- Ediciones de clientes/actividades usan `revision` para detectar conflicto. Cambio de moneda bloqueado cuando existen períodos; requiere un workflow de conversión separado.

## Vistas y consultas

`subscription_balances` calcula abonado y saldo desde el ledger. `customer_overview` calcula saldo total (incluye deuda vencida), última fecha, actividades y existencia de período vigente. Ambas usan `security_invoker=true`; no saltan RLS.

Clientes tiene búsqueda por nombre, filtros de saldo y paginación de 30 filas. Índices en FK, cliente/fecha de período, nombre/id y abonos por período. Revisar planes de consultas y búsqueda con el volumen real; no agregar índices de texto por anticipado.

## RLS, grants y funciones

Todas las tablas públicas tienen RLS. Personal activo puede leer datos operativos; anónimo y usuario Auth sin `staff` activo no pueden. La verificación lee el rol vigente en DB, no una copia en el JWT.

No se otorga escritura directa a `authenticated`. Las únicas mutaciones son RPC con controles explícitos de rol y `search_path=''`. `configure_gym`/`save_activity` requieren dueño; `enroll_customer`/`record_payment`/`update_customer` admiten personal activo. Helpers en schema `private` fuera de la API; solo el chequeo de rol es ejecutable para evaluar policies. Auth administrativo se limita a un script server-only con service role.

## Migraciones y recuperación

Workflow imperativo, creado con CLI. Reconstruir solo una base local desechable. Aplicar a remoto exige identificar entorno, permisos, respaldo y aprobación correspondiente. Tipos generados por CLI en `src/lib/supabase/database.types.ts`; wrapper `database.ts` expresa dos argumentos RPC anulables que el generador no infiere.

Antes de producción: definir retención de clientes/ledger, corrección auditada de abonos, quién puede operar datos sensibles, estrategia de backup/RPO/RTO y restauración. No tratar la copia del repositorio en Drive como backup de datos.

## Importación histórica y edad — 2026-10-04

Ampliación solicitada: clientes con edad, múltiples actividades y pagos anteriores, preservando precios de cada momento. Las reglas de alta normal siguen vigentes; importar es una operación separada del dueño que permite períodos anteriores y perfiles sin primera cuota.

- `customers.age_years / age_as_of`: edad conocida y fecha de referencia, ambas nulas o ambas informadas. No se calcula una fecha de nacimiento ficticia. El perfil muestra explícitamente «edad registrada».
- `import_batches`: origen, UUID de operación, fingerprints, resultado, responsable e instante de importación. `import_customers`: origen + ID externo único → cliente/lote, fingerprints de perfil e historia.
- `subscriptions.opening_paid_cents / import_batch_id`: crédito previo sin detalle, respaldado por procedencia; suma en `subscription_balances` y en el límite de `apply_payment`. No crea movimientos de caja ficticios.
- `payment_batches.occurred_on / import_batch_id`: fecha civil real del pago anterior y procedencia. `created_at` conserva el instante en que se importó; no se falsifica como fecha de cobro. La UI distingue ambos contextos.
- `import_gym_history`: preview/confirmación comparten validación. Solo dueño. Transacción, locks, moneda contrastada, lotes acotados, idempotencia y prevención conservadora de duplicados. El antiguo helper de perfiles está en `private`, fuera de la API y sin EXECUTE para usuarios.
- Períodos importados conservan fechas y cuota histórica; su duración almacenada es la diferencia exacta en días, sin reinterpretarla con la plantilla de hoy. Su vigencia usa las mismas reglas de fecha civil que las demás cuotas.

La vista previa no escribe; confirmar revalida todo. Las importaciones no actualizan ni fusionan personas existentes. Ver [IMPORTS](IMPORTS.md) para límites y formato. Migraciones del 2026-10-04 son aditivas y se verificaron también sobre una DB temporal aislada; no se reseteó la DB activa.

## Ampliación aprobada — 2026-10-20

- `customers`: `instagram` opcional con formato limitado y `marketing_opt_in` desactivado por defecto.
- `activities`: duración `months`, `days` o `sessions`. Las contrataciones guardan su cantidad y precio histórico; solo `sessions` admite `ends_on=null`.
- `session_events`: consume una clase o revierte un consumo mediante referencia única y motivo. La RPC bloquea el pack, valida disponibilidad, estado del perfil y confirmación de deuda. La corrección se reserva al dueño.
- `expense_templates`: concepto, categoría, importe sugerido, día de vencimiento, actividad y revisión.
- `expenses`: obligación con importe acordado, vencimiento, nota, pagos y vínculo opcional a plantilla/mes, único por esa combinación.
- `expense_payments`: lotes inmutables por medio, con operación única y referencia de reversión. La reversión conserva importe/medios y lleva fecha actual y motivo.
- `monthly_closings`: mes único, responsable, fecha/hora y copia de cobros, gastos y deuda calculada al final del mes. No se sobrescribe.
- `raffle_draws` y `raffle_entries`: corte temporal y copia de personas/motivos para sorteos nuevos. Los antiguos quedan marcados sin copia.
- `campaigns` y `campaign_recipients`: borradores y destinatarios revisados en servidor; sin envíos ni cobros automáticos.

Todas las tablas expuestas tienen RLS y carecen de escritura directa para clientes autenticados. Los movimientos de dinero y clases se ejecutan mediante RPCs con permisos explícitos e idempotencia. La moneda queda bloqueada tras registrar cuotas o gastos.

## Comunicaciones — 2026-10-25

- `customers.instagram_marketing_opt_in`: autorización independiente de WhatsApp, false por defecto; incluida en `customer_overview`, alta y edición.
- `communication_settings`: singleton, nombre del gimnasio, número internacional e IG opcionales, revisión optimista; **no** claves ni estado conectado.
- `communication_templates`: canal, uso general/recovery/expense, título, cuerpo, revisión. Boletas solo WhatsApp. Variables admitidas según uso; snapshots no cambian al editar.
- `communication_owner_contacts`: nombre, celular internacional único, activo, revisión y autor.
- `communication_rules`: recovery/expense, habilitación de preparación, plantilla FK, canal, hora, audiencia, oferta; plazos antes/al vencer/repetición y solo recurrentes para gastos.
- `communication_rule_customers`: relación FK de regla con clientes elegidos.
- `communication_outbox`: FK campaña/cliente o dueño/boleta, plantilla, destino y mensaje snapshots, origen, fecha prevista UTC, dedup_key único, prepared/cancelled, autor y timestamps. Índices de estado/fecha y FKs; no sent/delivered.
- `campaigns`: extiende borradores existentes con canal, segmento, plantilla FK, fecha prevista, oferta y fingerprint de preparación. No elimina datos anteriores.

RLS owner-only y grants mínimos. RPC con validación y autorización independiente, optimistic locking y transacción por lote. Idempotencia de campaña; dedup por cliente/vencimiento/canal y boleta/dueño/día. No hay multiempresa ni migración de datos reales. Las dos migraciones nuevas fueron reconstruidas junto al historial completo en una base local descartable; probar backup/restauración antes de migrar producción.

## Registro manual histórico — migración 20261026170933

`paper_enrollments` enlaza request UUID, cliente, suscripción y lote de procedencia; conserva huella del payload y staff creador. Suscripción y lote son únicos; las referencias son FKs e incluyen índices para cliente y actor. La huella impide reutilizar un request con otros datos. `subscriptions.opening_sessions_used` es entero no negativo, solo aplicable a packs históricos y limitado a la cantidad contratada; se descuenta en `subscription_balances.sessions_remaining`.

`opening_paid_cents` conserva el total abonado menos los pagos históricos efectivamente documentados. Estos últimos llevan `occurred_on` real y desglose por medios. No se modifica `customers.created_at` ni se inventan asistencias. Fechas civiles en zona del gimnasio, importes enteros en centavos y meses cerrados protegidos. Ver [semántica operativa](PAPER_REGISTRATION.md).
