# Desarrollo de Shelby Gym

La implementación fue autorizada por el usuario el 2026-10-03 después de aprobar la dirección visual. Código y base de datos locales; todavía no hay un despliegue de producción ni un proyecto Supabase remoto.

## Preparar un equipo

Requisitos: Node 22 o 24, pnpm 11.19.0 y Docker en ejecución. Usar las versiones fijadas en `package.json` y `pnpm-lock.yaml`.

```bash
pnpm install --frozen-lockfile
pnpm db:start
node scripts/configure-local.mjs
```

El último comando crea `.env.local` solo si no existe, exclusivamente con claves del Supabase local. No imprime claves. La app usa la URL y la clave pública; la clave `SUPABASE_SERVICE_ROLE_KEY` solo se utiliza en scripts administrativos y de QA, nunca en componentes, Server Actions ni consultas normales.

Crear la primera cuenta y configurar moneda/zona horaria desde Ajustes:

```bash
node scripts/provision-staff.mjs tu-correo@ejemplo.com "Tu nombre" owner
pnpm dev
```

Abrir <http://localhost:3000>. El registro público de cuentas está desactivado. Para un monitor, ejecutar el mismo script con el rol `monitor`. No crear clientes reales en el entorno de QA. La administración de altas/bajas de personal permanece como operación técnica restringida; no existe un portal público de clientes.

## Verificación

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node scripts/verify-workspace.mjs
```

Pruebas con Auth, PostgreSQL y REST reales, solo contra `localhost:54321`:

```bash
pnpm test:integration
pnpm test:e2e
```

`test:integration` agrega cuentas y registros sintéticos. No borra datos, no envía correos y no opera contra proyectos remotos. Genera accesos aleatorios en `.env.test.local`, ignorado por Git. El test de navegador lee esos accesos; necesita la aplicación en el puerto 3000. En este cloud se usa `/usr/bin/chromium`; configurar `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` para otra instalación. Traces y reportes pueden contener sesiones/datos: son locales, ignorados y excluidos de los backups de Drive.

Para un proyecto local limpio, el desarrollador puede ejecutar `pnpm exec supabase db reset --local` **solo tras verificar que la base sea desechable**; elimina los registros locales. Las pruebas normales no hacen reset implícito.

## Schema y tipos

Migraciones imperativas en `supabase/migrations/`. Crear cambios con `pnpm exec supabase migration new nombre`, revisar SQL y aplicar con `pnpm exec supabase migration up --local`. Regenerar tipos con `pnpm db:types`; no editar a mano los tipos generados. Toda función, índice, constraint, policy y grant se versiona.

## Salida a staging y producción

La ruta de arranque gratuito propuesta usa Netlify y Supabase. Pasos de importación, variables, autorización de la organización y preparación de la base en [NETLIFY_SUPABASE](NETLIFY_SUPABASE.md); `netlify.toml` fija build, publicación, Node y flags de pnpm. Los párrafos siguientes conservan la alternativa de hosting prevista originalmente.

Antes de operar con personas reales se necesitan cuentas del cliente en Supabase/Vercel, región, presupuesto, dominio, política de acceso, privacidad, backups y recuperación. Configurar SMTP y recuperación de acceso si se adopta autoservicio; en esta primera entrega no se envían emails.

Crear un proyecto remoto y desplegar requieren autorización y configuración concretas. No apuntar previews a producción. Aplicar migraciones al proyecto correcto, desactivar signup público también en remoto, provisionar dueño y validar permisos con cuentas de staging. Vercel necesita únicamente las dos variables públicas de Supabase para esta app; no necesita la service role key.

La publicación no equivale a aceptación: confirmar reglas comerciales pendientes y probar Safari/iOS y Chrome/Android reales. Drive guarda entregables de código/diseño, **no es un backup de PostgreSQL ni un remoto Git**.

## Particularidad del cloud usado en esta sesión

Docker usa `vfs` y tiene disco limitado. La descarga normal de PostgreSQL oficial agotó espacio por las copias de capas. Se exportó la imagen oficial `public.ecr.aws/supabase/postgres:17.11.0.002` con `crane` de Google (release y checksum verificados) y se importó su filesystem a una única capa, conservando entorno, entrypoint y comando. Esto es una adaptación local del entorno, no un cambio del runtime ni un requisito para equipos con Docker habitual. No cambiar storage driver ni reiniciar el daemon compartido para resolverlo.

El proxy HTTP de este cloud también interfería con el healthcheck interno de Supabase Auth: BusyBox `wget` enviaba la comprobación de loopback al proxy. Se preservó la configuración del contenedor local y se cambió únicamente ese healthcheck a `wget -Y off ... http://127.0.0.1:9999/health`. No se desactivó el proxy de las conexiones externas. En un equipo normal este ajuste no debería ser necesario; si el CLI recrea el contenedor en este cloud puede requerir repetir la adaptación. `[auth.email].enable_signup` mantiene habilitado el proveedor email/password; `[auth].enable_signup=false` impide el registro público.

Next autoriza `127.0.0.1` como origen de desarrollo en `next.config.ts` para el HMR local. La configuración no amplía los orígenes de producción. Para probar un `next start` en otro puerto, usar `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 pnpm test:e2e`.

## Actualización: importación de Excel

Aplicar las migraciones nuevas en local con `pnpm exec supabase migration up --local`, sin resetear datos. `pnpm test:integration` ahora ejecuta también `scripts/test-import.mjs`; `pnpm test:import` permite repetir solo la cobertura del importador con las cuentas QA ya creadas. `pnpm test:e2e` cubre la lectura de XLSX en worker real, flujo de revisión/commit, permisos y movimiento.

Guía de uso y límites en [IMPORTS](IMPORTS.md). Los tests generan archivos sintéticos en memoria; nunca usar planillas reales en tests, capturas, Git o exportaciones a Drive.
