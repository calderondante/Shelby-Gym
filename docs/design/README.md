# Shelby Gym — primera exploración visual

Concepto aislado, autorizado para avanzar en estética. No es la aplicación de producto ni un starter Next.js. Usa solo HTML/CSS/JS, assets locales y datos ficticios en memoria, sin dependencias, servicios, solicitudes externas o persistencia.

## Ver la propuesta

- [Abrir vista interactiva](shelby-preview.html).
- [Captura PC](screenshots/shelby-desktop.png).
- [Captura celular](screenshots/shelby-mobile.png).
- [Alta en celular](screenshots/shelby-new-client-mobile.png).

Se puede abrir el HTML local junto a sus carpetas de assets. Si el navegador restringe `file://`, servirlo por HTTP local desde la raíz del workspace con Python disponible:

```bash
python3 -m http.server 8765 --bind 127.0.0.1 --directory .
```

Abrir `http://127.0.0.1:8765/docs/design/shelby-preview.html`. Detener con Ctrl+C al terminar. No es un deploy ni un servicio público.

## Alcance

Una única dirección: negro/grafito, rojo y blanco de Shelby Gym con jerarquía, controles y claridad inspirados en iPhone. En PC hay navegación lateral y filas comparables; en celular se reordenan las filas para mantener legibles la suscripción y el saldo.

Se pueden probar búsqueda, filtros, perfil, alta con primer abono y abonos repartidos en varios medios. El abono posterior reduce el saldo sin mover el vencimiento. Actividades presenta ejemplos de plantillas para el formulario, no un editor del catálogo real.

Nombres, planes, precios, moneda y fechas son de ejemplo. Los campos elegidos para probar el alta no fijan los requisitos de datos personales. No introducir datos reales: recargar restaura la muestra. No hay auth/RLS, backend, cobros, errores de red simulados ni cálculo de calendario general; los períodos del escenario están fijados deliberadamente. Políticas de fin de mes, renovación, excedentes y correcciones siguen pendientes para el producto.

Los archivos de marca compartidos por el usuario se conservan sin alterar en `docs/brand/`. El encuadre del logo se realiza en CSS desde la captura, sin modificar el JPG. Para producción se requerirá el archivo original independiente del logo. Los tokens son una propuesta coherente con la paleta, no valores oficiales de un manual de marca.

## Validación — 2026-10-03

Navegador: Chromium instalado en el entorno, controlado con Playwright preexistente. No se instalaron herramientas ni dependencias para la vista previa.

| Ancho CSS | Listado y filtros | Overflow de documento | Overflow de perfil |
| --- | --- | --- | --- |
| 375 px | Correcto | Ninguno | Ninguno |
| 390 px | Correcto | Ninguno | Ninguno |
| 768 px | Correcto | Ninguno | Ninguno |
| 1024 px | Correcto | Ninguno | Ninguno |
| 1440 px | Correcto | Ninguno | Ninguno |

Verificado: búsqueda sin depender de acentos, empty state recuperable, pago dividido, rechazo de importes superiores al saldo en la simulación, período inalterado tras segundo abono, alta con primer abono parcial, texto ingresado escapado, restauración de fixtures al recargar y cero errores JS. Verificados teclado Enter/Escape, restauración de foco tras cierre/abono, reduced motion y botones visibles con altura mínima 44 CSS px en emulación touch a 390 px.

Se inspeccionaron visualmente las capturas PC/celular. Los ratios calculados de texto/fondo son: principal/fondo 18,06:1; secundario/superficie 8,27:1; secundario/input 7,62:1; blanco/botón rojo 4,96:1; rojo claro/superficie 7,27:1. Esto valida esas parejas, no todos los estados ni una auditoría completa WCAG.

Emulación de touch no demuestra compatibilidad con Safari/iOS o Android físicos. Esa verificación y pruebas de red, auth, datos persistentes y permisos corresponderán al producto. La vista previa se puede modificar o descartar sin arrastrar sus fixtures al código de producción.

## Implementación real posterior

Tras aprobar esta exploración se implementó la app Next.js/Supabase. El HTML anterior se conserva como referencia histórica, con sus datos ficticios aislados del producto. El movimiento implementado usa transiciones CSS discretas de 140 ms con alternativa de movimiento reducido, sin instalar un motor de animación.

Capturas de la aplicación, con cuentas y clientes sintéticos de QA:

- [Clientes en PC](screenshots/app/clientes-1440.png).
- [Clientes en celular](screenshots/app/clientes-390.png).
- [Alta en celular](screenshots/app/nuevo-cliente-390.png).

También se guardan los anchos 375, 768 y 1024 px. La verificación funcional del producto está en [QA](../QA.md); estas capturas no sustituyen pruebas con dispositivos reales.

## Excel y motion — 2026-10-04

Nueva experiencia de incorporación sin reiniciar la historia del gimnasio. Capturas de la aplicación con datos sintéticos:

- [Importar Excel, celular](screenshots/import/excel-390.png).
- [Importar Excel, PC](screenshots/import/excel-1440.png).
- [Revisión de precios y saldos, celular](screenshots/import/revision-390.png).
- [Revisión de precios y saldos, PC](screenshots/import/revision-1440.png).

El movimiento implementado está descrito en DESIGN_SYSTEM: 140 ms de pulsación, 220 ms de continuidad entre pasos, mejora progresiva de details/confirmaciones, teclado inmediato y reduced motion. La lectura queda en un worker y no congela la interfaz. Las capturas estáticas no demuestran la animación; el test de navegador comprueba transformaciones durante interacción real y su desactivación.

[Ver la grabación de interacción](motion/importacion-demo.webm): captura real de la app en Chromium, con un archivo sintético; muestra pulsación, lectura, cambios de paso y detalle de pagos. No incluye login, credenciales ni datos reales. La grabación termina en revisión, sin confirmar ese lote de demostración.
