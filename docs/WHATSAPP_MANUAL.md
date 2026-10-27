# WhatsApp manual con destinatario y texto preparados

Disponible para el dueño en la app de gestión. Usa los enlaces oficiales **Click to Chat** de WhatsApp, sin Cloud API ni cargos de esa API. El operador confirma cada envío en WhatsApp; los costes habituales de conexión y alojamiento son independientes.

## Uso

1. Abrir **Mensajes → Preparar mensaje**.
2. Elegir una plantilla, ajustar el texto/oferta y seleccionar los clientes habilitados. Los nombres y las variables se personalizan por destinatario. Para contactar hace falta celular internacional válido y autorización vigente para las ofertas del canal.
3. Pulsar **Preparar mensajes privados**. Se conserva una copia por persona y se abre la lista filtrada de esa campaña, con todos sus destinatarios (hasta 500). Las campañas anteriores tienen el enlace **Revisar mensajes de esta campaña**. La vista general muestra los últimos 200 avisos.
4. En **Listos para abrir**, tocar **Abrir WhatsApp** en la fila correspondiente. El chat se abre con el número y texto cargados. Confirmar el envío dentro de WhatsApp.
5. Volver a Shelby y usar **Ya revisé este mensaje** para recorrer la lista. El filtro **Solo WhatsApp por revisar** oculta las filas marcadas. Las marcas corresponden a esta visita a la pantalla, no son un historial compartido y no se conservan al recargar por completo.

**Copiar texto** permite pegar el contenido manualmente si el dispositivo no abre el chat como se espera. Los mensajes cancelados no se abren; los previstos para otra fecha quedan bloqueados hasta entonces.

Los avisos de cuotas, facturas y servicios para el dueño están en **Avisos**, con notificaciones Web Push incluso con la app cerrada, tras instalar y habilitar permisos en cada dispositivo. No se envían por WhatsApp. En iPhone requieren iOS 16.4 o posterior y abrir desde el icono de la pantalla de inicio.

## Qué cuenta envía

En el celular se utiliza la cuenta de WhatsApp que abra el sistema; en PC se puede usar WhatsApp Web o la aplicación disponible. Si se quiere enviar desde el número del gimnasio, iniciar WhatsApp/WhatsApp Business o Web con esa cuenta y comprobarla antes de confirmar. El número guardado en **Mensajes → Ajustes → Datos del gimnasio** es una referencia: no cambia el remitente del dispositivo.

No hace falta crear una integración Cloud API, aportar tokens ni tener a los destinatarios guardados en la agenda para usar Click to Chat. Cada cliente debe tener WhatsApp activo en el número indicado. Un enlace lleva a un destinatario: la selección múltiple se recorre chat por chat, sin crear grupos ni enviar un lote automático.

## Revalidación y privacidad

Antes de entregar el enlace, el servidor exige dueño activo y vuelve a comprobar el mensaje preparado, su canal, fecha prevista y destino. Revisa perfil, autorización y elegibilidad de regreso; para boletas verifica contacto activo, saldo y día de preparación. Compara el texto con el contexto actual para evitar abrir un aviso con nombres/importes/vencimientos desactualizados. Si cambió, se pide preparar una campaña nueva o revisar los avisos de hoy.

La comprobación ocurre al abrir el chat. El operador revisa y confirma lo que finalmente envía en WhatsApp. Una apertura no modifica deudas, cuotas ni estados de entrega: **la app no sabe si se confirmó, se recibió o se leyó**. Las copias siguen como preparadas hasta cancelarlas; la marca de revisión es solo una ayuda de esta pantalla.

El enlace interno solo acepta el ID del mensaje y consulta los datos autorizados. El destino externo se construye con dominio fijo `wa.me`, número internacional validado y texto codificado; no se acepta una URL externa del navegador. El enlace no se precarga. No se abren chats automáticamente al cargar la pantalla. Se evita enviar el referente de la página y se usa `no-store` para revalidar en cada apertura.

## Alcance y verificación

No requiere migraciones, credenciales Meta ni dependencias nuevas. La conexión oficial de Instagram y la automatización de WhatsApp siguen pendientes y separadas.

Pruebas: teléfonos inválidos/inyección, caracteres reservados/acentos/saltos, dos destinatarios privados, progreso local, copia, permisos owner/monitor/anónimo, cancelación, fecha futura, consentimiento/contacto cambiados y saldo actualizado. El E2E comprueba la respuesta de redirección y sus atributos sin navegar a WhatsApp ni enviar mensajes reales. Apertura nativa y sesión de WhatsApp del comprador se verifican en su celular/PC.

Fuente primaria: [Centro de ayuda de WhatsApp — Click to Chat](https://faq.whatsapp.com/5913398998672934).
