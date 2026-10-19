# Decisiones (ADR simplificado)

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
- **Chosen solution:** `customers.birth_month` opcional, sin día ni año; `raffle_draws` registra una fecha inmutable por año y mes mediante RPC de dueño. Participa quien estaba registrado y no estaba de baja ni llevaba más de 30 días sin cuota vigente al cierre. Se muestran los motivos de exclusión.
- **Reason:** minimiza datos personales, mantiene el corte verificable y evita que una cuota posterior reescriba la situación del día del sorteo.
- **Consequences:** una edición posterior del mes de cumpleaños puede alterar una lista histórica recalculada. Congelar participantes, corregir fechas y registrar ganadores requiere un flujo adicional si el gimnasio lo solicita.
