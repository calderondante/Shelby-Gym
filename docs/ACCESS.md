# Acceso del gimnasio con una contraseña

Aprobado el 26/10/2026: para este gimnasio, los dueños quieren entrar únicamente con una clave y cambiarla desde Ajustes, sin tener que introducir un correo.

## Uso

- Abrir la URL oficial de Netlify e introducir la contraseña del gimnasio.
- La primera vez, abrir el enlace de activación entregado por el administrador técnico, pulsar **Elegir mi contraseña** y guardar una contraseña de al menos 12 caracteres con su confirmación.
- Para cambiarla: **Ajustes → Contraseña de acceso**, indicar la clave actual, la nueva y su confirmación. Todas las sesiones de esa cuenta se cierran; cada dispositivo vuelve a entrar con la nueva.
- Si se olvida la clave, el administrador técnico autorizado genera otro enlace de recuperación de un solo uso. No existe una clave maestra ni se reusa el PIN de la demo.

## Implementación y límites

Se mantiene Supabase Auth. `GYM_OWNER_LOGIN_EMAIL` identifica únicamente en el servidor a la cuenta técnica del gimnasio; no se requiere un buzón real. El formulario no solicita correo cuando esa variable está configurada y el servidor no acepta otra identidad indicada por el navegador. Sin esa variable, se conserva el acceso de cuentas individuales con correo, útil para otros despliegues y QA.

El acceso compartido corresponde a un único staff dueño: el historial conserva esa cuenta pero **no distingue qué persona utilizó la clave**. Si se necesitan atribuciones individuales, se deben usar cuentas personales. No habilitar registro público.

Cambiar una contraseña exige una sesión de dueño activo y revalidar la contraseña actual con Auth antes de actualizarla. Se cierra globalmente la sesión con Supabase. La migración `20261026194944_owner_password_access.sql` comprueba además que el `session_id` firmado siga presente y vigente en `auth.sessions` desde `private.staff_role`: un JWT de una sesión cerrada ya no puede leer ni escribir datos aunque todavía no haya expirado. La consulta es interna, no expone sesiones ni tokens.

La activación valida primero contraseña/confirmación, verifica el token de recuperación de un solo uso con Auth y exige el rol de dueño y la identidad técnica configurada. El token se entrega en el fragmento `#token_hash=…`; no forma parte de peticiones HTTP ni logs del alojamiento. Se retira de la barra al comenzar la activación y no se guarda en localStorage. Una repetición requiere un enlace nuevo; el proceso no envía correo ni WhatsApp.

La app desplegada usa solo URL, clave pública y el identificador técnico. Las credenciales administrativas permanecen fuera del runtime web y sirven exclusivamente para provisión/recuperación autorizada. No se versionan contraseñas, tokens, enlaces vigentes ni valores de variables.

## QA

`pnpm test:access` exige Supabase local, crea una identidad sintética y un servidor aislado en el puerto 3001, y elimina únicamente esa identidad al terminar. Cubre ingreso sin correo, clave incorrecta, cambio con clave actual, bloqueo de JWT revocado, activación y reutilización de enlaces, responsive y axe. No ejecutarlo contra producción. Las suites habituales siguen verificando los permisos de dueño/monitor en modo de cuentas individuales.
