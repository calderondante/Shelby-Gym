# Conectar Shelby Gym a Netlify y Supabase

Guía del 26/10/2026. El código operativo está en `main`; `gh-pages` conserva la demo. Crear una organización, vincular GitHub o completar un build no crea por sí solo las tablas, permisos ni cuentas del gimnasio.

Se puede importar ahora aunque haya cambios pendientes: las actualizaciones de `main` se despliegan en el mismo sitio sin borrar datos de Supabase. La [carga desde papel](PAPER_REGISTRATION.md) requiere también su migración versionada; publicar código no aplica migraciones automáticamente.

## 1. Importar el código en Netlify

En la pantalla «Deploy your first project», bajar hasta **Import a Git repository**, seleccionar GitHub y elegir `calderondante/Shelby-Gym`. La rama de producción debe ser **`main`** aunque GitHub sugiera `gh-pages` como predeterminada.

El archivo raíz `netlify.toml` configura:

| Campo                | Valor                                                        |
| -------------------- | ------------------------------------------------------------ |
| Base directory       | Raíz; dejar vacío                                            |
| Package directory    | Dejar vacío                                                  |
| Build command        | `pnpm build`                                                 |
| Publish directory    | `.next`                                                      |
| Node.js              | 22                                                           |
| pnpm                 | Versión fijada en `package.json`                             |
| Flags de instalación | `--shamefully-hoist`, recomendado por Netlify para Next/pnpm |

El sitio se importó originalmente como estático y la autodetección dejó las rutas de servidor sin empaquetar, aunque el build figuraba correcto. `netlify.toml` declara explícitamente el adaptador oficial `@netlify/plugin-nextjs` (OpenNext mantenido), instalado por Netlify durante el build; no es una dependencia runtime de la app. No usar export estático ni una redirección general a `index.html`. Si faltan `package.json` o el framework Next en la importación, revisar primero la rama y el directorio base.

## 2. Variables del proyecto

En la configuración de variables de Netlify, agregar estas variables de aplicación para el contexto **Production**, disponibles para build y ejecución:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
# Solo servidor: identificador técnico para el acceso con contraseña única
GYM_OWNER_LOGIN_EMAIL=
```

El identificador técnico de dueño lo configura el desarrollador durante la provisión; no hace falta un correo personal ni un buzón. Ver [acceso con contraseña única](ACCESS.md).

Copiar URL y **Publishable key** desde **Connect** o **Settings → API Keys** del proyecto Supabase de la organización Shelby Gym. La clave pública puede empezar por `sb_publishable_`; no confundirla con una clave Secret, service role ni con la contraseña de PostgreSQL. La app normal no necesita esas claves privilegiadas en Netlify. No pegarlas en el chat, Git, el nombre del sitio ni documentos públicos.

Los secretos de una futura integración Meta tendrán su propio almacenamiento de servidor; no forman parte de este primer despliegue.

No dar a deploy previews o ramas de prueba las variables de la base de producción. Usar un proyecto de pruebas independiente si se desea verificar cambios con datos.

## 3. Desplegar

Completar la importación y ejecutar el primer deploy. Revisar el log del build y conservar la URL asignada `https://nombre.netlify.app`. Si se agregaron variables después del build, volver a desplegar para incorporar las variables públicas de Next.

Un login visible no significa que la base esté lista: no empezar a cargar personas reales hasta completar la siguiente etapa y los controles de entrega.

## 4. Preparar el proyecto Supabase correcto

El acceso original del conector no incluía la organización nueva. El 26/10/2026 se completó la autorización oficial de la CLI de Supabase para la cuenta propietaria y se verificó el proyecto `smgxymlfjcdxabgippby`, organización **Shelby Gym**. Antes de aplicar se comprobó que no había tablas de aplicación ni usuarios Auth. Se aplicaron 18 migraciones versionadas mediante la Management API por HTTPS, conservando los nombres y versiones originales en `supabase_migrations.schema_migrations`: el acceso TCP de esta máquina al pooler no estaba disponible.

Las 26 tablas públicas tienen RLS; se creó únicamente la identidad técnica de administración y la configuración ARS/Argentina. No se cargaron clientes ni pagos. El registro público quedó desactivado y el acceso inicial requiere un enlace de activación de un solo uso. La autorización de la CLI no modifica los permisos del conector de ChatGPT.

Para una nueva instalación o revisión:

1. Confirmar el identificador y la organización del proyecto de destino. Inspeccionar tablas, migraciones y estado de seguridad; no asumir que sigue vacío por una captura anterior.
2. Revisar y aplicar las migraciones versionadas de `supabase/migrations/`, conservando su historial. Si hay datos existentes, respaldarlos y evaluar conflictos antes; no resetear la base.
3. Revisar RLS, grants y vistas. La conexión de GitHub del dashboard no demuestra que se haya ejecutado ese proceso.
4. Desactivar registro público en Auth remoto y preparar la cuenta personal del dueño con su fila y rol en `staff`. Un usuario Auth sin ese rol no tiene acceso a la gestión.
5. Configurar ARS y `America/Argentina/Buenos_Aires` antes de crear cuotas/gastos.
6. En **Authentication → URL Configuration**, poner la URL definitiva de Netlify como **Site URL** y autorizar únicamente los redirects que use el flujo implementado. No autorizar previews contra producción por comodidad.
7. Probar inicio/cierre de sesión, permisos y datos compartidos entre dos equipos antes de cargar datos reales.

El PIN de la demo no se reutiliza como acceso operativo. La recuperación de acceso, backups y aceptación física se completan conforme a [CHECKLIST_ENTREGA](CHECKLIST_ENTREGA.md).

## Qué compartir para continuar

- La URL del primer despliegue Netlify y, si falla, el error de build sin valores de variables.
- Confirmación de que la conexión Supabase ya permite la organización Shelby Gym.
- Después de preparar la base, el modo de acceso acordado: en Shelby se usa una identidad técnica con contraseña única y activación desde la app.

Esta guía y el archivo Netlify preparan la importación; no acreditan un deploy remoto, migraciones aplicadas, cuentas creadas ni integración de WhatsApp/Instagram.

## Fuentes oficiales

- [Next.js en Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).
- [Build y publish de Next.js](https://docs.netlify.com/snippets/frameworks/nextjs-config-values/).
- [Node y pnpm en Netlify](https://docs.netlify.com/build/configure-builds/manage-dependencies/).
- [Claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys).
- [URLs de Auth](https://supabase.com/docs/guides/auth/redirect-urls).
