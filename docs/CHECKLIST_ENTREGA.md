# Checklist de entrega operativa — Shelby Gym

Actualizada el **27 de octubre de 2026, horario de Argentina**. Estado detallado y comprobaciones: [HANDOVER_STATUS.md](HANDOVER_STATUS.md).

**Situación:** gestión online operativa. El cierre de entrega requiere backups/restauración, carga real y aceptación de los dueños. La publicación y las pruebas locales no reemplazan esa aceptación.

## Infraestructura y acceso

- [x] Repositorio del comprador en GitHub; `main` conectado al despliegue de Netlify.
- [x] Supabase de Shelby Gym configurado, 18 migraciones y 26/26 tablas públicas con RLS.
- [x] Acceso real del dueño, registro público deshabilitado y contraseña desde 8 caracteres, modificable desde Ajustes.
- [x] Procedimiento de activación/recuperación de acceso documentado en [ACCESS.md](ACCESS.md), sin secretos versionados.
- [x] PWA con logo e instrucciones de instalación; apertura desde Android observada en el video del usuario.
- [ ] Aceptar la nueva versión instalada en iPhone/Safari, Android/Chrome y PC reales. Ver [PWA.md](PWA.md).
- [ ] Acordar responsable de infraestructura, soporte y seguimiento del consumo del plan gratuito.

## Funciones de gestión

- [x] Clientes, actividades, precios, meses/packs de clases, cuotas y pagos mixtos/parciales.
- [x] Alta histórica desde papel, deuda anterior, regreso con nueva cuota, archivo y recuperación de perfiles.
- [x] Historial por mes/día, pendientes mensuales, gastos y correcciones auditadas.
- [x] Cumpleaños, filtros y sorteo con elegibilidad/estado de cuota.
- [x] WhatsApp manual con destinatarios/textos preparados, apertura privada individual y confirmación en WhatsApp.
- [ ] Acordar expresamente si la entrega incluye solo WhatsApp manual o también automatización/Instagram. Registrar las funciones pendientes dentro del alcance comercial.

## Datos y recuperación — pendiente para el cierre

- [ ] Definir frecuencia, responsable y destino privado de las copias. La revisión remota encontró 0 backups disponibles y PITR deshabilitado.
- [ ] Comprobar una restauración en un entorno separado y registrar cómo recuperar clientes, cuotas y movimientos.
- [ ] Cargar/validar actividades y precios reales; pasar clientes y saldos desde el papel. En la revisión remota todavía no había actividades, clientes ni cobros.
- [ ] Conciliar con el dueño los totales iniciales y resolver duplicados o fechas dudosas antes de operar.
- [ ] Acordar acceso del personal, conservación de información y respuesta ante un equipo perdido o una clave olvidada.

GitHub y Drive almacenan código/entregables; no sustituyen una copia actual de PostgreSQL.

## Aceptación con los dueños

- [ ] Registrar un cliente nuevo y otro desde papel con vencimiento anterior.
- [ ] Cobrar completo, parcial y en dos medios; consultar deuda, historial y caja del mes.
- [ ] Registrar una baja, recuperar el perfil y abrir una nueva cuota conservando la deuda anterior.
- [ ] Utilizar un pack, descontar una clase y verificar su saldo sin inventar cuotas mensuales.
- [ ] Registrar una boleta, un pago parcial y una corrección; revisar totales y movimientos del día.
- [ ] Verificar cumpleaños del mes y siguiente, estado de cuota y elegibilidad del sorteo.
- [ ] Abrir WhatsApp con un número de prueba autorizado, comprobar remitente/texto y confirmar el envío manualmente.
- [ ] Ver un cambio desde otro equipo; comprobar pérdida de conexión sin asumir que un pago se guardó o aconsejar repetirlo sin consultar.
- [ ] Cambiar la contraseña y verificar que los dispositivos anteriores deban volver a entrar.
- [ ] Aceptar fluidez, teclado, formularios y desplazamiento en los teléfonos físicos y PC.

No ejecutar suites masivas con los clientes de producción. Las pruebas de desarrollo usan exclusivamente datos sintéticos locales.

## Entrega y soporte

- [ ] Entregar URL y recuperación de acceso por un medio seguro, con guía breve de alta/cobro/deuda/regreso/exportación.
- [ ] Explicar backups, límites de la PWA y canales manuales, y dejar un contacto y cobertura de soporte.
- [ ] Registrar versión, fecha de entrada en uso, responsable y aceptación/incidencias del comprador.

## Meta — solo si se contratan envíos automáticos o bandeja

- [ ] Número exclusivo y cuenta profesional de Instagram; titularidad del negocio y autorización oficial de Meta.
- [ ] Conexión, permisos/revisiones, consentimiento, bajas y plantillas aprobadas cuando correspondan.
- [ ] Transporte real, webhooks firmados, cola, programador, límites, reintentos y estados de entrega/error.
- [ ] Revalidar cuota/saldo/destinatario antes de cada envío y probar con destinatarios autorizados.
- [ ] Confirmar tarifas y responsable de facturación antes de activar mensajes con coste.

Guardar teléfono/@ no conecta una API. Abrir un chat no significa que se envió o entregó. Guías: [WhatsApp manual](WHATSAPP_MANUAL.md) e [integración futura](META_SETUP.md).
