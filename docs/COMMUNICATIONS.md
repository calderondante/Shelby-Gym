# Comunicaciones de Shelby Gym

Estado al 2026-10-26: centro de preparación implementado y aplicación Next/Supabase desplegada en Netlify. El gimnasio todavía no dispone de número exclusivo ni cuenta profesional lista para conectar. **WhatsApp manual disponible mediante Click to Chat; no hay envíos automáticos, credenciales Meta, webhook ni programador activo.** GitHub Pages es una demo local al navegador, sin backend; la implementación Next/Supabase guarda la configuración de forma persistente y restringida al dueño en su base de datos remota.

Ver [WhatsApp manual](WHATSAPP_MANUAL.md) para abrir cada chat con destinatario y texto ya preparados, sin usar la API.

## Uso

En **Mensajes** hay seis secciones:

- **Campañas:** elegir WhatsApp o Instagram, clientes concretos o socios con dos meses calendario desde el vencimiento de su última cuota, plantilla, oferta y fecha prevista opcional. Buscar y seleccionar hasta 500 personas habilitadas; revisar la personalización. Preparar conserva un mensaje privado por persona, sin crear grupos, enviar ni modificar cuotas o deudas.
- **Plantillas:** crear o editar mensajes por canal y uso: novedades, regreso y boletas. Las variables se sustituyen una sola vez; un nombre con llaves no se interpreta como instrucciones. Editar conserva las copias ya preparadas. Una plantilla usada por una regla mantiene canal/uso compatibles.
- **Automatizaciones:** configurar la preparación de regreso para clientes seleccionados o todos los elegibles; configurar boletas antes del vencimiento (3 días iniciales), ese día y repetición mientras haya saldo (cada día inicialmente). Los plazos y la hora son editables; el horario es Argentina. «Habilitar» habilita la regla de preparación, no un envío. «Revisar avisos de hoy» evalúa las reglas manualmente.
- **Dueños:** nombre y celular internacional de cada receptor de boletas; desactivar preserva el historial. El aviso es privado a cada dueño activo.
- **Canales:** guardar nombre del gimnasio, futuro número e Instagram. Los campos son opcionales hasta conseguir las cuentas. Guardar no conecta nada; no introducir contraseñas ni tokens.
- **Preparados:** últimas 200 copias personalizadas, destino, canal, fecha prevista y origen. WhatsApp permite abrir cada chat y copiar el texto; las marcas de revisión organizan esta visita, sin registrar entrega. Estados posibles: Preparado / Sin enviar y Cancelado. Se puede cancelar una copia antes de enviarla. Las campañas previas se conservan como borradores anteriores.

## Destinatarios y reglas

Celulares con formato internacional explícito (+ y código de país). No se adivina que un número incompleto sea argentino. El campo Instagram se normaliza a @usuario. Cada perfil tiene **autorizaciones separadas** para ofertas por WhatsApp e Instagram, inicialmente falsas. No se importan ni activan autorizaciones masivamente por suposición.

Los dos meses se cuentan desde el vencimiento de la última cuota, con ajuste al fin del mes; no desde el último mensaje, la baja ni el último pago. Los packs sin vencimiento no originan por sí solos una campaña de recuperación. Perfiles eliminados quedan fuera; una baja conserva su historial y puede recibir una propuesta si cumple las condiciones y autorizó el canal. Se vuelve a validar el lote en el servidor; si un destinatario dejó de cumplir, se rechaza todo el lote sin preparar la mitad.

Cada campaña usa una clave de idempotencia. La regla de regreso prepara una sola copia por cliente, vencimiento y canal. La regla de boletas evita duplicados por boleta, dueño y día: al revisar otra vez actualiza el saldo de una copia pendiente. Los avisos posteriores al vencimiento empiezan el primer día vencido y se repiten cada N días. «Solo recurrentes» está activo inicialmente; primero hay que generar la boleta del mes en Gastos. La revisión no crea nuevas obligaciones automáticamente.

Al revisar se cancelan propuestas automáticas cuando la cuota se renueva, se revoca el consentimiento, cambia el destino, el dueño se desactiva o la boleta se salda. El pago parcial reduce el saldo. Las copias manuales son snapshots revisables/cancelables: una futura integración debe revalidar **también en el instante de enviar**. Las reglas comienzan deshabilitadas. Las propuestas canceladas no se reactivan solas: preparar una campaña nueva permite revisión explícita.

Ver [guía de vinculación de WhatsApp e Instagram](META_SETUP.md), investigada el 26/10/2026, con requisitos del dueño, pasos de Meta, limitaciones y desarrollo pendiente.

## Conectar más adelante

1. Obtener el número exclusivo y la cuenta de WhatsApp Business Platform; confirmar empresa, permisos, consentimiento y mecanismo para darse de baja. Registrar/promover las plantillas que Meta exija para iniciar conversaciones.
2. Tener Instagram profesional y configurar la aplicación Meta, permisos y callbacks. El @ no sustituye el identificador de usuario de la conversación: la API oficial requiere que la persona haya iniciado el contacto y un Instagram-scoped ID. No existe aquí una función de mensajes fríos por @.
3. Implementar OAuth/webhooks con verificación de firma e idempotencia. Secretos exclusivamente en servidor/gestor de secretos, nunca en campos del navegador, Git ni variables públicas. Verificar políticas, versiones y ventanas de mensajería vigentes al conectar.
4. Añadir por migración una cola de envío con estados reales, intentos, bloqueo concurrente, límites del proveedor, retries prudentes y recibos. Una copia preparada no cuenta como enviada. Revalidar consentimiento, cuotas, deuda y ventanas antes de despachar; cancelar propuestas obsoletas.
5. Desplegar Next y Supabase remotos con autenticación real y un programador protegido. GitHub Pages no ejecuta tareas ni protege datos privados con su PIN de demostración.
6. Probar con números de prueba, revisar contenido, límites, coste y monitoreo. Activar canales/reglas de forma deliberada cuando los dueños estén listos. No enviar campañas reales como prueba de desarrollo.

Estas tareas quedan pendientes hasta disponer de las cuentas. La alternativa manual ya puede utilizarse sin esta conexión; los envíos automáticos siguen pendientes.

## Verificación

- `pnpm test`: reglas de calendario, consentimiento por canal, números, variables y repetición de boletas.
- `pnpm test:integration`: regresión existente de Auth/RLS, cuotas, importación y caja.
- `pnpm test:communications`: integración adicional con Auth/PostgREST reales y datos sintéticos; requiere Docker y el contenedor PostgreSQL local. Por defecto `supabase_db_shelby-gym`; se puede indicar `SUPABASE_TEST_DB_CONTAINER`. Nunca apunta a una base remota.
- `pnpm test:e2e`: workflows Next, permisos, responsive y accesibilidad automática; preparar fixtures de integración antes de ejecutar.
- `pnpm test:pages:communications`: demo en `http://127.0.0.1:4173/gestion/` o `PAGES_BASE_URL`, con datos ficticios en un contexto aislado.

## Fuentes primarias para la futura integración

- [Política de WhatsApp Business](https://business.whatsapp.com/policy/preview?lang=es_LA): consentimiento, bajas y requisitos para iniciar mensajes.
- [WhatsApp Cloud API — colección oficial Meta](https://www.postman.com/meta/whatsapp-business-platform/collection/wlk6lh4/whatsapp-cloud-api).
- [Instagram API — colección oficial Meta](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-af579d08-121e-4897-8f45-5fd41ace49df): cuenta profesional, permisos y conversaciones iniciadas por el usuario.
- [Instagram: mensaje de texto — Meta](https://www.postman.com/meta/instagram/request/1rgmhuk/text-message): destinatario mediante Instagram-scoped ID.

Las políticas cambian; verificar la documentación vigente al implementar la conexión real.
