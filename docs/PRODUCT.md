# Estado actual y reglas aprobadas

La actualización del 2026-10-20 está autorizada para implementación y publicación directa, sin video. Ver [detalle de la actualización](UPDATES_2026-10-20.md). Sus reglas prevalecen sobre las propuestas o preguntas históricas que se conservan debajo.

- Sorteo: solo socios con cuota; los packs de clases no otorgan participación. Se conserva el límite de más de 30 días desde el vencimiento y el alta anterior al cierre.
- Actividades: duración temporal o cantidad de clases sin vencimiento. Asistencia con deuda permitida tras confirmación de recepción.
- Recuperación: dos meses calendario desde el vencimiento de cuota. WhatsApp pendiente de configurar; campañas en borrador.
- Perfil: teléfono e Instagram opcional. Promociones requieren autorización registrada.
- Historial: cobros y gastos por día/mes, deuda actual por mes de origen, resúmenes descargables y cierres conservados.

# Producto

## Historial general del gimnasio (2026-10-19)

- Pestaña «Historial» para seleccionar un mes y recorrer sus días en una barra horizontal, con señal de movimiento y detalle del día elegido. Las fechas usan el horario de Argentina; el historial de cada cliente sigue disponible desde su perfil.
- El resumen mensual muestra el total cobrado en ese mes y el desglose entre transferencia, Mercado Pago y efectivo. Muestra aparte el **pendiente actual de cuotas iniciadas en el mes seleccionado** y el **pendiente actual de todo el gimnasio**. Ambos son saldos de hoy; no son cierres históricos congelados.
- «Cobrado en el mes» suma exclusivamente abonos registrados, incluso pagos repartidos entre transferencia, Mercado Pago y efectivo. Una cuota creada o un saldo pendiente no son dinero recibido.
- Cada abono muestra el cliente y la cuota original a la que se aplicó. Los pagos históricos importados se atribuyen a su fecha original y se identifican como importados; una importación antigua no infla la caja del día de carga.
- Las cuotas registradas, su importe pactado y su **saldo actual** aparecen en un bloque distinto de los ingresos. Se muestran además las altas y cambios de estado de perfiles.
- El saldo mostrado para un día anterior es el saldo **actual** de esa cuota; este primer historial no reconstruye un cierre contable congelado de ese día o mes. Correcciones, anulaciones, exportación y conciliación bancaria requieren definición aparte.

## Cumpleaños y sorteo (2026-10-19)

- El perfil guarda sólo el **mes** de cumpleaños. No se pide ni infiere día o año de nacimiento. Los perfiles anteriores de la demo con fecha completa se leen por mes.
- El filtro incluye a **todas** las personas que cumplen en el mes elegido, hayan cumplido ya o no. La lista separa participantes y excluidos; el contador del mes incluye ambos grupos.
- Cada persona muestra su **estado de cuota actual**: al día, pendiente (con importe), vencida, o vencida hace más de 30 días. Baja, retirada y ausencia de cuota conservan estados propios. El estado actual no altera retroactivamente la elegibilidad conservada al cierre del sorteo.
- En Clientes, el filtro Cumpleaños permite elegir el mes del sorteo. La lista separa participantes y excluidos, mostrando el motivo de exclusión.
- Antes de registrar la fecha del sorteo, la lista es una vista previa calculada al día de hoy en horario argentino. El dueño registra la fecha real del sorteo; para ese mes y año queda fijada y no se sobrescribe desde la app.
- Quien fue dado de alta **después** de esa fecha no participa en ese sorteo. Puede figurar en el sorteo del año siguiente si entonces cumple los demás requisitos.
- Queda fuera quien, al cierre, tenía el perfil de baja/retirado o cuya última cuota iniciada hasta el cierre había vencido **más de 30 días** antes. El día 30 todavía participa; desde el día 31 no. Una cuota futura no cuenta para un sorteo pasado.
- La lista se calcula con el historial de altas, períodos y cambios de estado. Los nuevos cierres conservan participantes y motivos. Los sorteos anteriores sin copia permanecen identificados como cierres históricos por fecha.

## Baja, retiro y regreso (2026-10-19)

- Una cuota vencida, incluso por más de 30 días, **no** elimina ni da de baja automáticamente al cliente. El filtro «+30 días» ayuda a revisar esos casos.
- «Dar de baja» y «retirar perfil» son estados reversibles. Ambos separan a la persona de la lista activa; Retirados tiene un filtro propio. Se conservan cuotas, precios históricos, pagos y saldos.
- Si vuelve después de uno o varios meses, la nueva cuota comienza el día del primer abono del regreso, con el precio vigente de la actividad. No se crean cargos por los meses ausentes. Cualquier saldo anterior queda visible por separado y puede abonarse contra su período original.
- Si la última cuota todavía está vigente, recuperar el perfil no crea otra cuota ni cobra de nuevo.
- El historial del perfil agrupa por día la creación, inicio y vencimiento de cuotas, abonos y cambios de estado. Un saldo al vencimiento se muestra con el importe que había pendiente ese día.
- El borrado físico de perfiles con historial financiero queda fuera de este flujo; la acción visible es reversible.

Estado: definición inicial del producto, con reglas operativas pendientes. Producto: gestión de clientes, suscripciones y cuotas de **Shelby Gym**, con musculación y artes marciales. Responsable: por definir. Última revisión: 2026-10-03.

Fuente: descripción del usuario y referencias de marca adjuntas en esta sesión. Distinguir requisitos expresados, propuestas de solución y decisiones pendientes. El usuario aprobó inicialmente la estética y autorizó empezar a codificar el 2026-10-03. La muestra estática está publicada en GitHub Pages; la app operativa Next.js/Supabase se verifica localmente y requiere hosting con base compartida.

## Problema del cliente

- Situación actual y herramientas: por definir; el gimnasio ofrece musculación y artes marciales.
- Necesidad expresada: admitir nuevos clientes fácilmente, crear sus perfiles y administrar suscripciones y cuotas con información actualizada.
- Resultado deseado: registrar un cliente y asignarle una actividad desde el mismo formulario; consultar rápidamente su suscripción y situación de cuota desde celular o PC.
- Problemas concretos del proceso actual, frecuencia, volumen y coste: por definir.
- Restricciones de presupuesto, fecha, país e infraestructura: por definir.

## Usuarios

| Usuario/persona | Objetivo                                                                       | Contexto y dispositivo                                                 | Permisos necesarios                                                                                     | Frecuencia  |
| --------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------- |
| Dueño           | Configurar las plantillas de actividades, precio, duración y oferta simultánea | Celular y PC                                                           | Configuración comercial expresamente asignada al dueño; otros permisos por definir                      | Por definir |
| Monitor         | Registrar si la cuota está abonada, importes por medio y saldo pendiente       | Celular y PC; también compatibilidad tablet/Android/iOS según baseline | Registro manual de pagos expresamente solicitado; alta/edición de clientes y correcciones por confirmar | Por definir |

El cliente del gimnasio es la persona cuyo perfil se administra. No se ha solicitado que tenga una cuenta o portal propio en la app. No asumir que cliente registrado equivale a usuario con acceso.

Definir roles con el cliente; no deducir permisos por el nombre de un rol. Separar identidad, rol y alcance de datos.

## Workflows

| ID    | Actor y disparador                                         | Precondiciones                                     | Flujo principal                                                                                                           | Errores/alternativas                                                                                        | Resultado y aceptación                                                                                                         |
| ----- | ---------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| WF-01 | Dueño configura una actividad/oferta                       | Acceso de dueño; reglas comerciales acordadas      | Crear o editar una plantilla reutilizable con actividad u oferta simultánea, precio, duración y oferta cuando corresponda | Mostrar validación y preservar datos ante error; efecto sobre suscripciones existentes por definir          | La opción queda disponible para seleccionarla al dar de alta un cliente con precio y duración visibles                         |
| WF-02 | Personal admite un nuevo cliente                           | Hay al menos una actividad/plan disponible         | Completar los datos del perfil, seleccionar/asignar actividad en el mismo formulario, revisar condiciones y guardar       | Sin actividades: explicar cómo configurarlas; error de guardado: conservar inputs; prevenir envío duplicado | Perfil y asignación quedan guardados; no se informa éxito parcial como alta completa                                           |
| WF-03 | Personal consulta una suscripción y cuota                  | Cliente registrado y acceso autorizado             | Encontrar al cliente y consultar actividad, vigencia/vencimiento y cuota aplicable                                        | Sin coincidencias: opción clara de alta; datos no disponibles: indicar error/actualización pendiente        | Información legible en celular y PC; tras una operación confirmada, la vista refleja el resultado                              |
| WF-04 | Monitor registra un pago recibido fuera de la app          | Cliente y cuota identificados; permiso de registro | Introducir importe recibido y medio, añadir otro medio si corresponde, revisar total y saldo y guardar                    | Pagos parciales admitidos; conservar inputs ante fallo y evitar registro duplicado                          | Se conserva el desglose; situación de pago y saldo reflejan los importes confirmados sin procesar dinero desde la app          |
| WF-05 | Monitor registra un abono posterior de una cuota pendiente | Cuota existente con saldo pendiente                | Registrar nuevo importe y medio sobre la misma cuota, mostrar acumulado y saldo actualizado                               | Correcciones/anulaciones por definir; no convertir el abono en una nueva cuota por defecto                  | El segundo abono conserva el historial y reduce el saldo de la cuota original; no representa por sí solo una nueva suscripción |

Para cada workflow: espera, ausencia de datos, fallos de red, errores del usuario, recuperación/deshacer, confirmación y uso táctil. Describir reglas de negocio y origen de los datos antes de diseñar pantallas o tablas.

## Conceptos de producto (sin schema)

Propuesta de vocabulario para evitar mezclar qué se practica, qué se contrata y qué se paga:

| Concepto                 | Significado propuesto                                                                                                                                                               | Pendiente                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Actividad                | Disciplina o servicio ofrecido; musculación y artes marciales son ejemplos expresados                                                                                               | Catálogo concreto de disciplinas                                  |
| Plan/plantilla comercial | El dueño configura actividad/oferta simultánea, precio y duración; ofertas cuando correspondan                                                                                      | Presentación exacta de combinaciones y condiciones de descuentos  |
| Perfil del cliente       | Datos de la persona a la que se asigna la actividad                                                                                                                                 | Campos mínimos, identificación y búsqueda de duplicados           |
| Suscripción              | Lo que el cliente contrata, asociado a la plantilla y su duración; comienza al registrar el primer abono, aunque quede saldo; un mes iniciado el 11 de febrero vence el 11 de marzo | Renovaciones, pausas, alta sin ningún abono y casos de fin de mes |
| Cuota                    | Importe correspondiente al período contratado, con total, abonado acumulado y saldo pendiente                                                                                       | Ofertas, recargos, excedentes o ajustes no solicitados            |
| Pago/abono               | Dinero recibido fuera de la app y registrado por el monitor; puede ser parcial y repartirse entre medios                                                                            | Requisitos de verificación, corrección y comprobantes             |

Mostrar por separado **vigencia de la suscripción** y **situación de pago**: un solo indicador «activo» puede ocultar deuda o un pago aún no aplicado. Los nombres de estados y sus reglas quedan por definir; no implementarlos por deducción.

## Reglas comerciales confirmadas

### Configuración de actividades y duración

- El dueño configura la oferta de actividades simultáneas desde la pestaña Actividades, mediante plantillas con actividad, precio y duración. La oferta no queda hardcodeada en la app.
- El monitor selecciona la opción previamente configurada; la presentación de una combinación o de varias opciones es una decisión de UX pendiente, sin imponer una única actividad por cliente.
- La vigencia sigue un período desde la fecha del pago: ejemplo confirmado para un plan de un mes, **11 de febrero → 11 de marzo**. No usar vencimiento fijo al inicio/fin del mes ni convertir automáticamente un mes en 30 días.
- La duración se configura por plantilla; no asumir que todos los planes duran un mes. Unidades/duraciones permitidas, fin de mes y momento exacto de caducidad: por definir.
- **La suscripción comienza con el primer abono, al registrar el alta**, aunque la cuota no esté completa. El saldo restante queda visible; pagar el resto no reinicia la duración de ese período.
- Renovación anticipada/tardía, alta sin ningún abono y abono de deuda deben tener reglas distintas explícitas; siguen pendientes. No bloquear una suscripción recién iniciada solo porque se pagó parcialmente.

### Registro manual de pagos

- La app registra pagos recibidos; **no procesa cobros ni integra checkout/pasarela en el MVP**.
- Medios expresados: transferencia, Mercado Pago y efectivo. «Mercado Pago» es un medio anotado por el monitor, no una integración con su API.
- Admitir varios medios en un mismo pago: por ejemplo, 50% por transferencia y el resto en efectivo. Admitir también pagos parciales con saldo pendiente y abonos posteriores.
- Guardar importes monetarios concretos por medio, no solo porcentajes o un booleano «abonado». La moneda se confirma con el usuario.
- Presentar total de la cuota, suma de los abonos confirmados y saldo pendiente. Para una cuota sin ajustes ni excedentes: `saldo = total − suma de abonos confirmados`; políticas de excedentes, descuentos y anulaciones quedan por definir.
- Propuesta de estados de pago: pendiente (sin abonos), parcial (con abonos y saldo) y abonado (sin saldo). Derivarlos de importes válidos; no permitir una marca «abonado» incoherente con el saldo. Estos nombres son una propuesta de presentación, no un esquema implementado.
- Cada registro debe poder asociarse a la cuota correspondiente, fecha y persona que lo registró; revisión/corrección e historial trazable se especificarán antes de implementar.
- Registrar un abono posterior sobre la misma cuota no equivale a crear una suscripción ni a reiniciar su vencimiento. No emitir cobros duplicados por doble click o reintento.
- **Clientes es una pantalla global con todos los clientes**, no solo deudores. Muestra suscripción y saldo pendiente de cada uno; propuesta UX: filtro «Con saldo pendiente» y búsqueda, manteniendo acceso al listado completo.

Ejemplos de aceptación con importes ficticios, **sin fijar precio ni moneda del gimnasio**:

| Total de cuota | Registro                                                             | Abonado acumulado | Saldo | Presentación propuesta                                                           |
| -------------- | -------------------------------------------------------------------- | ----------------- | ----- | -------------------------------------------------------------------------------- |
| 20.000         | 10.000 transferencia + 10.000 efectivo                               | 20.000            | 0     | Abonado; ambos medios visibles                                                   |
| 20.000         | Primer abono de 12.000 Mercado Pago el 11 de febrero, plan de un mes | 12.000            | 8.000 | Suscripción iniciada hasta el 11 de marzo; parcial con saldo visible en Clientes |
| 20.000         | Sobre el caso anterior, abono posterior de 8.000 efectivo            | 20.000            | 0     | Abonado; se conservan ambos registros y la cuota original                        |

«En tiempo real» expresa la necesidad de información actualizada. Confirmar si debe sincronizar cambios de otro dispositivo mientras se mantiene abierta la pantalla y con qué latencia. No elegir WebSockets/Supabase Realtime todavía. Un fallo de conexión debe indicar que la información podría estar desactualizada.

## Requisitos

| ID   | Requisito                                                                                      | Tipo (funcional/no funcional) | Prioridad            | Fuente                         | Criterio verificable                                                                                                  | Estado                                         |
| ---- | ---------------------------------------------------------------------------------------------- | ----------------------------- | -------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| R-01 | App usable en celular y PC                                                                     | No funcional                  | Central              | Usuario                        | Altas y consultas completas con touch o teclado/puntero; verificar tamaños del baseline y Safari/iOS + Chrome/Android | Expresado                                      |
| R-02 | Crear y administrar un perfil por cliente                                                      | Funcional                     | Central              | Usuario                        | Datos acordados guardados y recuperables; errores visibles                                                            | Expresado; campos pendientes                   |
| R-03 | Administrar suscripción y cuota                                                                | Funcional                     | Central              | Usuario                        | Consultar y modificar según reglas explícitas, sin confundir vigencia con pago                                        | Expresado; reglas pendientes                   |
| R-04 | Dueño configura plantillas de actividades, precio, duración y oferta simultánea                | Funcional                     | Central              | Usuario                        | La opción creada aparece en el alta con sus condiciones; ofertas/descuentos según reglas acordadas                    | Confirmado; detalle de ofertas pendiente       |
| R-05 | Asignar actividad desde el mismo formulario de alta                                            | Funcional                     | Central              | Usuario                        | Completar datos y seleccionar actividad sin navegar a otra pantalla para terminar el alta                             | Expresado                                      |
| R-06 | Ver suscripción y cuota actualizadas                                                           | Funcional/no funcional        | Central              | Usuario                        | Reflejar operaciones confirmadas; acordar sincronización entre dispositivos                                           | Expresado; alcance realtime pendiente          |
| R-07 | Estética inspirada en iPhone e identidad Shelby Gym: negro predominante, rojo y algo de blanco | UX                            | Central              | Usuario y referencias adjuntas | Jerarquía, controles táctiles y feedback claros; misma calidad en PC; paleta coherente con la marca                   | Confirmado; tokens son propuesta               |
| R-08 | Acceso autorizado a datos personales y cambios comerciales                                     | Seguridad                     | Baseline obligatorio | AGENTS/SECURITY                | Roles y alcance acordados, controles servidor/RLS y pruebas negativas                                                 | Permisos pendientes                            |
| R-09 | Registro manual con transferencia, Mercado Pago y efectivo                                     | Funcional                     | Central              | Usuario                        | Monitor registra medio e importe de un pago externo sin ejecutar un cobro desde la app                                | Confirmado                                     |
| R-10 | Pago repartido entre varios medios y abonos parciales/posteriores                              | Funcional                     | Central              | Usuario                        | Cada importe y medio queda visible; total abonado y saldo son coherentes en los ejemplos de aceptación                | Confirmado                                     |
| R-11 | Vencimiento según fecha del primer abono registrado y duración de la plantilla                 | Funcional                     | Central              | Usuario                        | Plan de un mes: 11 de febrero → 11 de marzo, también con abono parcial; resolver casos límite antes de implementar    | Regla base confirmada; casos límite pendientes |
| R-12 | Primer abono inicia la suscripción aunque quede saldo                                          | Funcional                     | Central              | Usuario                        | Primer abono del 11 de febrero inicia el mes hasta 11 de marzo; un abono posterior reduce deuda sin mover esas fechas | Confirmado                                     |
| R-13 | Vista global de todos los clientes con saldos pendientes visibles                              | Funcional/UX                  | Central              | Usuario                        | Consultar suscripción y saldo sin abrir cada perfil; lista completa y filtro de deuda propuesto                       | Confirmado; filtro es propuesta UX             |

Los requisitos no funcionales deben cubrir dispositivos/navegadores, accesibilidad, performance, disponibilidad, privacidad, retención y recuperación, con objetivos acordados.

## MVP

MVP implementado inicialmente según la descripción; reglas pendientes no se consideran aprobadas:

1. **Actividades y planes:** el dueño configura opciones reutilizables con precio, duración, oferta simultánea y descuentos cuando se definan. Usar una sola pantalla con detalle progresivo antes de fragmentar la configuración.
2. **Clientes:** pantalla global de todos los clientes con suscripción y saldo visibles; lista buscable y acción «Nuevo cliente». Formulario con datos y asignación de actividad/plan en el mismo contexto; primer abono inicia la suscripción. Propuesta: filtro de saldo pendiente.
3. **Perfil del cliente:** consultar datos, actividad contratada, vigencia/vencimiento, total de cuota, abonado y saldo. Registrar pago/abono recibido, con desglose por medio y registros anteriores. Renovación depende de las reglas pendientes.

No iniciar con un dashboard de gráficos: priorizar alta, búsqueda y consulta. La dirección visual fue aceptada inicialmente por el usuario; la primera implementación mantiene esa navegación.

- Criterios mínimos para salir a producción: workflows acordados, permisos probados, datos persistentes coherentes, estados de fallo cubiertos y QA responsive/accesible cumplida.
- Datos iniciales, importación, onboarding y gestión de personal: por definir.
- Respetar la duración elegida por el dueño y el inicio desde el primer abono registrado. No fijar campos personales obligatorios, descuentos acumulables ni políticas posteriores de bloqueo/gracia sin las reglas reales.

## Fuera de alcance

**Fuera del MVP por decisión del usuario:** cobrar desde la app, checkout e integración de pasarela/Mercado Pago. Registrar Mercado Pago como medio no añade esa integración.

No solicitados para este primer alcance: rutinas de entrenamiento, asistencia, reservas/horarios, biometría/control de acceso, portal de clientes, facturación fiscal y apps nativas/stores. Su exclusión definitiva se confirma con el usuario; no incorporarlos por asociación con un gimnasio.

## Futuras features

| Idea                                      | Evidencia/necesidad               | Dependencias | Condición para priorizar |
| ----------------------------------------- | --------------------------------- | ------------ | ------------------------ |
| Por definir tras validar el flujo central | Necesidad demostrada del gimnasio | Por definir  | No añadir por anticipado |

## Success criteria

| Resultado                           | Métrica                                                 | Baseline                   | Objetivo                                                                    | Plazo       | Cómo medir                                      |
| ----------------------------------- | ------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------- | ----------- | ----------------------------------------------- |
| Alta sencilla                       | Tiempo y cantidad de pasos para registrar/asignar       | Proceso actual por conocer | Objetivo numérico por acordar; una sola pantalla para datos y actividad     | Por definir | Prueba con personal real en celular y PC        |
| Consulta clara de cuota/suscripción | Tiempo para encontrar un cliente y comprender su estado | Por definir                | Objetivo por acordar; vigencia y cuota visibles sin interpretación ambigua  | Por definir | Tareas de consulta representativas              |
| Datos actualizados y coherentes     | Divergencias entre operación guardada y vista mostrada  | Por definir                | No mostrar como confirmado lo que falló; SLA entre dispositivos por acordar | Por definir | Pruebas de alta/cobro/renovación y fallo de red |

## Preguntas, supuestos y aprobación

| Tema                     | Pregunta o supuesto explícito                                                                                                                                            | Responsable | Evidencia/respuesta                                                                                                         | Estado                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Actividades simultáneas  | Configuración de la oferta                                                                                                                                               | Usuario     | El dueño la configura en Actividades mediante plantillas con actividad, precio y duración                                   | Regla confirmada; presentación por concretar      |
| Periodicidad/vencimiento | Base del período                                                                                                                                                         | Usuario     | Desde fecha de pago y duración de plantilla; ejemplo de un mes: 11 de febrero → 11 de marzo                                 | Confirmado; fin de mes/hora de corte pendientes   |
| Pagos                    | Registro y medios                                                                                                                                                        | Usuario     | Manual por monitor, sin cobro desde app; transferencia, Mercado Pago, efectivo; múltiples medios y pagos parciales          | Confirmado                                        |
| Inicio con pago parcial  | Momento de inicio                                                                                                                                                        | Usuario     | Desde el primer abono, al registrarlo; saldo pendiente visible en la pantalla global de todos los clientes                  | Confirmado                                        |
| Marca                    | Nombre y paleta                                                                                                                                                          | Usuario     | Shelby Gym; negro, rojo y algo de blanco; screenshots de logo/perfil como referencia                                        | Confirmado; logo original independiente pendiente |
| Datos del perfil         | ¿Qué datos mínimos y cuáles son opcionales? ¿Cómo se identifica un cliente repetido?                                                                                     | Usuario     | Sin respuesta aún                                                                                                           | Abierto                                           |
| Ofertas                  | ¿Descuento fijo/porcentual, fechas, requisitos y duración? ¿Cómo afecta a la renovación?                                                                                 | Usuario     | Sin respuesta aún                                                                                                           | Abierto                                           |
| Cambio de precio         | Propuesta: conservar las condiciones de períodos ya acordados y definir cuándo rige el nuevo precio; no modificar cargos existentes retroactivamente sin regla explícita | Usuario     | Política por confirmar                                                                                                      | Propuesta                                         |
| Tiempo real              | ¿Cambios de un PC deben aparecer automáticamente en otro PC/celular abierto? ¿Con qué demora aceptable?                                                                  | Usuario     | Sin respuesta aún                                                                                                           | Abierto                                           |
| Usuarios y permisos      | Alcance adicional y correcciones                                                                                                                                         | Usuario     | Dueño configura actividades/precio/duración; monitor registra pagos. Alta/edición, correcciones y otros permisos pendientes | Parcialmente definido                             |
| Renovación y deuda       | ¿Renovación anticipada/tardía desde qué fecha? ¿Gracia, pausas o restricciones por deuda?                                                                                | Usuario     | No resuelto por el ejemplo del 11 de febrero; completar una cuota existente no equivale a renovarla                         | Abierto                                           |
| Operación y cumplimiento | País/moneda/zona horaria, cantidad de clientes/sedes, datos actuales, retención, presupuesto y plazo                                                                     | Usuario     | Sin respuesta aún                                                                                                           | Abierto                                           |

Registrar quién aprobó alcance y criterios, y cuándo. Relacionar cambios de alcance con un requisito y, si cambia arquitectura, un ADR.

## Criterios iniciales de implementación (2026-10-03)

Estos criterios permiten evaluar la primera versión; son propuestas técnicas explícitas, no respuestas atribuidas al cliente.

- Perfil mínimo: nombre y apellido obligatorio; teléfono, correo y nota de recepción opcionales. Sin DNI ni datos médicos hasta justificar necesidad. Se permiten homónimos; política de detección de duplicados pendiente.
- Dueño configura actividades y ajustes. Personal activo (dueño/monitor) registra y edita perfiles y recibe abonos. No hay borrado/corrección de ledger ni autogestión del cliente.
- Actividades pueden describir disciplinas combinadas. Oferta inicial: etiqueta y precio reducido, manualmente habilitada/retirada; sin calendario, acumulación ni condiciones automáticas inventadas.
- Condiciones comerciales se congelan en cada período. Modificar la plantilla afecta nuevos períodos.
- Primer abono positivo inicia en la fecha local del gimnasio. Fin exclusivo a las 00:00 de la fecha de vencimiento; fin de mes ajustado al último día disponible. Validar este corte con el dueño antes de producción.
- No se permite renovar por adelantado la misma plantilla vigente. Al vencer, un nuevo período comienza con el nuevo abono de hoy. Deudas anteriores siguen visibles. Gracia, pausas y retroactividad pendientes.
- Sin primer abono no se crea todavía un período; si se necesita preinscripción sin pago, definir su estado y workflow.
- Realtime entre equipos, con fallback de 30 segundos y estado visible de reconexión/offline. No se registran abonos offline.
- El usuario confirmó ARS y horario de Argentina el 2026-10-03. Usar `ARS` y `America/Argentina/Buenos_Aires`; es la configuración inicial de Shelby Gym.
- Se autorizó una carpeta Drive para entregables; no implica publicar el producto ni almacenar datos de clientes o secretos en Drive.

Confirmación del usuario (2026-10-03): **pesos argentinos (ARS) y horario de Argentina**. Resuelve la moneda y zona horaria que antes estaban pendientes.

## Ampliación confirmada — 2026-10-04

El usuario solicita aplicar activamente las skills de Emil a la calidad visual y motion, e importar Excel para que gimnasios existentes continúen sin recargar todo. Confirma nombre/edad, actividades, inicio/vencimiento, saldos y pagos anteriores; exige conservar montos históricos frente a la inflación argentina.

Implementado: flujo del dueño en Clientes → Importar Excel, XLSX con relación de columnas y actividades, preview, confirmación, perfiles con edad referenciada, múltiples períodos por cliente, precios históricos, pagos mixtos anteriores y crédito de apertura si falta el detalle. No se recalculan cuotas al precio actual. Reintentos no duplican ni sobrescriben abonos nuevos. Límites y criterios operativos propuestos en IMPORTS; validar con una planilla real anonimizada antes de migrar producción.
