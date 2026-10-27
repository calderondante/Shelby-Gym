# Inscripción con foto — 27/10/2026

En **Nuevo cliente**, dentro de **Datos del cliente**, pulsar la camarita **Completar desde foto**. Se integra en Alta de hoy y Cargar desde papel; no hay pestañas, rutas ni estados de cliente nuevos. El monitor conserva alta normal; sólo el dueño carga historia.

1. Tomar una foto de **una sola ficha** o elegirla de la galería.
2. Revisar nombre/apellido, teléfono, Instagram, correo y mes de cumpleaños. Los campos ilegibles/ambiguos quedan vacíos y se pueden completar a mano. El lector identifica etiquetas, no verifica la identidad ni comprende cualquier diseño de planilla.
3. Elegir qué campos aplicar. Los datos ya escritos se protegen, incluso si se completaron durante la lectura. Para cambiarlos hay que habilitar reemplazo y seleccionar expresamente el campo. No se borran notas ni otros datos del formulario.
4. En Cargar desde papel también se proponen inicio, vencimiento, importe pactado y total abonado cuando están rotulados. Confirmar la actividad entre las existentes, seleccionar los campos históricos y confirmar su revisión separadamente. No se adivina lo abonado a partir del saldo, no se convierte moneda y un pack sigue sin vencimiento por fecha. El alta de hoy mantiene sus reglas/precio y abono manual.
5. **Aplicar datos y descartar foto** sólo completa el formulario. Después corregir/completar lo que falte y usar el botón habitual de guardar. No se crea perfil, cuota ni pago al escanear. La historia conserva saldos/crédito de apertura y no registra automáticamente ingresos de hoy.

## Privacidad y límites

- OCR español Tesseract en el dispositivo, compartido con facturas. Se carga bajo demanda; sin dependencias nuevas ni proveedor OCR externo.
- Foto y texto bruto temporales; no hay subida, Storage, borrador persistente ni cambios de schema. Cerrar lector, descartar, aplicar o salir libera la vista previa; cancelar termina la lectura. Los inputs de foto/revisión no tienen `name`, por lo que no forman parte del envío del registro.
- Sólo se mapean los campos enumerados. No se copian notas libres, firmas, información médica ni consentimientos de marketing. La fecha de nacimiento se reduce al mes; no se guarda día/año por esta función.
- Límites compartidos: 12 MB, 24 megapíxeles y una lectura simultánea. El original de galería no se elimina. El lector/modelo necesita descargarse la primera vez; no se promete operación offline.
- Mejor con texto impreso y fotos legibles, sin sombras/inclinación. **La cursiva/manuscrita puede fallar**; no se presenta una precisión estimada ni reconocimiento manuscrito garantizado. La entrada manual sigue disponible.
- Falta una muestra anonimizada de la planilla real del gimnasio para calibración y aceptación física. Las pruebas automatizadas usan fichas impresas sintéticas, no prueban la tasa de acierto del cuaderno real.

## Verificación

`tests/registration-photo.test.ts`: etiquetas/campos explícitos, cumpleaños, datos excluidos, monedas/fechas ambiguas, selección y protección de valores escritos. `tests/e2e/registration-photo.spec.ts`: OCR real de PNG sintético, cinco anchos/axe, revisión, cancelación, permisos y guardado histórico sin ingresos de hoy. Ejecutar sólo con Supabase local y fixtures existentes. El lector de facturas mantiene su regresión en `tests/e2e/owner-alerts.spec.ts`.
