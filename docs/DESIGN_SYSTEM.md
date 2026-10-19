# Design system

Estado: dirección inicial para **Shelby Gym**, con estética inspirada en iPhone para uso administrativo en celular y PC. Paleta confirmada: negro predominante, rojo y algo de blanco. Los valores de tokens son una propuesta de diseño, no colores oficiales extraídos del logo. La dirección visual fue aceptada inicialmente; está implementada en la aplicación y el prototipo aislado se conserva como referencia. Última actualización: 2026-10-03.

## Dirección para el producto del gimnasio

Aplicar `emil-design-eng` y `apple-design` a claridad, feedback y adaptación por dispositivo. La referencia iPhone es una preferencia visual/UX confirmada; el tratamiento concreto siguiente es una propuesta inicial que debe revisarse visualmente antes de implementarse.

- Tipografía de sistema (`system-ui` como dirección inicial), jerarquía por peso/tamaño y números de cuota legibles. No descargar ni distribuir una fuente propietaria para imitar iOS.
- Negro/grafito como fondo y superficies, rojo para identidad y acción principal, blanco/gris claro para lectura. Predominio oscuro confirmado por usuario; no basar la propuesta inicial en superficies blancas. Agrupaciones limpias y redondeado contenido, sin transparencias obligatorias.
- En celular, filas fáciles de tocar, labels visibles y formulario vertical; acción de guardar accesible sin que el teclado o safe area la oculte. Si se propone una sheet, verificar tamaño, foco y scroll antes de elegirla.
- En PC, aprovechar ancho para búsqueda, lista y lectura del detalle; mantener densidad útil y navegación por teclado. No estirar una pantalla de teléfono para llenar el monitor.
- «Nuevo cliente» como acción clara en Clientes. La selección de actividad/plan vive junto a los datos del alta y muestra precio/condiciones antes de guardar; no exige recorrer otra sección para asignar una opción existente.
- Perfil con vigencia y situación de cuota identificables mediante texto, fechas/importes y jerarquía; el color es refuerzo. Estados exactos y acciones de cobro/renovación dependen de reglas pendientes.
- Registro de pago propuesto: importe y selector de medio (transferencia, Mercado Pago, efectivo), acción «Añadir otro medio» y resumen inmediato de total de cuota, abonado y pendiente. Una sola fila por defecto; más filas solo si se necesitan. «Registrar pago» comunica que se anota dinero recibido fuera de la app.
- Para pagos parciales, el saldo debe quedar visible en el perfil y en la confirmación. Permitir «Registrar abono» sobre la misma cuota, conservando el desglose anterior. El estado financiero se obtiene de los importes registrados y se presenta con texto y saldo visibles.
- Feedback táctil visual inmediato y confirmación de persistencia separada: una respuesta al toque no significa que el servidor haya guardado. Motion breve y funcional, sin esperar animaciones para trabajar y con reduced motion.

La inspiración Apple debe funcionar con controles web accesibles en Android, iOS y desktop. No añadir gestos ocultos, sonidos, haptics ni librerías de motion sin una necesidad concreta. Antes de fijar tokens, comparar el flujo de alta y el perfil con contenido representativo y estados loading/empty/error/success.

## Filosofía visual

Claridad, jerarquía, spacing intencional, tipografía consistente y densidad apropiada al trabajo. Una acción principal por contexto; distinguir navegación, acciones y datos. Crear identidad propia a partir del problema del cliente y referencias concretas, sin copiar un dashboard genérico.

No usar gradients, glassmorphism, tarjetas, bordes, iconos, sombras enormes ni motion decorativo como sustituto de estructura. Superficies agrupadas cuando exista un motivo; para lo demás, tipografía, espacio y alineación. Consultar `emil-design-eng`; usar `apple-design` para feedback, gestos y continuidad cuando corresponda.

| Referencia | Qué nos sirve | Qué adaptar al producto | Fuente/aprobación |
| --- | --- | --- | --- |
| Interfaces iPhone/iOS (familia de referencia, sin pantalla concreta elegida) | Claridad, familiaridad táctil, jerarquía tipográfica y feedback rápido | Gestión de clientes/cuotas; densidad útil en PC y compatibilidad Android | Preferencia del usuario, 2026-10-03; referencia visual concreta pendiente |
| [Logo Shelby Gym](brand/shelby-logo-reference.jpg) y [perfil compartido](brand/shelby-instagram-reference.jpg) | Nombre Shelby Gym, bulldog/escudo, negro, rojo y blanco | Usar marca sin trasladar toda su textura/volumen a controles administrativos | Imágenes adjuntas por el usuario; conservadas sin alterar |

El handle visible es `shelby.gymm`; se usa como referencia, no como dominio/contacto de la app. Las capturas no son un archivo maestro del logo: antes de producción obtener el asset original autorizado. La vista previa encuadra el logo con CSS desde la captura original, sin generar ni modificar una identidad nueva.

## Primera vista previa

[Abrir concepto de Clientes](design/shelby-preview.html). HTML/CSS/JS aislado y sin dependencias externas, backend, conexión ni persistencia. Usa nombres, planes, precios, fechas y moneda ilustrativos; las modificaciones se pierden al recargar. No fija campos, catálogo ni moneda reales. [Capturas, alcance y validación](design/README.md).

Una dirección inicial: fondo casi negro, superficies grafito, cabecera tipográfica y listado de clientes; rojo reservado para acción principal/identidad. En móvil las filas se reordenan, conservando vigencia y saldo. Filtros, búsqueda, alta y registro de abonos se simulan para evaluar interacción; no se ofrece un dashboard de KPIs inventados.

Tokens propuestos para esta exploración:

| Token | Valor | Uso |
| --- | --- | --- |
| background | `#0B0B0D` | Fondo predominante |
| surface | `#151518` | Lista y paneles |
| surface-raised | `#1D1D21` | Inputs y controles |
| foreground | `#F5F5F7` | Texto principal |
| muted-foreground | `#AEAEB6` | Texto secundario legible |
| primary | `#D92332` | Acción principal con texto blanco |
| primary-foreground | `#FFFFFF` | Texto sobre botón rojo |
| accent-text | `#FF7A85` | Rojo claro para indicadores/texto sobre fondo oscuro |
| border | `#35353B` | Separaciones discretas; controles también se distinguen por superficie |
| ring | `#F5F5F7` | Foco de teclado visible |

No usar el rojo primario como texto pequeño sobre negro: usar el acento claro. «Abonado», «Parcial» y «Vigente» se comunican por texto, importe/fecha e iconografía mínima; rojo no significa por sí solo que la suscripción esté vencida. No introducir verde o paletas ajenas para distinguir estados si no hace falta.

## Typography

| Rol | Familia | Tamaño/line-height | Peso | Uso y responsive |
| --- | --- | --- | --- | --- |
| Título de página | Por definir | Por definir | Por definir | Por definir |
| Título de sección | Por definir | Por definir | Por definir | Por definir |
| Texto/formulario | Por definir | Por definir | Por definir | Legibilidad móvil; verificar zoom de inputs iOS |
| Etiqueta/metadato | Por definir | Por definir | Por definir | No ocultar información crítica con bajo contraste |
| Valor numérico | Por definir | Por definir | Por definir | Tabular cuando facilite comparar |

Empezar con una familia legible y una escala corta. Optimizar carga de fuentes; no añadir una familia por componente. Definir formatos de fecha, números, moneda y zona horaria según producto/país.

## Spacing y densidad

| Token | Valor | Usos permitidos |
| --- | --- | --- |
| Por definir | Por definir | Por definir |

Escala pequeña y consistente basada en un ritmo común; no tratar cada separación como un valor aislado. Alinear contenido y labels; agrupar controles por tarea. Densidad adaptada a frecuencia de trabajo y touch, evitando tanto bloques vacíos como controles amontonados.

## Radius, bordes y elevación

| Token | Valor | Función |
| --- | --- | --- |
| Radius control/surface/overlay | Por definir | Jerarquía coherente sin redondeado indiscriminado |
| Border | Por definir | Separación cuando el espacio no alcance |
| Elevación | Por definir | Principalmente overlays; sombras discretas |

## Colors y tokens

Tokens semánticos compartidos, compatibles con shadcn; evitar colores hardcodeados por componente.

| Token/rol | Valor claro | Valor oscuro (si se requiere) | Pareja de contraste | Estado verificado |
| --- | --- | --- | --- | --- |
| background / foreground | No solicitado | Propuesta `#0B0B0D` / `#F5F5F7` | Texto/base | Contraste de propuesta verificado |
| primary / primary-foreground | No solicitado | Propuesta `#D92332` / `#FFFFFF` | Acción principal | Contraste de propuesta verificado |
| muted / muted-foreground | No solicitado | Propuesta `#1D1D21` / `#AEAEB6` | Texto secundario | Contraste de propuesta verificado |
| border / input / ring | No solicitado | Propuesta `#35353B` / superficie input grafito / `#F5F5F7` | Controles y focus | Propuesta; auditoría final pendiente |
| destructive / success / warning | Por definir | Por definir | Estado + texto/icono necesario | Pendiente |

La primera dirección usa tema oscuro según la marca; tema claro adicional no solicitado. Contraste WCAG 2.2 AA: texto normal al menos 4.5:1, texto grande 3:1 y componentes/focus según criterio aplicable. Verificar estados disabled, hover, focus, error y selected; no indicar estado únicamente por color.

## Components

| Componente/patrón | Responsabilidad | Variantes | Estados | Teclado/touch | Fuente |
| --- | --- | --- | --- | --- | --- |
| Por definir | Por definir | Por definir | Loading/empty/error/success cuando aplique | Por definir | shadcn/existente/custom justificado |

Reutilizar primitivas accesibles, tokens y variantes. La skill `shadcn` define APIs y composición actuales: consultar `components.json` y documentación antes de usar props. No añadir todos los componentes ni blocks completos por anticipado. El registro inicial recomendado es el oficial `@shadcn`; revisar código y dependencias de cualquier fuente adicional.

Definir patrones para errores de formularios, confirmaciones irreversibles, feedback persistente y empty states con una acción útil. No usar un toast como única evidencia de un error crítico.

## Responsive behavior

| Ancho aproximado | Qué revisar |
| --- | --- |
| 375 / 390 px | Acción principal accesible, navegación, targets, teclado y tablas |
| 768 px | Tablet en portrait, adaptación de navegación/columnas |
| 1024 px | Tablet landscape/desktop compacto, densidad y overlays |
| 1440 px | Ancho de lectura, uso útil del espacio y alineación |

No confundir estos anchos de verificación con breakpoints obligatorios: adaptar el layout cuando el contenido lo necesite. Probar textos largos, red lenta, zoom y estados alternativos. No depender de hover ni bloquear scroll/gestos nativos sin motivo. Considerar safe areas, `dvh` cuando corresponda y teclado virtual.

Tablas complejas: registrar por tabla columnas prioritarias, acciones, lectura del detalle y estrategia móvil. Scroll horizontal contenido solo si mantiene contexto y affordance; nunca overflow de toda la página.

## Animation principles

1. Decidir si debe animarse según propósito y frecuencia; alta frecuencia/atajos requieren respuesta inmediata.
2. Preferir CSS transitions para estados simples; librerías solo ante necesidad real.
3. Compartir tokens de duración/easing; como orientación, microfeedback 100–160 ms, overlays breves usualmente 150–250 ms. Justificar excepciones y medir en dispositivos reales.
4. Priorizar transform/opacity, interrupción y origen coherente; no bloquear acción mientras termina una transición.
5. `prefers-reduced-motion` elimina movimiento no esencial; color/opacity breves solo si ayudan y son tolerables. No forzar scale, blur o stagger para aprobar una checklist estética.
6. Hover condicionado a capacidad real del dispositivo. Gestos con alternativa visible y accesible.

Usar `animate` para construir, `review-animations` para revisar un diff, `improve-animations` para auditoría/planes y `find-animation-opportunities` para propuestas. Sus roles son distintos. Prototipos quedan aislados y solo se integra la opción elegida.

## Accessibility y aprobación visual

HTML semántico, labels, keyboard, focus visible y restauración de foco, contraste, reduced motion, reflow y comunicación no basada solo en color. Combinar revisión `web-design-guidelines`, pruebas automáticas cuando haya app y revisión manual.

| Pantalla/estado | Tamaños y navegadores | Evidencia visual | A11y | Decisión/pending |
| --- | --- | --- | --- | --- |
| Por definir | Por definir | Por definir | Por definir | Pendiente |

## Implementación inicial

Tokens en `src/app/globals.css`, primitivas oficiales shadcn Base UI en `src/components/ui`. Fuente de sistema; controles de 44–48 px y sin hover obligatorio. Pantallas mobile-first con lista reordenada y formularios de una sola columna. Correo/nota opcionales se despliegan a pedido para agilizar el alta. Movimiento CSS de feedback de 140 ms y reducción de movimiento respetada; no se instaló un framework de animación.

Logo: se conserva la referencia JPG sin alteraciones y se encuadra con CSS/Next Image. Solicitar el archivo original separado antes de publicación. Capturas de la app con datos sintéticos en `docs/design/screenshots/app/`.

## Pulido y movimiento — 2026-10-04

Se aplicaron las skills locales `emil-design-eng` y `animate`, incluida la receta de pulsación. No se reinstalaron skills ni se agregó una librería de motion. El acabado depende de jerarquía, densidad, feedback y continuidad entre estados, no de mover saldos o listas de uso frecuente.

| Antes | Después | Motivo |
| --- | --- | --- |
| Feedback genérico y `transition-all` heredado de la primitiva | Transiciones explícitas y pulsación `scale(0.97)` de 140 ms solo con puntero | Respuesta táctil clara, interrupción natural y teclado inmediato |
| Cambios de paso instantáneos sin foco dirigido | Entrada de 220 ms, 8 px y opacidad mediante WAAPI; foco al título del paso | Continuidad del asistente ocasional, sin demorar la siguiente acción |
| Apertura brusca de contenido secundario | `@starting-style` con 220 ms para details/confirmaciones; fallback inmediato | Hacer legible contenido que aparece, sin animar altura ni desplazar las filas del listado |
| Sin lenguaje visual de migración | Cuatro pasos, relación de columnas, resumen económico y confirmación persistente | Hacer explícito qué se importará y qué falta revisar |

Tokens: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`, press 140 ms, state 220 ms. El worker muestra una señal de espera de opacidad mientras hay trabajo real; no simula porcentajes. Nada espera a que una animación termine para responder.

Teclado no dispara movimientos; reduced motion elimina transformaciones y la señal animada de espera. Hover decorativo limitado a puntero fino con hover real. No stagger en clientes, conteos que giran, animaciones al refrescar saldos, gradientes ni fondos en movimiento.

La bienvenida a Excel usa dos columnas en PC y composición compacta en celular; la tabla de correspondencias se convierte en campos verticales. Vista previa de clientes paginada, detalle de pagos desplegable y saldos tabulares. Capturas: `docs/design/screenshots/import/`.
