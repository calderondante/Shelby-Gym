# Modelo de datos

## Ciclo de vida del cliente (2026-10-19)

- `customers.status`: `active`, `inactive` o `retired`. La expiración de una cuota no cambia este campo.
- `customers.status_changed_at` y `revision`: fecha del último cambio y control de edición concurrente.
- `customer_events`: registro de baja, retiro y reactivación, con actor y momento; solo se escribe mediante funciones autorizadas.
- `change_customer_status`: baja/recuperación reversible. Retirar requiere rol de dueño.
- `enroll_customer`: si el cliente regresa y se crea un período nuevo, lo reactiva en la misma transacción. Las suscripciones anteriores y sus saldos se mantienen.
- El historial diario se construye con la fecha de alta del perfil, períodos, abonos y eventos de estado. Cada suscripción conserva su precio original.

Estado: primera implementación para **un único gimnasio**, 2026-10-03. Migración inicial en `supabase/migrations/20261003204842_initial_gym.sql`. No hay multitenancy ni cuentas de clientes finales.

## Entidades y campos

| Entidad | Campos centrales | Propósito |
| --- | --- | --- |
| `staff` | id → auth.users, name, role owner/monitor, active | Identidad y autorización del personal; no usa metadata editable |
| `gym_settings` | singleton id, currency, time_zone | Moneda y fecha civil de operación confirmadas por el dueño |
| `activities` | name, description, price_cents, offer_price_cents, offer_label, duration_count/unit, active, revision | Plantillas de disciplinas o combinaciones; configuración comercial |
| `customers` | name, phone/email/notes opcionales, revision, created_by | Perfil operativo con datos mínimos |
| `subscriptions` | customer/activity FKs, snapshot de nombre/detalle/oferta/precio/moneda/duración, starts_on, ends_on, request_id/fingerprint, created_by | Un período contratado; sus condiciones no cambian al editar la plantilla |
| `payment_batches` | subscription FK, request_id, created_by, created_at | Una recepción de dinero e idempotencia de su registro |
| `payment_entries` | batch FK, method, amount_cents | Importe por efectivo/transferencia/Mercado Pago; varios medios en un abono |

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
