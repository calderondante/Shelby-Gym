# Arquitectura

Estado: primera implementación local de Shelby Gym, autorizada el 2026-10-03. Aplicación responsive de una sola base de código. Existe una muestra estática con datos ficticios en GitHub Pages. El despliegue operativo de Next.js y Supabase sigue pendiente.

## Stack implementado

| Capa             | Elección                                            | Motivo                                                                             |
| ---------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| App              | Next.js 16.3.8 App Router, React 19.3               | Rutas y backend ligero en el mismo proyecto; versiones estables verificadas en npm |
| Tipado           | TypeScript 5.9 strict                               | Compatible con tooling actual; sin `any` en código propio                          |
| Estilo           | Tailwind 4, tokens Shelby, fuente de sistema        | Negro/grafito, rojo y blanco; sin descargar fuentes                                |
| Primitivas       | shadcn/ui, base Base UI, registro oficial `@shadcn` | Código local y controles semánticos; targets adaptados a 44–48px                   |
| Datos            | Supabase/PostgreSQL 17                              | Integridad, transacciones, RLS y ledger de abonos                                  |
| Identidad        | Supabase Auth + `@supabase/ssr`                     | Sesión por cookies, validación servidor y roles vigentes en DB                     |
| Actualización    | Supabase Realtime + refresh servidor                | Cambios entre equipos; fallback cada 30 s y al volver a la pestaña                 |
| Validación       | Zod + constraints/RPC                               | Feedback servidor e integridad también fuera de la UI                              |
| QA               | Vitest, Playwright, pruebas directas Auth/REST      | Reglas de negocio, responsive, workflows y controles negativos                     |
| Hosting previsto | Vercel + Supabase                                   | Deploy sencillo; cuentas, región y presupuesto pendientes                          |

Node 22 o 24; pnpm 11.19.0; lockfile único. ESLint 9 por compatibilidad declarada con plugins de Next; actualizar junto con esos plugins cuando soporten la versión mayor siguiente. No instalar React Native/Expo, ORM, store global ni librería de motion sin necesidad concreta.

## Estructura

```text
src/
  app/                 # Rutas servidor, layouts, loading/error
    (gym)/             # Clientes, perfiles, actividades, ajustes
    login/             # Acceso de personal
    configuracion/     # Diagnóstico del entorno sin conexión configurada
  components/
    ui/                # Primitivas oficiales adaptadas
    shared/            # Marca, navegación, formularios, actualización
  features/
    auth/              # Login/logout
    gym/
      components/      # Formularios interactivos
      domain/          # Fechas civiles e importes exactos
      validation/      # Contratos de entrada
      server/          # Casos de uso, autorización y consultas
  lib/supabase/        # Clientes SSR/browser, env, tipos
  proxy.ts             # Renovación de cookies, no-store y CSP
supabase/migrations/   # Schema, constraints, índices, policies, grants, RPC
scripts/               # Setup local, provisión técnica y pruebas
tests/                # Dominio y navegador
public/brand/          # Referencia de logo, presentada con CSS
docs/                 # Producto, diseño, decisiones y operación
```

Repositorio independiente por cliente; extraer módulos reutilizables cuando exista una segunda necesidad concreta, con contratos y tests. No introducir monorepo o multitenancy por anticipado.

## Frontend y diseño

Server Components para las lecturas. Client Components para formularios, navegación activa y actualización entre equipos. Formularios de alta integran perfil, actividad y primer abono; el perfil separa vigencia y deuda. En móvil las filas se reorganizan, no se fuerza una tabla desktop con scroll lateral.

Los formularios conservan entradas ante validación fallida. Se conserva la revisión inicial y UUID de operación para no pisar cambios ajenos ni duplicar envíos. No hay fallback a fixtures en el producto: sin conexión configurada se muestra una página de preparación, sin datos ficticios.

## Backend y datos

Todas las mutaciones UI son Server Actions con auth y validación propias. Usan el contexto del usuario, nunca service role. RPC transaccionales guardan operaciones compuestas, bloquean sobrepagos concurrentes, comparan condiciones vistas y aplican idempotencia. RLS protege acceso directo por REST/Realtime.

Migraciones imperativas versionadas, tipos generados y snapshot de condiciones por período. Detalle en DATA_MODEL. No hay backend adicional ni acceso SQL desde el navegador.

## Auth y seguridad

Signup público desactivado. Dueño/monitor se provisionan mediante script administrativo; cliente del gimnasio no equivale a usuario Auth. `getClaims` renueva/verifica token en proxy; `getUser` y consulta de `staff.active` autorizan en la frontera de datos. Las RPC repiten el control en DB. La autorización no depende de ocultar botones.

CSP con nonce por respuesta y sin `unsafe-eval` en producción; estilos inline permitidos para compatibilidad con primitivas. Respuestas privadas `no-store`, sin caché compartida. No hay PWA offline ni service worker que guarde clientes. No se usan Cache Components en datos privados.

## Fetching, caché y actualización

| Recurso           | Política                                       | Actualización                                             |
| ----------------- | ---------------------------------------------- | --------------------------------------------------------- |
| Sesión y staff    | Por request, sin caché compartida              | Validación Auth + rol activo en DB                        |
| Lista de clientes | Servidor, 30 filas por página, búsqueda/filtro | Revalidate tras mutación; Realtime; fallback de 30 s      |
| Perfil/ledger     | Servidor, datos autorizados                    | Revalidate tras abono; Realtime                           |
| Actividades       | Servidor, snapshot en formulario               | Ediciones invalidadas; verificación DB de precio/revisión |
| Asset de marca    | Público y optimizado por Next Image            | Reemplazar cuando se reciba el original                   |

Realtime notifica cambios; la UI reconsulta datos autorizados. Al fallar la suscripción se indica reconexión y el fallback sigue vigente. No se promete tiempo real cuando el equipo está offline.

## Hosting y operación

`docs/DEVELOPMENT.md` contiene comandos reproducibles. Separar local/staging/producción y configurar redirects/SMTP/backups antes de operar con datos reales. El deployment Vercel solo necesita URL y clave pública de Supabase; la service role no forma parte del runtime de esta app.

Drive es un archivo de entregables de código, diseño y documentación; no reemplaza el historial Git ni el backup de DB. No se hicieron push, commits automáticos ni despliegues.

## PWA y decisiones pendientes

La experiencia responsive funciona sin instalación. PWA puede añadirse al confirmar necesidad de acceso desde pantalla de inicio; no se implementa caché offline de información privada ni sincronización de cobros desconectados. No hay funcionalidades nativas que justifiquen Expo/App Store en este alcance.

Confirmado: ARS y zona America/Argentina/Buenos_Aires. Pendientes de producto: campos obligatorios/duplicados, renovación anticipada y pausas, corrección auditada de pagos, gestión del personal, ofertas programadas, retención y backups, datos reales de volumen y sedes. Reglas iniciales explícitas en PRODUCT y DECISIONS.

## Importación y motion — 2026-10-04

`src/features/imports/` separa contratos/normalización, worker de lectura, Server Action autorizada y componentes de wizard/revisión. La ruta `/clientes/importar` exige dueño. `read-excel-file` 9.3.10 y `fflate` 0.8.3 se fijan como dependencias necesarias; el parser corre en un worker propio, con límites de ZIP/archivo y timeout. CSP permite workers exclusivamente del mismo origen. No se sube ni persiste el XLSX; el servidor recibe solo los campos seleccionados para validación/commit. RPC transaccional, detalles en IMPORTS y DATA_MODEL.

CSS y WAAPI implementan los tokens de Emil. `InteractionMotion` distingue puntero/teclado sin disparar renders; `MotionStage` cancela entradas interrumpidas y respeta reduced motion. No se añadió un proveedor global de animación ni se convirtió el layout servidor en un componente cliente.

El historial de pagos se consulta por relación a cliente y páginas internas de hasta 1.000 filas, sin el antiguo recorte silencioso de 300 abonos ni una URL con cientos de UUID. Para volúmenes mucho mayores, introducir paginación visible por período y medir el payload con datos reales.

## Operaciones — 2026-10-20

Las contrataciones existentes también admiten `duration_unit=sessions`, con `ends_on=null`. La vista de saldos agrega `sessions_remaining`, calculado desde consumos y reversiones. Se conserva el mismo circuito transaccional de pagos y snapshots de precios, evitando una segunda caja para particulares.

Gastos se modela como obligaciones, plantillas recurrentes y lotes de pagos/reversiones. Los cierres mensuales y las listas de sorteo son copias persistentes protegidas por RPCs del dueño y RLS. Las campañas almacenan borradores y selección de destinatarios; no hay proveedor de envío configurado.

Las nuevas pantallas continúan usando Server Components para lecturas y Server Actions con validación para mutaciones. Las exportaciones privadas requieren sesión, llevan `Cache-Control: private, no-store` y no utilizan una clave privilegiada en el navegador. Realtime y el fallback existente actualizan también las operaciones nuevas.

El código operativo y la muestra estática se publican en ramas distintas. `gh-pages/gestion` es un entorno demostrativo local a cada navegador; no sustituye Supabase ni admite uso compartido de datos reales. Ver [actualización](UPDATES_2026-10-20.md).

## Centro de comunicaciones — 2026-10-25

`src/features/communications/` separa dominio (canales, consentimiento, variables, calendario), lectura de datos server-only, Server Action owner-only y formularios interactivos. `/comunicaciones` sirve seis secciones; `/campanas` redirige y conserva los borradores existentes. Consultas independientes se paralelizan; selección y preview son cliente, validación y escritura son servidor y RPC transaccional.

Tablas/RPC nuevas en dos migraciones `20261026004443` y `20261026010251`: configuración sin secretos, plantillas, contactos de dueños, reglas, selección de clientes y outbox de preparación. Solo el dueño puede leer o escribir a través de RPC; no se conceden escrituras directas a authenticated. Estados limitados a prepared/cancelled. No se agrega SDK, cron ni dependencia runtime. La demo GitHub Pages implementa el mismo flujo localmente en `gestion/communications.js`, con la misma clave de almacenamiento anterior; no es el backend operativo. [Protocolo de conexión futura](COMMUNICATIONS.md#conectar-más-adelante).

## Revisión de seguridad — 2026-10-26

Baseline actualizado a Next/eslint-config-next **16.4.1** y Zod **4.6.6**, con versiones exactas y lockfile, para retirar los avisos identificados en la [auditoría mensual](AUDIT_2026-10-26.md). No cambia el stack ni añade dependencias. La zona horaria queda protegida junto a la moneda al existir obligaciones financieras. Los fallos con resultado de guardado incierto indican revisar el historial, sin asegurar que el servidor no haya registrado la operación.

## Incorporación manual desde papel

`PaperRegistrationForm` es una interacción cliente acotada; `paperRegistrationAction` valida perfil y fechas, exige dueño y llama a `register_paper_customer`. La RPC vuelve a validar y realiza el alta completa en una transacción idempotente. Se reutilizan los importes históricos de apertura y la procedencia de `import_batches`, sin depender de archivos Excel. La vista de saldos resta el uso de clases de apertura además de la asistencia posterior. El alta del día conserva su ruta y reglas. Ver [carga desde papel](PAPER_REGISTRATION.md).

## Acceso con contraseña única

Una identidad técnica de Auth se resuelve en servidor con `GYM_OWNER_LOGIN_EMAIL`. Los Server Actions mantienen la autenticación real, validan el cambio con la clave actual y cierran las sesiones al terminar. La activación/recuperación usa tokens de Auth de un solo uso en fragmentos de URL. RLS verifica la vigencia de la sesión mediante `private.staff_role`; no se crea un sistema de cookies paralelo ni se usa un PIN cliente. Ver [ACCESS](ACCESS.md).
