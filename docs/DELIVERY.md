# Despliegue operativo — 26/10/2026

La aplicación Next de `main` está publicada en https://darling-smakager-792ffe.netlify.app con el adaptador oficial OpenNext de Netlify. Versión de código publicada: `4e6cf06`. Se corrigió la importación inicial de la demo estática y se configuró la rama de producción `main`. El PIN de GitHub Pages no sirve en este acceso.

Proyecto remoto: `smgxymlfjcdxabgippby`, organización **Shelby Gym**. Se comprobó que estaba vacío antes de aplicar las 18 migraciones versionadas. Hay 26 tablas públicas con RLS; no se cargaron clientes, pagos ni actividades ficticias. Se creó una identidad técnica de dueño con configuración ARS y `America/Argentina/Buenos_Aires`. El registro público está desactivado.

El dueño elige su contraseña con un enlace de activación de un solo uso entregado por un canal privado. El enlace no se almacena en este repositorio. Luego entra solo con contraseña y la puede cambiar desde Ajustes. Ver [acceso](ACCESS.md). La primera activación y la aceptación del dueño en dispositivos físicos quedan pendientes de su interacción.

Verificación: build y checks locales aprobados, 40 tests unitarios, 15 recorridos E2E cubiertos y suite de contraseña/activación con revocación de sesiones aprobada. En remoto se verificaron Auth del dueño, permisos de lectura, rechazo de consultas anónimas, login público en navegador a cinco anchos y axe sin violaciones. Las rutas privadas respondieron HTTP 307 hacia el login al comprobarlas sin sesión. Hubo fallos intermitentes de conexión del proxy de este entorno al navegar rutas remotas; no se sustituyen las pruebas pendientes en celulares físicos por esa comprobación.

Comunicaciones sigue siendo preparación de mensajes: no hay proveedor conectado ni envíos automáticos. Backups, restauración, aceptación comercial y otras funciones pendientes siguen en [checklist](CHECKLIST_ENTREGA.md). La demo estática anterior se conserva en GitHub Pages y guarda únicamente en el navegador.

---

# Estado de publicación

Ruta vigente para pasar a una entrega operativa: [checklist de entrega del 26/10/2026](CHECKLIST_ENTREGA.md). Distingue lo implementado, las tareas pendientes y los criterios de aceptación; no implica que producción ya esté desplegada.

La muestra estática se publica en https://calderondante.github.io/Shelby-Gym/gestion/. La actualización del 2026-10-20 está autorizada para publicación directa, sin video. El código de la app operativa Next.js/Supabase está en `main`; el alojamiento con datos compartidos aún requiere configuración. Los apartados históricos siguientes conservan instrucciones de entregas anteriores. Ver [cambios actuales](UPDATES_2026-10-20.md).

# Entrega de Shelby Gym — 2026-10-03

Primera versión funcional local con datos sintéticos, autorizada por el usuario. Moneda **ARS** y zona **America/Argentina/Buenos_Aires**, confirmadas explícitamente. No hay despliegue de producción, remoto Git ni push.

## Abrir y probar

Seguir [DEVELOPMENT](DEVELOPMENT.md). La sesión de desarrollo sirve la app en el puerto 3000 con Supabase local. Los accesos aleatorios de QA están exclusivamente en `.env.test.local` (ignorado). Crear cuentas propias con el script de provisión para un entorno independiente.

- Registro de clientes y primer abono en una pantalla.
- Actividades o planes combinados, precio, duración y oferta configurables por el dueño.
- Abonos parciales o repartidos entre transferencia, efectivo y Mercado Pago; no cobra dinero ni conecta una pasarela.
- Perfil, historial, deuda y vigencia separadas, búsqueda y filtros; actualización entre sesiones.
- Auth de personal y permisos de dueño/monitor, RLS y migraciones versionadas.

## Copias en Drive

Carpeta autorizada por el usuario: [Shelby Gym — Desarrollo](https://drive.google.com/drive/folders/1UM0Kt6ypEe3c32IpauafCo8Jb9yhy_zH).

- [Código](https://drive.google.com/drive/folders/1cnUpowERrIL-2NCc4DpO9kmKS61YdnXb): archivo comprimido del código, lockfile, migraciones, skills y documentación.
- [Diseño](https://drive.google.com/drive/folders/175HXdPdsXJXepElIih4ulveOd_xIoC8J): capturas de la app y propuesta visual con referencias de marca.
- [Documentación](https://drive.google.com/drive/folders/10T5UZ4xHtQ4WMqNRxpJVs_JBYICcv3sF): instrucciones y alcance de esta entrega.

Las copias son snapshots manuales. Drive no sincroniza cambios posteriores, no reemplaza Git y no contiene el backup de PostgreSQL. No se compartieron públicamente las carpetas ni se cambiaron permisos.

El exportador limita las rutas, rechaza secretos locales conocidos, symlinks, entornos, reportes, logs y estado de Supabase. No incluye `.git`, dependencias, builds, credenciales ni datos de clientes. Las capturas muestran exclusivamente personas ficticias de QA.

```bash
node scripts/export-workspace.mjs /tmp/shelby-gym-source-nueva-version.tar.gz
```

Requiere Git y tar; elegir un destino nuevo fuera del repositorio. Conservar el SHA-256 que imprime. Para restaurar, extraer en una carpeta nueva y seguir DEVELOPMENT; se requiere generar credenciales propias y levantar una base nueva.

## Antes de usar con clientes reales

Confirmar las reglas provisionales de vencimiento/renovación/corrección descritas en PRODUCT y DATA_MODEL. Acordar privacidad, retención, responsables, backups y recuperación; conseguir el logo original. Probar Safari/iPhone y Chrome/Android físicos. Luego configurar staging, Supabase/Vercel, dominio y cuentas del personal. La publicación sigue pendiente.

La evidencia ejecutada y sus límites están en [QA](QA.md). La automatización de Chromium y axe no certifica todos los navegadores ni una conformidad WCAG completa.

## Actualización del 2026-10-04 — Excel e interacción

Disponible en **Clientes → Importar Excel** para el dueño. Incluye edad referenciada, múltiples cuotas/actividades, importes históricos frente a inflación, pagos anteriores mixtos, saldos de apertura y detección de duplicados, con preview y confirmación. Guía completa: [IMPORTS](IMPORTS.md).

Se aplicaron `emil-design-eng` y `animate` desde las skills locales: pulsación, continuidad de pasos, details y confirmaciones; teclado y reduced motion sin desplazamientos. Sin instalar un framework de animación.

La carpeta Código contiene una nueva copia fechada `2026-10-04`, conservando la anterior. Diseño contiene las capturas de importación y Documentación la guía. Las copias siguen excluyendo credenciales, planillas reales, DB, logs y sesiones. Para una copia posterior, ejecutar el exportador con un nombre nuevo.

La actualización incluye también una grabación real de la interacción en `docs/design/motion/importacion-demo.webm`, con datos sintéticos y sin credenciales.

## Muestra funcional local — 2026-10-13

[Copia actualizada del código para la PC](https://drive.google.com/file/d/1b5KdNnspSSHbuHcnkLTQVx1ReDO024hu/view) en la carpeta Código. Contiene `scripts/demo-local.mjs`, `scripts/seed-demo.mjs`, [instrucciones para abrir la app desde un celular](DEMO_LOCAL.md) y capturas verificadas. No incluye `.env.local`, `.env.test.local`, base de datos, cuentas, contraseñas ni sesiones; al restaurarla se crean credenciales locales nuevas y se preparan tres clientes ficticios mediante el sembrador.

La copia conserva las versiones anteriores en Drive. No habilita acceso desde un teléfono a este entorno cloud: para una prueba física hay que ejecutar el proyecto en la PC de la misma red Wi-Fi que el teléfono.
