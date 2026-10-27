# Decisiones (ADR simplificado)

## ADR-022 — Foto integrada en el formulario de inscripción

- **Date:** 2026-10-27.
- **Decision:** añadir camarita al registro existente, sin nuevas pestañas/estados persistentes.
- **Context:** trasladar fichas de papel reduciendo transcripción, con revisión y posibilidad de completar manualmente.
- **Options:** OCR externo, nueva sección de importación, o reutilizar OCR local dentro de los dos modos actuales.
- **Chosen solution:** lector local compartido con facturas, campos etiquetados y parche seleccionado; estado personal controlado sin resetear notas. Historia requiere actividad existente y revisión independiente; no infiere cobros.
- **Reason:** conserva privacidad, costes e infraestructura; evita duplicar worker y lógica de negocio.
- **Consequences:** sin nuevas dependencias/API/schema. Cursiva y planillas desconocidas pueden no reconocerse. Falta muestra anonimizada del formulario real; se valida con fichas impresas sintéticas. Procesar la imagen no persiste nada y descarta foto al aplicar/cancelar/salir.

## ADR-021 — Avisos propios y factura sin conservar foto

- **Date:** 2026-10-27.
- **Decision:** WhatsApp manual a clientes separado de avisos al dueño; captura de factura con foto temporal.
- **Context:** evitar cargos Meta; avisos con app cerrada+bandeja; revisar proveedor/número/importe/vencimiento sin conservar imagen.
- **Options:** Meta Cloud API; sólo bandeja; Web Push/programador existente. OCR externo o local bajo demanda.
- **Chosen solution:** Web Push, tarea horaria Netlify, Auth técnico de mínimo privilegio/cola privada con sesiones vigentes; Tesseract español local con revisión. Persistir cuatro campos en gastos existentes.
- **Reason:** mantiene infraestructura web y control humano sin nuevas cuentas de OCR ni exposición de fotos.
- **Consequences:** dependencias justificadas web-push/tesseract.js y modelo español de build. Descarga/CPU al usar foto. Permiso por dispositivo e instalación iOS 16.4+, entrega dependiente del sistema. Sin borrar galería, sin WhatsApp automático, sin OCR infalible ni offline. Reglas WhatsApp de boletas se cancelan conservando historial. Aceptación física pendiente.

Registrar decisiones arquitectónicas importantes; no usar ADR para todo cambio de estilo. Estados: propuesta, aceptada, reemplazada. Una decisión nueva puede reemplazar otra sin borrar su contexto.

## Plantilla

### ADR-XXX — Título

- **Date:** YYYY-MM-DD
- **Status:** propuesta / aceptada / reemplazada por ADR-XXX
- **Decision:** decisión concreta.
- **Context:** problema, requisitos, restricciones y evidencia.
- **Options:** alternativas reales y tradeoffs.
- **Chosen solution:** solución elegida y alcance.
- **Reason:** por qué satisface mejor las necesidades.
- **Consequences:** beneficios, costes, riesgos, mantenimiento y reversibilidad.
- **Validation:** cómo comprobar resultado; condiciones para reconsiderar.

## ADR-001 — Skills locales y preparación sin producto

- **Date:** 2026-10-03
- **Status:** aceptada (instrucción del usuario)
- **Decision:** preparar cerebro/documentación sin crear la aplicación; incorporar solo skills pertinentes a nivel proyecto.
- **Context:** desarrollo comercial con Codex desde VS Code; evitar dependencia exclusiva de skills globales y depósito de repositorios externos.
- **Options:** skills globales, clones completos en el repo, skills locales selectivas.
- **Chosen solution:** `.agents/skills/` con copias de las skills seleccionadas y sus referencias; `skills-lock.json` y procedencia verificable. Instalador `skills@1.7.0`, `--agent codex --skill ... --copy --yes`, sin `--global`.
- **Reason:** Codex reconoce la ruta de proyecto; copias versionables y portables incluso al clonar en Windows, sin symlinks ni descargas para el uso habitual.
- **Consequences:** revisar y versionar actualizaciones deliberadamente; no hay runtime, scripts de app, servicio, deploy o requisitos del gimnasio. Las skills con dependencias de herramientas/versiones quedan disponibles, sin ejecutarse todavía.
- **Validation:** inventario local, verificación de archivos/fuentes, detección con Codex y Git. Detalles en SKILLS/WORKSPACE.

## ADR-002 — Arquitectura web recomendada para futuros SaaS

- **Date:** 2026-10-03
- **Status:** aceptada como orientación, implementación pendiente
- **Decision:** priorizar una base de código responsive Next.js/React/TypeScript strict/Tailwind/shadcn con Supabase/PostgreSQL/Auth y hosting inicial Vercel.
- **Context:** SaaS pequeños comerciales, mantenimiento simple, rapidez, coste y uso en PC/tablets/Android/iOS.
- **Options:** web responsive, aplicaciones nativas múltiples, web con backend separado.
- **Chosen solution:** arquitectura descrita en ARCHITECTURE; PWA solo con valor real. Repositorio por cliente, módulos compartidos extraídos cuando su reutilización esté demostrada.
- **Reason:** reduce superficies y despliegues manteniendo una experiencia móvil y controles de seguridad deliberados.
- **Consequences:** compatibilidad real de navegadores debe comprobarse; hosting/backups requieren presupuesto. No implica tenancy, offline ni features del gimnasio. Versiones, caché, tooling y schema quedan pendientes de requisitos.
- **Validation:** acordar producto y restricciones antes del starter; reconsiderar si surge una necesidad nativa/store o un backend que lo justifique.

## ADR-004 — Primera implementación Shelby Gym

- **Date:** 2026-10-03.
- **Decision:** Iniciar el producto tras aprobación inicial del diseño y autorización explícita del usuario para codificar.
- **Context:** Alta rápida de clientes con actividad y primer abono; consulta global de vigencia y deuda; PC/celular.
- **Options:** Prototipo estático, SPA con backend separado, Next App Router con Supabase.
- **Chosen solution:** Next 16.3.8/React 19.3/TS strict/Tailwind 4/shadcn Base UI/Supabase; un deployment por gimnasio. Versiones estables verificadas y lockfile pnpm.
- **Reason:** Mantener una sola base de código, SSR y datos reales con poco overhead operativo.
- **Consequences:** No fixtures de producción, no multitenancy, no Expo, no PWA offline. Cuentas remotas y deployment pendientes.

## ADR-005 — Ledger e invariantes de cobro manual

- **Date:** 2026-10-03.
- **Decision:** Guardar períodos y abonos inmutables desde la app, con desglose por medio.
- **Context:** Pagos parciales/mixtos, varios empleados y primer abono que inicia vigencia.
- **Options:** Booleano pagado; total editable; ledger transaccional.
- **Chosen solution:** RPC con auth, constraints, row lock por cuota, UUID idempotente, snapshot comercial y lectura calculada del saldo. Migraciones imperativas.
- **Reason:** Evitar sobrepago concurrente, duplicación y cambios retroactivos de precio/fechas.
- **Consequences:** Correcciones/anulaciones requieren un workflow auditado futuro. No se implementa checkout. Sin un abono positivo no se inicia un período.

## ADR-006 — Criterios iniciales y límites comerciales

- **Date:** 2026-10-03.
- **Decision:** Documentar criterios iniciales sin presentarlos como reglas aprobadas del cliente.
- **Context:** Moneda, corte de vencimiento, fin de mes, renovación anticipada, campos y ofertas aún incompletos.
- **Options:** Inventar automatismos; bloquear toda implementación; limitar acciones y hacer explícitos los criterios.
- **Chosen solution:** Ajustes iniciales de moneda/zona, nombre obligatorio y contacto opcional, mes calendario con clamp, vencimiento exclusivo, renovación solo al vencer desde el nuevo abono, oferta de precio reducido manual. Condiciones congeladas por período.
- **Reason:** Permitir evaluar la app sin efectos ambiguos sobre dinero o fechas.
- **Consequences:** Confirmar estos puntos antes de producción. No pausas, retroactividad, descuentos acumulables ni abonos offline.

## ADR-007 — Git y archivo de entregables en Drive

- **Date:** 2026-10-03.
- **Decision:** Usar Git en el workspace y una carpeta Drive autorizada para versiones exportadas.
- **Context:** El usuario ofreció Drive para guardar código, diseño y animaciones.
- **Options:** Directorio vivo de código sincronizado por Drive; snapshot de fuente y documentación.
- **Chosen solution:** Snapshots con lista explícita de archivos permitidos, capturas y diseño; excluir secretos, sesiones, datos de DB, dependencias y build.
- **Reason:** Mantener la integridad del repositorio y no confundir backups de código con backups de datos.
- **Consequences:** Drive no es un remoto Git ni un sitio publicado. No compartir públicamente ni cambiar permisos del usuario.

## ADR-008 — Migración desde Excel e historia económica

- **Date:** 2026-10-04.
- **Decision:** Importación inicial transaccional, exclusiva del dueño, conservando precios y fechas históricos.
- **Context:** El usuario pidió continuidad desde Excel, nombre/edad, actividades, pagos anteriores e importes que cambiaron por inflación.
- **Options:** Rehacer altas a precio actual; inventar abonos iniciales; incorporar snapshots y ledger histórico con apertura separada.
- **Chosen solution:** XLSX leído en worker local, relación de columnas/actividades, IDs estables por cliente/cuota/pago, preview y confirmación. Precio por período. Pagos con fecha civil original y medio real; parte abonada sin detalle como crédito de apertura. Edad con fecha de referencia. No actualizaciones/merges automáticos de clientes existentes.
- **Reason:** Preservar significado contable y trazabilidad sin suponer inflación, fecha de nacimiento ni cobros desconocidos.
- **Consequences:** Dos dependencias MIT fijadas para la necesidad real; límites y rechazos documentados en IMPORTS. Reintentos seguros, auditoría, RLS y pruebas negativas. Corrección posterior y ampliación de historia existente requieren otro flujo.

## ADR-009 — Movimiento de producto con las skills de Emil

- **Date:** 2026-10-04.
- **Decision:** Tokens compartidos de motion y CSS/WAAPI, sin sumar Motion como dependencia.
- **Context:** El usuario pidió un salto de calidad visual y uso efectivo de las skills ya instaladas.
- **Options:** Animar todas las páginas/listas; instalar un framework; trabajar feedback y continuidad de estados puntuales.
- **Chosen solution:** Pulsación 140 ms, entrada de pasos 220 ms con cancelación, confirmaciones/details con mejora progresiva. Teclado y reduced motion sin desplazamientos; datos operativos quietos.
- **Reason:** Una app de recepción necesita calidad perceptible y rapidez repetida; el movimiento debe ayudar a entender acciones.
- **Consequences:** Verificación real de estilos durante pulsación y preferencias, capturas responsive y controles accesibles. Compatibilidad física iOS/Android continúa pendiente.

## ADR-010 — Muestra funcional en red local

- **Date:** 2026-10-13.
- **Decision:** preparar la aplicación existente para una demostración táctil en un teléfono de la misma Wi-Fi que la PC.
- **Context:** la URL `localhost` de Supabase sirve en la PC, pero en un teléfono apunta al propio teléfono; la app necesita que Auth y las lecturas sean accesibles por la IP local de la PC.
- **Options:** capturas o prototipo estático; desplegar una instancia remota; ejecutar Next y Supabase locales con datos ficticios.
- **Chosen solution:** `pnpm demo:local --host IP` valida una IP privada de la PC, mantiene `.env.local` y pasa al proceso Next una URL de la LAN `http://IP:54321`. Next acepta ese origen solo durante la demo y oculta su indicador de desarrollo. Un sembrador separado crea tres actividades y tres clientes ficticios mediante las RPC y permisos existentes, sin duplicarlos al repetirlo.
- **Reason:** muestra acciones y persistencia reales en la app actual, sin incorporar un servicio o un frontend alternativo.
- **Consequences:** requiere Docker/Node/pnpm en una PC de la misma red, acceso a los puertos 3000 y 54321 y una cuenta de dueño local. Se usa únicamente en Wi-Fi privada con datos ficticios. El cloud de Codex no está automáticamente en la LAN del teléfono; las pruebas automatizadas de viewport no acreditan Safari/Android físicos. Instrucciones en [DEMO_LOCAL.md](DEMO_LOCAL.md).

## ADR-011 — Historial mensual y saldo pendiente

- **Date:** 2026-10-19.
- **Decision:** consultar los abonos de un mes por su fecha civil argentina, recorrer los días con movimientos y separar lo cobrado, lo pendiente de cuotas iniciadas en ese mes y la deuda total.
- **Context:** el dueño necesita ver ingresos globales, medios de pago y días concretos desde celular o PC; pueden existir pagos parciales y deudas de meses anteriores.
- **Options:** sumar precios de cuotas como ingresos, reconstruir cierres históricos, o mostrar dinero recibido y deuda actual con etiquetas explícitas.
- **Chosen solution:** el total mensual suma sólo entradas de pago; los pagos importados usan su fecha original. El pendiente del mes suma saldos actuales de cuotas iniciadas allí y el total suma las de todos los meses, incluso perfiles retirados. La barra diaria muestra el detalle sin pedir el mes completo por cada día.
- **Reason:** evita sumar una cuota dos veces y permite revisar cobros y deuda sin fingir un cierre contable histórico.
- **Consequences:** el saldo no es una foto del fin de cada mes. Un cierre contable, anulaciones, conciliación o exportación requerirían modelos y permisos propios.

## ADR-012 — Sorteo por mes de cumpleaños

- **Date:** 2026-10-19.
- **Decision:** guardar sólo el mes de cumpleaños y fijar una fecha de cierre por sorteo anual.
- **Context:** el dueño quiere seleccionar un mes, excluir altas posteriores al sorteo y cuotas vencidas hace más de 30 días, y permitir que un alta tardía figure el año siguiente.
- **Options:** fecha completa de nacimiento; lista sin cierre; mes de nacimiento y cierre anual con elegibilidad calculada.
- **Chosen solution:** `customers.birth_month` opcional, sin día ni año; `raffle_draws` registra una fecha inmutable por año y mes mediante RPC de dueño. Se muestran todas las personas del mes, hayan cumplido o no, separadas por elegibilidad al cierre. Cada fila muestra además el estado de cuota de hoy y su saldo pendiente, que es independiente de la elegibilidad histórica.
- **Reason:** minimiza datos personales, mantiene el corte verificable y evita que una cuota posterior reescriba la situación del día del sorteo.
- **Consequences:** una edición posterior del mes de cumpleaños puede alterar una lista histórica recalculada. Congelar participantes, corregir fechas y registrar ganadores requiere un flujo adicional si el gimnasio lo solicita.

## ADR — Operaciones, clases y cierres

Date: 2026-10-20

Decision: ampliar las contrataciones y pagos actuales para admitir packs de clases sin vencimiento; conservar cierres financieros y listas de sorteo.

Context: el gimnasio necesita clases particulares de una o varias sesiones, gastos y resúmenes mensuales, recuperación comercial y datos de contacto adicionales.

Options: duplicar el circuito financiero para clases; reutilizar las contrataciones con una duración por sesiones.

Chosen solution: reutilizar los contratos monetarios y separar los eventos de asistencia del cobro. Gastos tiene obligaciones y pagos con reversiones; los resúmenes y sorteos cerrados guardan copias.

Reason: preservar precios históricos y saldos, impedir doble ingreso por utilizar clases ya pagadas y mantener un historial comprensible.

Consequences: las consultas de vigencia deben distinguir fecha y sesiones. Los sorteos solo consideran cuotas temporales; las campañas cuentan dos meses desde su vencimiento. WhatsApp queda como borrador hasta configurar el proveedor. Se publica directamente la muestra de GitHub y el código aprobado; se omite video por instrucción del usuario.

## ADR-014 — Preparar comunicaciones sin simular una conexión

- **Date:** 2026-10-25.
- **Decision:** centro owner-only para campañas privadas, plantillas, reglas y boletas, con outbox preparado y sin envío.
- **Context:** el usuario quiere mensajes a varios clientes y recordatorios configurables a dueños; confirma que todavía no dispone de número exclusivo ni cuenta profesional lista y pide preparar la conexión.
- **Options:** enlaces manuales por persona; simular envíos; integrar Meta sin cuentas; preparar datos, reglas y mensajes auditables sin activar proveedores.
- **Chosen solution:** preparación por destinatario, consentimientos separados, dos meses calendario desde vencimiento, reglas de boletas con saldo real, idempotencia y cancelación; configuración sin secretos. Las reglas solo se evalúan manualmente hasta incorporar canales y programador. La demo conserva su almacenamiento local; Next/Supabase ofrece persistencia y permisos reales al desplegarse.
- **Reason:** permite revisar y configurar el flujo ya, conserva deudas e historial y evita presentar mensajes preparados como entregados. Instagram no permite campañas frías por conocer un @.
- **Consequences:** no hay cron, OAuth, webhooks ni envíos efectivos en esta entrega. Conectar Meta exigirá verificar políticas, identificadores de conversación, plantillas, consentimiento, coste y límites, además de un worker seguro y revalidación antes de despachar. Ver [COMMUNICATIONS.md](COMMUNICATIONS.md).

## ADR-015 — Conservar la zona horaria de la operación financiera

- **Date:** 2026-10-26 (UTC).
- **Decision:** proteger la zona horaria, además de la moneda, después de crear cuotas o gastos.
- **Context:** la auditoría reprodujo que cambiar la zona reinterpretaba el día de cobros almacenados como timestamps; cerca de medianoche puede cambiar incluso su mes.
- **Options:** permitir el cambio y recalcular; agregar snapshots de zona/fecha a todas las operaciones y migrar las anteriores; bloquear el ajuste cotidiano después de iniciar la contabilidad.
- **Chosen solution:** `configure_gym` rechaza el cambio con `TIME_ZONE_LOCKED` si existen obligaciones. Se mantiene el bloqueo de moneda y se explican las consecuencias en Ajustes. Una modificación excepcional necesitará revisión y migración explícitas.
- **Reason:** preserva el historial de este gimnasio, cuyo horario argentino fue confirmado, con el menor cambio de schema y sin reinterpretar registros.
- **Consequences:** no se corrige un horario inicial equivocado desde un formulario una vez que hubo actividad. Requiere intervención técnica y evaluación de fechas/backup. El bloqueo se comprueba por API, navegador y reconstrucción de migraciones.

## ADR-016 — Incorporar manualmente registros del papel

- **Date:** 2026-10-26.
- **Decision:** añadir un modo de alta histórica del dueño, conservando el alta ordinaria desde el abono del día.
- **Context:** la mayoría de socios están anotados en papel; no se importará un Excel antiguo. Hay cuotas vencidas, precios anteriores y pagos con detalle incompleto.
- **Options:** obligar a preparar Excel; permitir backdating en cualquier alta; incorporación histórica explícita.
- **Chosen solution:** formulario desde papel y RPC atómica/idempotente con procedencia, importes originales, crédito de apertura y detalle opcional de pagos; clases usadas de apertura para packs.
- **Reason:** permite cargar el cuaderno sin inventar caja, asistencias ni fechas de creación del perfil. Mantiene separadas la operación diaria y la incorporación previa.
- **Consequences:** requiere migración y permiso de dueño. No se alteran cierres ni sorteos cerrados; se mantiene la importación Excel opcional. Un redeploy no sustituye la aplicación de migraciones.

## ADR-017 — Contraseña única sobre Supabase Auth

- **Date:** 2026-10-26.
- **Decision:** entrada de dueños sin pedir correo y cambio de contraseña dentro de Ajustes.
- **Context:** el comprador prefiere una clave compartida para una operación pequeña.
- **Options:** cuentas personales con correo; PIN validado en cliente; identidad técnica y contraseña verificada por Auth.
- **Chosen solution:** resolver identidad en servidor, mantener Auth/RLS, revalidar la clave actual al cambiar, cerrar sesiones y verificar su existencia en DB. Activación mediante enlace de recuperación de un solo uso.
- **Reason:** simplifica el acceso sin trasladar la autorización al navegador.
- **Consequences:** una cuenta compartida no atribuye acciones por persona; olvido requiere recuperación administrativa. La configuración de cuentas individuales sigue disponible sin la variable técnica.

## ADR-018 — Mensajes manuales mediante Click to Chat

- **Date:** 2026-10-26.
- **Decision:** priorizar apertura manual de WhatsApp con texto y destinatario desde las copias preparadas.
- **Context:** el dueño prefiere evitar los cargos de la API para el uso cotidiano y quiere seleccionar varias personas.
- **Options:** Cloud API con facturación y programador; automatización de WhatsApp Web; enlaces oficiales individuales.
- **Chosen solution:** lista por destinatario, enlace validado por servidor al abrir, confirmación en WhatsApp, copia y marcas de revisión locales a la pantalla.
- **Reason:** encaja con el volumen del gimnasio sin credenciales Meta ni dependencias adicionales, y conserva control humano de cada envío.
- **Consequences:** no hay envío masivo automático ni confirmación de entrega. Se usa la cuenta iniciada en el dispositivo; no se fuerza un remitente desde Canales. Las marcas no son historial persistente.

## ADR-019 — Instalación web y mínimo de ocho caracteres

- **Date:** 2026-10-26.
- **Decision:** permitir contraseñas desde 8 caracteres e instalación de Shelby Gym en celular/PC sin barra de direcciones.
- **Context:** el dueño solicita simplificar el acceso manteniendo la app web existente.
- **Options:** aplicación nativa y tiendas; acceso solo en navegador; PWA con acceso directo y datos online.
- **Chosen solution:** manifest standalone, iconos de la marca, guía e invitación nativa de instalación y worker de red con pantalla de desconexión pública. Mínimo 8 compartido por formulario/servidor y configurado en Auth.
- **Reason:** conserva una base de código sin dependencias nuevas, tiendas ni almacenamiento offline de datos privados.
- **Consequences:** cada dispositivo confirma la instalación una vez; iOS usa el menú Compartir. Sigue necesitando internet. La clave actual no cambia y se mantienen revalidación y revocación de sesiones.

## ADR-020 — Navegación rápida con autorización vigente

- **Date:** 2026-10-27.
- **Decision:** reducir viajes a Auth/base de datos, lecturas por sección y carga de la marca, y preparar navegación de forma acotada.
- **Context:** el video del usuario muestra esperas entre pantallas; la medición local descubre lecturas consecutivas y datos no utilizados en Mensajes.
- **Options:** caché persistente de datos privados; ampliar infraestructura; eliminar trabajo repetido y precargar rutas autorizadas en memoria.
- **Chosen solution:** JWT verificado por `getClaims`, staff/sesión vigentes por RLS, cliente y contexto deduplicados por render, lecturas independientes en paralelo, nombres unidos al historial, datos limitados a la sección de Mensajes y logo del tamaño necesario. Dos rutas frecuentes se preparan al iniciar; las demás, con intención táctil/teclado/puntero. Sin nuevas dependencias ni migraciones.
- **Reason:** mejora esperas sin ampliar el coste fijo ni retirar controles de acceso o conciliación.
- **Consequences:** se mantiene la necesidad de internet y de comprobar equipos físicos. La precarga es volátil y se invalida; no garantiza tiempos constantes ni elimina el arranque del motor de la PWA. La prueba controlada con JWT simétrico no cuantifica el ahorro adicional de Auth con ES256 en producción.
