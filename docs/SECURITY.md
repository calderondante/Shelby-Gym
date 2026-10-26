# Seguridad de Shelby Gym

Primera implementación local, 2026-10-03. Datos de QA sintéticos. No se ha configurado producción, SMTP externo, cobros online ni acceso público al gimnasio.

## Threat model

| Amenaza                                              | Control implementado                                                                              | Evidencia o pendiente                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Acceso anónimo o Auth sin habilitación               | Signup público desactivado, staff activo, RLS y grants mínimos                                    | Pruebas negativas de integración                        |
| Monitor cambia tarifas/eleva rol                     | Solo dueño en acciones y RPC; sin escritura directa de staff                                      | Pruebas REST/RPC y ruta directa                         |
| JWT con permisos desactualizados                     | Rol/active consultados en DB; no user_metadata                                                    | Prueba con token emitido antes de revocar staff         |
| IDOR desde UUID manipulado                           | Autorización en cada frontera; todo el personal activo ve el gimnasio único                       | No existe aislamiento por cliente final ni multitenancy |
| Duplicación/sobrepago por doble envío o concurrencia | Idempotencia, transacción y bloqueo por suscripción                                               | Reintento y dos pagos simultáneos probados              |
| Cambio de condiciones durante alta                   | Comparar precio, revisión y fecha mostrados antes de guardar                                      | Pruebas de conflicto y snapshot histórico               |
| XSS/clickjacking/CSRF                                | Escape React, sin HTML dinámico; CSP con nonce; frame-ancestors none; comprobación Origin de Next | Verificar navegador y headers al desplegar              |
| Filtración por caché/sesión                          | SSR por request, no-store; sin PWA offline ni caché compartida                                    | No agregar caché privada sin demostrar aislamiento      |
| Exposición de service role                           | Fuera del runtime; solo scripts técnicos                                                          | Revisión de imports y secretos excluidos de Git/Drive   |
| Pérdida de datos                                     | Historial inmutable desde app; migraciones                                                        | Backup remoto/RPO/RTO y restauración pendientes         |

## Roles y permisos

| Operación                                      | Dueño                  | Monitor | Auth sin staff/anónimo |
| ---------------------------------------------- | ---------------------- | ------- | ---------------------- |
| Consultar clientes, cuotas y abonos            | Sí                     | Sí      | No                     |
| Alta/edición de perfil e inicio de período     | Sí                     | Sí      | No                     |
| Registrar abono recibido                       | Sí                     | Sí      | No                     |
| Crear/editar/desactivar plantillas comerciales | Sí                     | No      | No                     |
| Configurar moneda/zona                         | Sí                     | No      | No                     |
| Consultar participantes/exclusiones del sorteo | Sí                     | Sí      | No                     |
| Registrar fecha del sorteo                     | Sí                     | No      | No                     |
| Cambiar staff/roles                            | Solo provisión técnica | No      | No                     |
| Reescribir/borrar abonos                       | No implementado        | No      | No                     |

Alta/edición de clientes por monitor es el alcance operativo inicial documentado; confirmar con el dueño antes de producción. Cliente final es un registro, no una cuenta Auth. El gimnasio usa un deployment/base independiente.

## RLS y RPC

RLS en todas las tablas públicas, incluida `raffle_draws`. Acceso de lectura limitado a staff activo; vistas `security_invoker`. Sin INSERT/UPDATE/DELETE directo para usuarios normales. RPC de mutación `security definer` con `search_path=''`, rol explícito en cada entrada, objetos cualificados y validación/constraints. Helpers privados no expuestos a la Data API. Grants de funciones revocados para PUBLIC/anon y otorgados a authenticated solo en entrypoints intencionales. Ver DATA_MODEL y migraciones.

Service role aprovisiona cuentas y staff desde una herramienta server-only. Nunca la usar para consultas de la app ni como variable NEXT_PUBLIC. Revocar personal con `staff.active=false` corta acceso DB con el token anterior. Cerrar sesión elimina la sesión local; un access token robado puede seguir existiendo hasta expirar, por lo que una baja de personal también debe desactivar staff y revocar sesiones.

## Secrets y entornos

`.env.local` contiene configuración local y claves de prueba; `.env.test.local` contiene accesos aleatorios de QA. Ambos están ignorados. `.env.example` tiene valores vacíos. No subir estos archivos, `.next`, reportes/traces, `.git` o datos de Supabase a Drive. La copia de fuente usa selección explícita de archivos.

No se crearon credenciales de servicios externos. Las claves locales de Supabase y usuarios de QA son solo para esta base desechable, no se reutilizan en staging/producción. No imprimir `supabase status` sin filtrarlo: su salida incluye claves. Los logs de arranque pueden incluir ese mismo bloque y se mantienen fuera del repositorio.

Vercel solo recibe la URL y clave pública de Supabase. Configurar por separado local/staging/producción; no conectar una preview a datos reales. Registrar ownership de cuentas, acceso del equipo y proceso de revocación.

## Información sensible

Nombre, teléfono/correo y notas de recepción se tratan como datos personales. Reducir campos a lo necesario; no registrar datos médicos/documentos/fotos/comprobantes hasta definir finalidad, acceso y retención. No enviar PII a analytics/logging ni mostrar errores SQL al usuario. No hay integración de Mercado Pago ni almacenamiento de instrumentos de pago.

Para el sorteo se guarda únicamente el mes de cumpleaños, sin día ni año. El dueño fija la fecha de cierre anual; monitor y usuarios sin staff no pueden escribirla. La demo elimina fechas completas antiguas de su almacenamiento local al cargar la nueva versión.

## Antes de producción

- Confirmar permisos, país/normativa, política de privacidad, retención y eliminación de datos.
- Definir corrección/anulación auditada de un abono mal cargado; no habilitar UPDATE manual del ledger como solución operativa.
- Definir recuperación de acceso, SMTP y MFA del dueño según operación; no habilitar signup público.
- Habilitar backups apropiados al plan de Supabase y probar restauración en entorno separado; acordar RPO/RTO y responsables.
- Configurar HTTPS, dominio, redirects y límites de Auth. Revisar cuotas/costes y alertas sin PII.
- Completar pruebas reales de Safari/iOS y Android y aceptación con recepción.

La carpeta Drive almacena fuente y diseño, no un backup de datos. Ninguna copia de DB se envía a Drive desde este workflow.

## Frontera de importación Excel

El archivo se procesa en el navegador dentro de un worker acotado (2 MB, expansión declarada 12 MB, 200 entradas, 15 s). Se rechazan fórmulas, macros, vínculos externos, formatos antiguos y archivos inválidos; no se ejecuta Excel. No se persiste el archivo, no se manda a terceros y los campos no relacionados no se envían al servidor.

Solo dueño puede renderizar la ruta, ejecutar la acción y llamar la RPC. El servidor revalida y la DB vuelve a comprobar identidad/rol vigente, payload, moneda, fechas, importes, actividades y duplicados. RLS/grants niegan escritura directa; auditoría visible solo al dueño. Transacción y locks evitan lotes parciales y reintentos duplicados. La importación no autoriza cambiar datos críticos en producción desde esta sesión.

Los pagos históricos no se convierten en cobros nuevos. `occurred_on` distingue fecha real de cobro e instante de importación; apertura sin detalle no inventa medio/fecha. Los abonos nuevos consideran la apertura para evitar sobrepago. Datos de edad deben tratarse como información personal y revisarse con la política de menores/retención del cliente antes de producción.

## Controles de la ampliación de operaciones

Los socios y sus perfiles de Instagram son privados. Los enlaces se construyen desde un identificador validado, sin aceptar URLs arbitrarias. Los borradores de campaña y sus destinatarios son exclusivos del dueño. Recepción puede registrar clases, confirmando la deuda; cierres, ofertas y correcciones requieren dueño.

Las exportaciones requieren personal autorizado y no se cachean. El CSV protege textos que Excel podría interpretar como fórmulas. Los campos de dinero, fechas, cantidades y destinatarios se vuelven a validar en servidor/base. Las operaciones repetidas y concurrentes no duplican cobros ni consumen la misma última clase.

No hay claves ni proveedor de WhatsApp en esta entrega. Su activación requiere el número oficial, permisos/plantillas correspondientes, controles de consentimiento y repetición y una comprobación de vigencia antes de cada envío. No se envían mensajes al importar ni al guardar una campaña.

Antes del uso real: configurar hosting de Next.js, proyecto Supabase, cuentas individuales, permisos, backups y recuperación. GitHub Pages y su PIN siguen siendo exclusivamente una muestra con datos ficticios almacenados en el navegador.

## Comunicaciones preparadas — 2026-10-25

Nuevos datos personales: consentimiento separado de IG, celulares de dueños y copias de mensajes. Solo dueño activo puede leer las seis tablas y ejecutar las RPC; monitor, anónimo y usuario sin staff no administran comunicaciones. Formularios sin tokens, SDK Meta o conexión ficticia. Mensajes se renderizan como texto, nunca HTML. Teléfonos requieren formato internacional; no se asume país a partir de cifras.

La revisión automática vuelve a comprobar permiso/contacto/vencimiento/saldo y cancela propuestas obsoletas. Los snapshots manuales no son autorización perpetua: la futura conexión debe verificar de nuevo al despachar, comprobar firmas de webhooks, evitar IDOR y duplicados, respetar bajas, ventanas y límites del proveedor y proteger endpoints programados. Retención/borrado de mensajes y evidencia legal de consentimiento se deben acordar antes de activar campañas reales. No se envían mensajes en desarrollo. El PIN público de GitHub Pages es exclusivamente demostrativo y sus datos siguen en el navegador: no introducir información real.
