# Shelby Gym

Aplicación de gestión de clientes, actividades, suscripciones y cuotas para PC, tablet y celular. Identidad negra, roja y blanca, basada en el diseño revisado con el usuario.

Primera versión implementada en Next.js, React, TypeScript strict, Tailwind, shadcn/ui y Supabase. La aplicación con datos reales requiere configurar Supabase y hosting; todavía no está conectada a producción. No cobra dinero: registra abonos externos por transferencia, Mercado Pago y efectivo, también parciales o repartidos. La [demo móvil en GitHub Pages](https://calderondante.github.io/Shelby-Gym/gestion/) usa únicamente datos ficticios guardados en el navegador.

## Empezar

Requisitos: Node 22/24, pnpm 11.19.0 y Docker.

```bash
pnpm install --frozen-lockfile
pnpm db:start
node scripts/configure-local.mjs
node scripts/provision-staff.mjs tu-correo@ejemplo.com "Tu nombre" owner
pnpm dev
```

Abrir <http://localhost:3000>. Confirmar la configuración inicial en Ajustes, crear una actividad y registrar el primer cliente. Shelby Gym usa **ARS y America/Argentina/Buenos_Aires**, confirmado por el usuario.

Para una presentación interactiva desde un teléfono en la misma Wi-Fi que la PC, consultar [Muestra funcional local](docs/DEMO_LOCAL.md). Incluye datos ficticios listos para buscar y un comando que inicia la app con la IP correcta de la red.

Ver [Desarrollo y operación](docs/DEVELOPMENT.md) para setup, permisos, pruebas y requisitos de staging. Los accesos de QA de esta sesión están en `.env.test.local`, ignorado; nunca copiarlos a Drive ni usarlos en producción.

## Funcionalidad

- [Acceso](docs/ACCESS.md) con contraseña única para dueños o cuentas individuales, con permisos en servidor y DB. Cambio de clave desde Ajustes y activación de un solo uso.
- Plantillas de actividad o combinación con precio, duración y oferta manual.
- Alta con datos, actividad y primer abono en el mismo formulario.
- [Carga desde papel](docs/PAPER_REGISTRATION.md): cuotas anteriores vigentes o vencidas, precio original, deuda y clases ya usadas, sin Excel obligatorio ni caja ficticia.
- Lista global buscable y paginada, con filtros de saldo, vencimientos, bajas y perfiles eliminados de la lista.
- Perfil con períodos, deuda y desglose de pagos; completar una cuota no cambia su vencimiento.
- Baja y retiro reversibles, regreso con cuota desde el nuevo primer abono e historial mensual con recorrido diario de movimientos.
- Abonos transaccionales, idempotentes y protegidos contra sobrepagos concurrentes.
- Packs de clases sin vencimiento, asistencia con deuda confirmada y correcciones trazables.
- Instagram opcional, cumpleaños por mes y sorteo solo para socios con participantes conservados al cierre.
- Gastos, plantillas recurrentes, pagos mixtos, resumen mensual, cierre conservado y descarga CSV/vista PDF.
- [WhatsApp manual](docs/WHATSAPP_MANUAL.md): destinatarios y textos preparados, apertura individual, copia y revisión, sin Cloud API.
- [Comunicaciones](docs/COMMUNICATIONS.md): selección de clientes, plantillas WhatsApp/Instagram, mensajes privados personalizados, reglas de regreso a dos meses y avisos de boletas a dueños. Conexión preparada; no hay cuentas conectadas ni envíos efectivos.

La renovación anticipada, pausas, corrección/anulación de abonos y gestión visual del personal no forman parte de esta primera entrega. Ver reglas y pendientes en [Producto](docs/PRODUCT.md).

Informe de [auditoría de 45 días de uso](docs/AUDIT_2026-10-26.md), correcciones y pendientes antes de producción.

## Verificar

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node scripts/verify-workspace.mjs
```

Con Supabase local y la app corriendo:

```bash
pnpm test:integration
pnpm test:e2e
```

Las pruebas agregan **datos sintéticos**. No hacen escrituras en remoto. Resultados y limitaciones en [QA](docs/QA.md).

Ver [actualización del 20 de octubre](docs/UPDATES_2026-10-20.md) para las reglas aprobadas y el alcance de publicación.

## Documentación y diseño

- [AGENTS.md](AGENTS.md): constitución técnica para Codex.
- [Instalar Shelby Gym](docs/PWA.md): acceso desde el icono sin barra de direcciones, en celular o PC.
- [Estado de entrega](docs/HANDOVER_STATUS.md): funciones listas, comprobaciones remotas y pendientes del comprador.
- [Arquitectura](docs/ARCHITECTURE.md), [modelo de datos](docs/DATA_MODEL.md), [seguridad](docs/SECURITY.md), [decisiones](docs/DECISIONS.md).
- [Sistema de diseño](docs/DESIGN_SYSTEM.md), [capturas de la app](docs/design/screenshots/app/), [prototipo de referencia](docs/design/shelby-preview.html).
- [Skills](docs/SKILLS.md): 16 skills locales en `.agents/skills/`, con inventario, origen e integridad verificables.
- [Entregables en Drive](docs/DELIVERY.md): copias de fuente y diseño, excluyendo secretos y datos de DB.

El repositorio GitHub guarda el código. Drive conserva copias exportadas; la demo pública y la aplicación con base de datos tienen despliegues separados.

Desde el 2026-10-04: [importación de Excel](docs/IMPORTS.md) desde Clientes → Importar Excel (dueño), incluyendo edad, precios históricos y pagos anteriores. Motion refinado con las skills locales de Emil; sin framework de animación adicional.
