# Muestra funcional en un celular

Esta guía permite mostrar **la aplicación real** desde un iPhone o Android, con la base de datos y Next.js funcionando en una PC de la misma red Wi-Fi. Los precios y clientes de la muestra son ficticios. El teléfono necesita alcanzar **dos puertos** de la PC: 3000 para la app y 54321 para Supabase Auth/datos.

## Preparar la PC (una vez)

El proyecto debe estar en la **PC que comparte Wi-Fi con el teléfono**. Una terminal de VS Code conectada a un entorno remoto o cloud ejecuta estos comandos en el servidor remoto: su IP no es accesible automáticamente desde el teléfono.

Con Docker, Node 22/24 y pnpm 11.19.0 instalados, desde la raíz del proyecto:

```bash
pnpm install --frozen-lockfile
pnpm db:start
node scripts/configure-local.mjs
node scripts/provision-staff.mjs demo@shelby.test "Presentación Shelby" owner
node scripts/seed-demo.mjs demo@shelby.test
```

`configure-local.mjs` se ejecuta solo si falta `.env.local`; nunca sobrescribe el existente. `provision-staff.mjs` se ejecuta solo para crear una cuenta nueva. Ambos comandos de contraseña solicitan la clave en la terminal sin mostrarla ni guardarla en el proyecto. Si ya existen Supabase local, `.env.local` y una cuenta de dueño, conservarlos y ejecutar únicamente `seed-demo.mjs` con el correo de esa cuenta. El sembrador comprueba que la URL de Supabase sea `localhost:54321`, utiliza permisos del dueño, configura ARS/horario argentino solo si faltan ajustes y no duplica las tres actividades ni los tres clientes al repetirlo.

## Abrir desde el teléfono

Buscá la dirección IPv4 de la PC en la Wi-Fi local (por ejemplo, `192.168.1.23`). En Windows aparece con `ipconfig`; en macOS, en Ajustes de Wi-Fi o con `ipconfig getifaddr en0`; en Linux, con `ip -4 addr`.

```bash
pnpm demo:local --host 192.168.1.23
```

Sustituí el ejemplo por la IP real. El comando comprueba que esa IP pertenezca a la PC, que Supabase local responda por ella y que `.env.local` apunte a la base **local**. No cambia el archivo de configuración ni instala dependencias; inicia Next.js aceptando esa dirección para que el navegador móvil pueda usar Auth y consultar los datos.

En el celular, conectado a **la misma Wi-Fi**, abrí `http://192.168.1.23:3000` en Safari o Chrome, con la IP real, e iniciá sesión con la cuenta de demostración. La app funciona en el navegador; no requiere instalarla desde una tienda. El inicio de sesión y los cambios persisten en la base Supabase local de la PC mientras esté activa.

Si la pantalla abre pero no deja iniciar sesión o cargar clientes, probá `http://IP_DE_LA_PC:54321/auth/v1/health` en el navegador del celular: debe responder con el estado del servicio. Si no responde, revisar el firewall de la PC para los puertos **3000 y 54321** en la red privada y comprobar que el router no aísle dispositivos invitados. Evitar Wi-Fi pública y no abrir esos puertos hacia Internet. La URL `localhost:3000` solo funciona en la PC, no en el teléfono.

## Recorrido para enseñar la app

1. En **Actividades**, abrir «Integral Shelby · muestra»: combina musculación y artes marciales, con un mes de duración y precio configurado por el dueño. También hay plantillas individuales.
2. En **Clientes**, buscar «Sofía Benítez · muestra». Su perfil tiene un primer abono repartido entre transferencia y efectivo y muestra el saldo pendiente sin confundirlo con el vencimiento. Desde ahí se puede registrar otro abono y ver el historial.
3. Usar el filtro **Al día** para encontrar a «Tomás Romero · muestra» y **Con saldo** para «Martina Suárez · muestra». La lista se actualiza entre sesiones de personal.
4. Mostrar **Nuevo cliente**: datos, actividad y primer abono están en el mismo formulario. Usar otro nombre ficticio si se quiere completar el alta durante la presentación.
5. Desde la cuenta del dueño, abrir **Importar Excel** para mostrar el asistente. La plantilla descargable y las reglas para edades, cuotas antiguas y pagos se explican en [IMPORTS.md](IMPORTS.md). Usar una planilla ficticia si se demuestra la importación completa.

El dinero que figura en la muestra es ilustrativo en **ARS**. La app registra cobros recibidos por fuera; no cobra mediante Mercado Pago. No ingresar información de clientes reales en este entorno.

Al terminar, `Ctrl+C` detiene Next.js. Si la base de datos se levantó solo para la muestra, `pnpm db:stop` detiene Supabase; los datos locales permanecen para la próxima sesión. El proyecto todavía requiere pruebas en dispositivos físicos y decisiones de producción antes de usarlo con clientes reales.
