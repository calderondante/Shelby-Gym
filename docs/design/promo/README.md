# Shelby Gym — Tu gimnasio, en orden

Video publicitario solicitado por el usuario y producido el 2026-10-04.

- [Reproducir / descargar MP4](shelby-gym-publicitario-1080p.mp4)
- [Copia en Drive, carpeta Diseño](https://drive.google.com/file/d/1ayIcDYblogxHuqQvq08AALAw0ayIscdH/view)
- [Portada](portada.jpg)
- [Timeline](timeline.json)

55 segundos; horizontal 16:9, 1920 × 1080, 30 fps, H.264 y AAC estéreo a 48 kHz. MP4 con faststart. Textos en español argentino, identidad negra/roja/blanca y música instrumental original sintetizada para esta pieza; sin locución ni grabaciones musicales externas.

## Guion y contenido real

| Tiempo | Mensaje | Demostración |
| --- | --- | --- |
| 00–04 | Menos planillas. Más gimnasio. | Presentación y vista real de Clientes en celular |
| 04–11 | Cada plan, a tu medida. | Formulario de actividad, precio, duración y oferta opcional |
| 11–22 | Bienvenida. Ya está. | Alta de Valentina Ríos, asignación de Integral Shelby y primer abono mixto |
| 22–31 | Cada peso, en su lugar. | Abono posterior por Mercado Pago, cuota completa e historial |
| 31–43 | Tu historia sigue acá. | Importación de Excel: correspondencias, revisión, precios históricos y confirmación real |
| 43–50 | El gimnasio, a mano. | Navegación de Clientes al perfil en viewport móvil de 390 × 844 |
| 50–55 | Tu gimnasio. En orden. | Cierre de marca |

## Pruebas durante la grabación

Las tomas provienen de la aplicación local de producción (`next start`) y Supabase local, con sesión autorizada y datos exclusivamente ficticios. No son pantallas simuladas. El login y las credenciales quedan fuera de la captura. Se ajustó editorialmente la duración de las tomas, sin alterar los importes ni los estados mostrados.

- Creación real del plan Integral Shelby: ARS 45.000, un mes, musculación y artes marciales. Se muestra su formulario de edición para evitar ruido de otros fixtures del catálogo.
- Alta real con ARS 15.000 por transferencia y ARS 10.000 en efectivo: saldo comprobado de ARS 20.000.
- Abono posterior real por Mercado Pago de ARS 20.000: cuota completa, dos registros de abonos e idénticas fechas de suscripción antes y después.
- Importación confirmada de Mateo Acosta, 28 años, con dos cuotas históricas de ARS 20.000 y ARS 30.000, pagos previos y saldo pendiente. La vista previa conserva los precios anteriores al precio actual del plan.
- Ningún error JavaScript de página durante los recorridos grabados.

No hay cobros online: se muestran registros manuales de dinero recibido. La escena móvil es una captura de Chromium con viewport móvil, no una certificación de pruebas en iPhone o Android físico. No se publicó ni desplegó la aplicación.

## Validación de la entrega

Se verificaron formato, duración de 55 segundos, resolución, streams de audio/video y decodificación completa sin errores con FFmpeg. Se inspeccionaron cuadros de introducción, alta, importación y móvil. Audio medido: −18,0 LUFS integrado y pico verdadero de −4,2 dBFS, sin clipping. La copia en Drive conserva los permisos existentes de la carpeta Diseño.

No se modificó código de la aplicación ni se agregaron dependencias runtime. Las operaciones de demostración agregan fixtures a la base local; no modifican datos de producción. No se hicieron commits, push ni publicaciones en redes.
