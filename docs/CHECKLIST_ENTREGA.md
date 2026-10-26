# Checklist de entrega operativa — Shelby Gym

Fecha: **26 de octubre de 2026, horario de Argentina**. Objetivo: preparar la entrega al comprador para un gimnasio de hasta 100–200 socios. Este documento es una ruta de trabajo: las casillas pendientes no representan funciones terminadas ni un despliegue ya realizado.

## Qué puede entregarse primero

Propuesta de primera entrega: gestión online con datos compartidos, cuentas del personal y WhatsApp asistido —abrir el chat con el mensaje preparado y confirmar el envío en WhatsApp—. Instagram mantiene el @ y el enlace del perfil. **El comprador debe aceptar expresamente este alcance si esperaba automatizaciones o una bandeja de conversaciones.**

Los envíos automáticos, la lectura/respuesta de conversaciones dentro de la app y la vinculación oficial de Meta son una etapa adicional. Si forman parte de la venta ya acordada, la entrega no se considera completa hasta implementarlos y probarlos; no se sustituyen por botones manuales sin acuerdo.

## 0. Base que ya tenemos

- [x] Código operativo Next.js/Supabase y demo publicados en GitHub.
- [x] Clientes, actividades temporales y packs de clases, abonos parciales/mixtos, deuda, bajas, regreso y retiro recuperable implementados.
- [x] Cumpleaños/sorteo, historial mensual, gastos, exportación y cierres implementados.
- [x] Centro de comunicaciones con plantillas, selección y mensajes preparados; distingue preparado de enviado.
- [x] Auditoría local de 45 días: 37 perfiles, 127 operaciones, 49 movimientos y 159 verificaciones de escenarios correctas.
- [x] Build de producción verificado localmente, 28 tests de dominio y 12 E2E correctos; permisos, concurrencia y pérdida de respuesta comprobados.
- [x] Correcciones de seguridad de dependencias y protección de zona horaria incorporadas.
- [x] Existe un proyecto Supabase activo accesible en la cuenta conectada. **No se verificó como destino de Shelby ni se modificó.**

Evidencia y límites en [la auditoría](AUDIT_2026-10-26.md). Estas pruebas no acreditan un despliegue remoto ni teléfonos físicos.

## 1. Confirmar alcance y responsables — vendedor y comprador

- [ ] Acordar por escrito qué se entrega hoy, funciones incluidas y pendientes. Distinguir WhatsApp manual, automatización y bandeja de mensajes.
- [ ] Definir quién administra las cuentas de infraestructura y conserva el código: vendedor como servicio o comprador, según el acuerdo comercial.
- [ ] Confirmar correos de los dueños y monitores, roles y responsable de autorizar importaciones de datos.
- [ ] Acordar precio de entrega/mantenimiento, soporte y quién asume un eventual plan pago si el gratuito deja de alcanzar.
- [ ] Aceptar las condiciones del plan gratuito y definir seguimiento de consumo; no prometer disponibilidad o coste cero ilimitados.

## 2. Preparar infraestructura — titular de las cuentas y desarrollador

- [ ] Confirmar si el proyecto Supabase encontrado se dedicará a Shelby o si se necesita otro. Inspeccionar estructura, migraciones y datos antes de decidir; no asumir que está vacío.
- [ ] Crear o habilitar Netlify Free bajo el titular acordado. Es la ruta de alojamiento gratuito propuesta; todavía hay que verificar el adaptador y el despliegue de este Next.js allí.
- [ ] Separar pruebas de producción. No conectar previews ni las suites que crean fixtures a datos reales.
- [ ] Elegir región, URL del proyecto y subdominio gratuito definitivo. Un dominio comprado es opcional para esta primera entrega.
- [ ] Revisar el destino y el impacto de las migraciones; respaldar cualquier dato existente antes de aplicarlas. No resetear una base compartida para preparar la entrega.
- [ ] Aplicar el historial de migraciones y revisar RLS, grants y permisos en el proyecto elegido.
- [ ] Desplegar **la aplicación Next de `main`**, no la demo estática de `gh-pages`.
- [ ] Configurar variables del entorno mediante el panel seguro del proveedor. La app de gestión solo necesita URL y clave pública de Supabase; la service role es para provisión administrativa restringida, nunca para el navegador.
- [ ] Comprobar HTTPS, cookies, políticas de caché, cabeceras y autenticación en el alojamiento elegido.

Referencias: [Netlify](https://www.netlify.com/pricing/), [Next.js en Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/), [Supabase](https://supabase.com/pricing). Revisar las condiciones vigentes al contratar; esta checklist no contrata servicios.

## 3. Cerrar funciones necesarias de la primera entrega — desarrollador

- [ ] Implementar el botón **Abrir WhatsApp** con teléfono internacional y mensaje personalizado. Actualmente se preparan copias; no existe todavía este botón en el código revisado.
- [ ] Probarlo en celular y PC. El operador confirma cada envío en WhatsApp; no se puede afirmar enviado/entregado desde nuestra app por haber abierto un enlace.
- [ ] Acordar qué cuenta de WhatsApp usará recepción. Un enlace abre la cuenta iniciada en el dispositivo; escribir el número del gimnasio en Ajustes no cambia el remitente.
- [ ] Acordar e implementar la corrección auditada de abonos de socios: permiso, motivo, original conservado y ajuste trazable. Verificar saldo, ingresos y cierres; no resolverlo borrando o editando pagos en la base.
- [ ] Configurar creación de cuentas propias y desactivar registro público también en remoto. El PIN `SHELBY26` pertenece exclusivamente a la demo y no es una credencial de entrega.
- [ ] Agregar recuperación de acceso o documentar y probar un procedimiento administrativo seguro. El código actual tiene login, pero no una pantalla de autoservicio para restablecer contraseña.
- [ ] Mantener visibles los estados «Pendiente de conectar» y «Sin enviar» de las integraciones no activadas. No presentar simulaciones como conexiones reales.

## 4. Preparar datos y recuperación — comprador y desarrollador

- [ ] Configurar ARS y `America/Argentina/Buenos_Aires` antes de crear cuotas/gastos. Después quedan protegidos para conservar el historial.
- [ ] Crear las actividades reales, duraciones, precios y ofertas aprobados por el comprador.
- [ ] Elegir inicio limpio o importación Excel. Si se importa, conservar el original, revisar columnas, duplicados, importes históricos y deuda; confirmar el lote antes de incorporarlo.
- [ ] Verificar que producción no contenga clientes, pagos ni contactos ficticios de QA. Limpiar únicamente fixtures identificados, nunca con un reset general sobre datos reales.
- [ ] Definir información personal necesaria, acceso y tratamiento de datos con el gimnasio.
- [ ] Configurar una copia restaurable de la base, ubicación segura, frecuencia y responsable. El CSV no reemplaza un backup de PostgreSQL.
- [ ] Probar la restauración en otro entorno y documentar cómo recuperar la operación. El plan gratuito requiere organizar esta protección; no asumir el backup administrado de un plan pago.

## 5. Aceptación del comprador — en la URL definitiva

- [ ] El dueño entra con su cuenta y el monitor no puede cambiar ajustes, comunicaciones o acciones reservadas.
- [ ] Desde un teléfono se crea un cliente; desde otra sesión de PC aparece con la misma cuota y saldo.
- [ ] Se registra pago completo, parcial y dividido entre medios; el saldo y el historial concuerdan y no hay duplicados.
- [ ] Se completa una deuda antigua sin renovar la cuota equivocada; un regreso conserva la deuda y comienza desde el nuevo abono.
- [ ] Baja, retiro y recuperación conservan movimientos. Una actividad todavía vigente no induce un cargo nuevo.
- [ ] Se consume/corrige una clase, se revisa el sorteo y se comprueban los filtros de vencimientos y más de 30 días.
- [ ] Gastos, corrección de pagos y resumen/cierre mensual cuadran con un conjunto de prueba conocido.
- [ ] WhatsApp manual abre el destinatario y texto correctos; no se envía nada a personas reales como prueba técnica sin una instrucción expresa.
- [ ] Se prueba Safari/iPhone o Chrome/Android físico según los equipos disponibles, más PC; formularios, teclado, desplazamiento y acciones resultan usables.
- [ ] Una pérdida de conexión no muestra un pago como confirmado ni aconseja repetirlo sin consultar el historial.
- [ ] Backups, recuperación de acceso y límites del hosting están documentados y accesibles al responsable.

Las pruebas funcionales de aceptación usan datos identificados de prueba antes de cargar la información real. No ejecutar las suites masivas sobre la base de producción.

## 6. Entregar y registrar la aceptación

- [ ] Entregar URL definitiva y cuentas personales por un medio seguro; no incluir contraseñas en Git, en esta checklist ni en un documento público.
- [ ] Dar una guía breve de alta, cobro, deuda, regreso, corrección y exportación, con explicación de los estados de mensajes.
- [ ] Mostrar al comprador el circuito completo y registrar su aceptación, incidencias y pendientes concretos.
- [ ] Entregar contacto de soporte, cobertura acordada, responsable de backups y procedimiento para reportar fallos.
- [ ] Registrar versión entregada, fecha de entrada en uso y responsable. La demo de GitHub debe seguir identificada como demostración.

**Criterio de entrega:** alcance aceptado, URL operativa con datos compartidos, acceso real, pruebas críticas aprobadas, recuperación comprobada e instrucciones entregadas. Crear cuentas, publicar una URL o pasar los tests locales no basta por sí solo.

## Etapa Meta — si los envíos automáticos forman parte de lo vendido

- [ ] Conseguir el número exclusivo, preparar WhatsApp Business Platform y disponer de Instagram profesional.
- [ ] Completar la conexión oficial y los permisos/revisiones que Meta exija, sin compartir contraseñas por chat.
- [ ] Registrar consentimiento, bajas y plantillas; confirmar tarifas y responsable del gasto antes de habilitar campañas.
- [ ] Implementar recepción de eventos, validación de webhooks y, si se incluye, bandeja para leer/responder conversaciones.
- [ ] Implementar programador y cola de envíos con reintentos, límites, deduplicación y estados reales de entrega/error.
- [ ] Revalidar cuota, saldo, consentimiento y ventana habilitada antes de cada envío; cancelar avisos obsoletos.
- [ ] Comprobar con destinatarios de prueba autorizados y habilitar reglas gradualmente.

El @ de Instagram no permite iniciar mensajes privados a cualquiera; su API tiene condiciones de conversación. Los avisos automáticos no se consideran entregados hasta que las cuentas y el servicio estén conectados y probados. Protocolo técnico en [COMMUNICATIONS](COMMUNICATIONS.md).

## Orden práctico para hoy

**Alcance acordado → cuentas/destino → despliegue → funciones pendientes → datos y recuperación → prueba en dos equipos → capacitación y aceptación.**

El número aún pendiente no bloquea publicar la gestión si se acuerda separar Meta. La falta de cuentas de hosting, permisos, corrección de abonos o pruebas de aceptación sí puede impedir una entrega completa hoy. No hay una hora garantizada ni un despliegue realizado por crear esta ruta.
