# Vincular WhatsApp e Instagram a Shelby Gym

Investigación del **26/10/2026**. Guía para preparar la integración; no activa cuentas, envíos ni cobros. La app Next ya está alojada en Netlify y usa Supabase. En **Mensajes → Canales**, guardar el celular y el @ todavía registra datos de configuración: no autoriza a Meta ni conecta las APIs.

## Ruta recomendada

La prioridad elegida para esta instalación es [WhatsApp manual](WHATSAPP_MANUAL.md): enlaces con destinatario y texto preparados, sin cargos de Cloud API. Para una futura automatización, usar **WhatsApp Cloud API directamente con Meta** e Instagram como bandeja de conversaciones autorizadas. El negocio conserva la titularidad del número, el portfolio, la cuenta de Instagram y la facturación. La integración debe implementar la autenticación y los controles del proveedor antes de habilitar cualquier envío.

No se necesita esperar al número para preparar las cuentas, las plantillas, el consentimiento y el desarrollo en un entorno de prueba.

## Qué preparar con el dueño

- [ ] Identificar quién administra la cuenta de Facebook/Meta del gimnasio y habilitar su segundo factor.
- [ ] Crear o revisar el portfolio empresarial del gimnasio en [Meta Business Suite](https://business.facebook.com/). Conservar su titularidad en el negocio; conceder permisos de desarrollo sin compartir contraseñas.
- [ ] Tener a mano nombre comercial, contacto, datos del negocio y documentación que Meta solicite. La verificación empresarial, la revisión de la aplicación y los límites concretos dependen del flujo y los permisos; no prometer aprobación inmediata.
- [ ] Confirmar el número emisor completo con código de país, acceso a SMS o llamada y si es nuevo, WhatsApp normal, WhatsApp Business o un número ya usado en otra API.
- [ ] Identificar los celulares de los dueños que recibirán avisos internos. Son destinatarios distintos del número emisor del gimnasio.
- [ ] Confirmar que el Instagram del gimnasio sea profesional: empresa o creador.
- [ ] Definir autorizaciones para avisos de cuota y para ofertas por separado, y cómo recibir/cumplir bajas.
- [ ] Acordar presupuesto de mensajería y responsable de revisar facturación y fallos.

## WhatsApp: vinculación inicial

1. Configurar una aplicación en [Meta for Developers](https://developers.facebook.com/apps/) con WhatsApp y asociarla al portfolio correcto. La configuración de inicio ofrece un número de prueba antes de incorporar el número real.
2. Crear o seleccionar la cuenta WhatsApp Business de la plataforma (WABA), incorporar el número, completar la comprobación por SMS/llamada y configurar su nombre y la verificación de dos pasos exigida para registrarlo.
3. Revisar facturación si se enviarán mensajes con coste. Preparar plantillas y someterlas a aprobación: por ejemplo, vencimiento de cuota, saldo pendiente y oferta de regreso. Meta decide su categoría y puede rechazar o reclasificar contenido; las promociones no se disimulan como avisos administrativos.
4. Configurar credenciales de producción con permisos mínimos y los identificadores WABA/Phone Number ID. El token temporal de pruebas no es una credencial de servicio duradera. Su custodia, revocación y renovación se administran en servidor.
5. Configurar y verificar el webhook HTTPS de nuestra integración y suscribir la aplicación a la WABA. Probar entrada de mensajes y estados reales de salida con destinatarios de prueba autorizados.
6. Activar primero un aviso controlado. Revisar destinatario, importe histórico, fecha argentina, plantilla, coste y resultado antes de habilitar reglas periódicas.

La [colección oficial de Meta](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api?entity=request-13382743-d0e227d1-e520-4b12-a8f6-32657a52d26e) documenta estos activos, permisos, registro y suscripción.

### Si el número ya se usa en el teléfono

Evaluar primero la **coexistencia oficial** o una migración adecuada. No borrar la cuenta ni trasladar el número como primer paso. Mantener WhatsApp Business móvil y Cloud API simultáneamente no es una propiedad automática de cualquier alta: depende de la elegibilidad y del proceso de onboarding disponible. El flujo de coexistencia se documenta en [onboarding de usuarios de WhatsApp Business](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users). Hay que comprobar sus requisitos actuales cuando se conozca el número; en esta investigación esa página respondió con limitación de acceso.

### Qué puede automatizar WhatsApp

Con consentimiento y configuración válida, los avisos de cuota y campañas de regreso se pueden programar. Iniciar mensajes fuera de la ventana de atención exige las plantillas aprobadas aplicables; tener el teléfono guardado no implica autorización para contactar. Las bajas deben impedir nuevos envíos. Ver [política oficial](https://business.whatsapp.com/policy/preview?lang=es_LA).

La [tarifa oficial](https://business.whatsapp.com/products/platform-pricing) depende de la categoría y del mercado del destinatario; Meta publica precios por mensaje entregado. No se presupone gratuidad para recordatorios automáticos ni se fija aquí una tarifa argentina. La conexión directa reduce intermediarios, pero no elimina los cobros de Meta.

## Instagram: vinculación inicial

1. Convertir o confirmar la cuenta como **profesional**, conservando su titularidad y recuperación en el gimnasio.
2. Configurar el producto de Instagram y el inicio de sesión oficial en la aplicación Meta. Para el alcance de mensajes, priorizar **Instagram API with Instagram Login**. Esta vía no exige vincular una página de Facebook; la alternativa con Facebook Login sí utiliza esa vinculación.
3. Solicitar únicamente los permisos necesarios para identidad profesional y mensajes: `instagram_business_basic` e `instagram_business_manage_messages`. No pedir publicación, comentarios o anuncios sin una función que los requiera.
4. Implementar el botón de conexión para que el dueño autorice la cuenta en Meta/Instagram y regrese a nuestra app. Completar revisión/acceso de producción según los permisos y las cuentas atendidas; el modo de pruebas con testers no sustituye la validación con usuarios reales.
5. Configurar webhooks y verificar el acceso a mensajes en los controles de herramientas conectadas, si la cuenta lo requiere. Recibir una conversación de prueba y conservar su identificador de usuario con alcance de Instagram.
6. Mostrar el estado de conexión, expiración y reconexión; refrescar credenciales cuando proceda. Guardar el @ no reemplaza esta autorización.

La [documentación oficial del flujo Instagram Login](https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login) distingue esta vía de Facebook Login y enumera los permisos actuales.

### Límite importante para nuestras campañas

La Send API exige que la persona haya iniciado el contacto con la cuenta profesional. El envío utiliza un **Instagram-scoped ID**, no el @ del perfil. Por tanto, no ofrecer una campaña automática a una lista de @ de exsocios como si fueran destinatarios habilitados. La respuesta debe respetar las ventanas y modalidades vigentes de Meta; el consentimiento comercial no elimina esas restricciones. Las excepciones de atención humana no se deben usar para automatizar promociones.

Referencias: [Send API de Meta](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-3a63181c-e5c6-4890-96dd-e4d425bef5e0), [mensaje de texto y destinatario](https://www.postman.com/meta/instagram/request/1rgmhuk/text-message). La duración exacta y las excepciones permitidas se deben revalidar con la documentación de la modalidad elegida antes de implementar; parte del portal de desarrolladores no fue accesible durante esta consulta.

## Desarrollo pendiente en nuestra app

El centro actual prepara campañas de regreso y avisos de boletas. Las reglas persistentes son `recovery` y `expense`; no hay todavía transporte Meta, webhook de recepción, envío real ni programador activo. Para incorporar avisos de vencimiento de socios también hay que ampliar las reglas y sus pruebas.

- [ ] Conexión autorizada por dueño, callbacks con `state` verificado, reconexión y desconexión. Los botones de conexión descritos son trabajo pendiente.
- [ ] Secretos de servidor y custodia cifrada de tokens si se persisten. Nunca `NEXT_PUBLIC_*`, formularios de contacto, Git ni logs.
- [ ] Webhooks públicos autenticados por firma de Meta, desafío de verificación, deduplicación y manejo de revocación/borrado.
- [ ] Cola real con estados preparado, en proceso, aceptado por proveedor, entregado, fallido y cancelado; bloqueo concurrente y tratamiento de entregas ambiguas. No equiparar respuesta HTTP exitosa con lectura del destinatario.
- [ ] Suscripciones y consentimiento separados por finalidad. Revalidar teléfono/IGSID, autorización, baja, deuda/renovación, plantilla y ventana en el momento de enviar.
- [ ] Diferenciar vencimiento de membresía y deuda: una cuota pagada puede estar por caducar y necesitar renovación. Pagar una deuda no reinicia la vigencia.
- [ ] Programador remoto y worker con identidad de servicio propia, hora argentina y horarios/repeticiones configurables. No reutilizar la contraseña ni una sesión del dueño: el cambio de clave cierra esas sesiones y las RPC actuales de preparación exigen dueño activo.
- [ ] Reporte interno para dueños, avisos de cuotas y boletas, y campañas de regreso a dos meses desde el vencimiento; mantener cancelación al cambiar la situación real y límites de repetición.
- [ ] Privacidad, revocación, retención y eliminación de datos. Preparar las URLs reales y la evidencia que solicite la revisión de Meta.
- [ ] Pruebas de fallo, duplicados, bajas, token vencido, renovación, cuota saldada y ventana cerrada antes de activar producción. No usar campañas reales como pruebas de desarrollo.

## Orden recomendado

1. Preparar portfolio, cuenta profesional, titularidad y consentimiento ahora.
2. Incorporar primero WhatsApp con un número de prueba y un aviso de cuota.
3. Registrar el número real y aprobar las plantillas necesarias.
4. Habilitar avisos de cuotas y boletas de forma controlada.
5. Incorporar la bandeja de Instagram para conversaciones válidas.
6. Activar campañas de regreso por WhatsApp con consentimiento y presupuesto revisados.

Si la misma solución se ofrece después a negocios ajenos mediante una aplicación Meta compartida, revisar el onboarding como proveedor, App Review y accesos avanzados. No asumir que la configuración de un solo negocio autoriza a conectar todos los futuros clientes.
