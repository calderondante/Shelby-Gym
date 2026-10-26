# Conectar Shelby Gym a Netlify y Supabase

Guía del 26/10/2026. El código operativo está en `main`; `gh-pages` conserva la demo. Crear una organización, vincular GitHub o completar un build no crea por sí solo las tablas, permisos ni cuentas del gimnasio.

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

Netlify detecta Next y configura su adaptador OpenNext; no se añade un plugin manual, export estático ni redirección general a `index.html`. Si faltan `package.json` o el framework Next en la importación, revisar primero la rama y el directorio base.

## 2. Variables del proyecto

En la configuración de variables de Netlify, agregar únicamente estas variables de aplicación para el contexto **Production**, disponibles para build y ejecución:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Copiar URL y **Publishable key** desde **Connect** o **Settings → API Keys** del proyecto Supabase de la organización Shelby Gym. La clave pública puede empezar por `sb_publishable_`; no confundirla con una clave Secret, service role ni con la contraseña de PostgreSQL. La app normal no necesita esas claves privilegiadas en Netlify. No pegarlas en el chat, Git, el nombre del sitio ni documentos públicos.

Los secretos de una futura integración Meta tendrán su propio almacenamiento de servidor; no forman parte de este primer despliegue.

No dar a deploy previews o ramas de prueba las variables de la base de producción. Usar un proyecto de pruebas independiente si se desea verificar cambios con datos.

## 3. Desplegar

Completar la importación y ejecutar el primer deploy. Revisar el log del build y conservar la URL asignada `https://nombre.netlify.app`. Si se agregaron variables después del build, volver a desplegar para incorporar las variables públicas de Next.

Un login visible no significa que la base esté lista: no empezar a cargar personas reales hasta completar la siguiente etapa y los controles de entrega.

## 4. Preparar el proyecto Supabase correcto

La conexión Supabase disponible en este chat no pudo acceder al proyecto nuevo mostrado en la organización Shelby Gym: el proveedor respondió «You do not have permission to perform this action». No se aplicaron migraciones ni se modificó ese proyecto.

Volver a autorizar la conexión Supabase de este chat incluyendo la organización/proyecto nuevo. Dar acceso mediante el flujo de conexión; no reemplazarlo por contraseñas ni tokens pegados en el chat.

Con el acceso disponible:

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
- Después de preparar la base, el correo que se usará como dueño; su contraseña se establece por un canal seguro.

Esta guía y el archivo Netlify preparan la importación; no acreditan un deploy remoto, migraciones aplicadas, cuentas creadas ni integración de WhatsApp/Instagram.

## Fuentes oficiales

- [Next.js en Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).
- [Build y publish de Next.js](https://docs.netlify.com/snippets/frameworks/nextjs-config-values/).
- [Node y pnpm en Netlify](https://docs.netlify.com/build/configure-builds/manage-dependencies/).
- [Claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys).
- [URLs de Auth](https://supabase.com/docs/guides/auth/redirect-urls).
