# Optimización de administración — 04/11/2026

Rama `perf/administracion-2026-11-04`, base `ed25251`. La demo estática y Rutinas no se modifican. Producción no se utiliza como QA.

## Cambios implementados

- Perfil: lecturas independientes en paralelo; mapas de pagos/asistencias por suscripción evitan filtros repetidos.
- Resumen/informes: no solicitan datos de edición, plantillas ni colecciones de movimientos que no presentan. Un cierre pasado usa su snapshot sin reconstruir el ledger actual. Gastos limita a cuatro las consultas concurrentes de reversiones. Sin cambios SQL, precios, RLS o transacciones.
- Una suscripción Realtime compartida; dueño recibe además señales de preferencias/lecturas. Campana y bandeja agrupan ráfagas, serializan peticiones, abortan al desmontar y evitan trabajo en segundo plano/sin conexión. No hay caché compartida ni persistencia de datos privados.
- Barra inferior móvil, safe-areas, controles y foco accesibles; se aparta del teclado virtual sin interferir con zoom. Feedback de envío con ancho estable y movimiento reducido. Se elimina la animación indiscriminada de hijos de listas financieras. Negro/grafito, rojo, blanco y logo originales.
- OCR local: cancelación y timeout en decodificación/carga/reconocimiento; worker nativo termina incluso durante inicio fallido. Adaptador pequeño al protocolo Tesseract 7 fijado: revisar al actualizar esa dependencia. Sin fotos persistidas, servicios nuevos o librerías de motion.
- Identidad de operación de gastos estable mientras el formulario permanece abierto, incluida actualización Realtime/manual. Confirmación continúa dependiendo del servidor; un éxito con redirect remonta el formulario, permitiendo otra operación.

## Mediciones SSR antes/después

Builds de producción locales independientes, Node24.22.1, Chromium, misma base sintética con 26 clientes y 28 abonos. Proxy añade **200ms por petición de Auth/REST**. Tres muestras por ruta tras calentamiento; mediana del HTML completo, no tiempo de un cold-start remoto. No comparar cifras absolutas con octubre: cambiaron dataset/runtime. Medición de laboratorio, sin INP de campo. Variaciones pequeñas se consideran ruido; no se atribuyen mejoras a rutas sin evidencia.

| Ruta | Antes ms | Después ms | Reducción | Peticiones backend |
| --- | ---: | ---: | ---: | ---: |
| clients | 928 | 937 | -0.9% | 5 → 5 |
| enrollment | 927 | 915 | 1.3% | 5 → 5 |
| profile | 1120 | 913 | 18.5% | 8 → 8 |
| activities | 910 | 956 | -5.1% | 5 → 5 |
| summary | 1160 | 953 | 17.9% | 17 → 13 |
| report | 1136 | 931 | 18.1% | 17 → 10 |
| expenses | 1127 | 1169 | -3.7% | 10 → 10 |
| messages | 918 | 919 | -0.1% | 8 → 8 |
| alerts | 920 | 926 | -0.7% | 6 → 6 |

Perfil, Resumen e Informe reducen la espera aproximadamente 18–19%; el informe elimina 7/17 lecturas. La meta orientativa del 30% no se alcanza en esos tiempos. Actividades y Gastos presentan pequeñas regresiones en esta muestra; no se ocultan ni se califican como mejoras. El coste fijo de auth/red sigue predominando y no se elimina mediante caché insegura.

Reproducir con `node scripts/measure-performance.mjs --label=before --samples=3 --sections=ssr --metrics=http://127.0.0.1:54321/__qa/metrics` desde cada checkout/servidor local. JSON completo en `qa-artifacts/performance/`, ignorado por contener evidencia local. Cambiar `--base` al puerto correspondiente. El proxy `scripts/setup-qa-proxy.mjs` permite fijar latencia con POST local `/__qa/control`.

## Validación y límites

110 pruebas unitarias correctas; integración local de Auth/RLS, concurrencia, pagos, importación, packs, cierres, comunicaciones, papel y avisos correctas. Las pruebas de navegador se ejecutaron sobre build de producción, con datos sintéticos y axe, en 375/390/768/1024/1440 px. La primera ejecución pasó 32/36; los fallos correspondían a Realtime local sin configurar, VAPID local ausente y un selector de test que contaba el anunciador de rutas de Next. Se recuperó Realtime real (incluido wal2json), se configuró Web Push local sin envío y se acotó el selector. Las reejecuciones validaron esos escenarios, precarga y dos operaciones consecutivas de gastos. Estado final en OPTIMIZATION_PROGRESS.md. No hay prueba física de Safari/PWA iPhone, cámara del gimnasio o entrega push con app cerrada. No se envían avisos reales. Recuperación de producción/backups pendiente; no se despliega esta intervención sin revisión y recuperación adecuada.

Capturas reales: [móvil](design/optimization-2026-11-04/clientes-390.png), [PC](design/optimization-2026-11-04/clientes-1440.png). Prototipo comparativo de navegación aislado en qa-artifacts/motion/navigation-prototype.html.

## Navegador y estabilidad visual

Mismos tres contextos nuevos por condición y viewport 390×844, datos compartidos, backend+200ms. Red rápida o móvil CDP150ms/200KBs/CPU×4. Ventana de observación350ms después de disponer del contenido: los recursos tardíos pueden quedar fuera, por eso no se equipara a transferencia total de una sesión. No hay field INP.

| Red / ruta | Contenido listo antes → después ms | LCP antes → después ms | CLS antes → después |
| --- | ---: | ---: | ---: |
| fast / clients | 1175 → 1222 | 1164 → 1208 | 0.03 → 0.00 |
| fast / profile | 1354 → 1218 | 1328 → 1220 | 0.03 → 0.00 |
| mobile / clients | 1865 → 1891 | 1864 → 1896 | 0.03 → 0.00 |
| mobile / profile | 1722 → 1750 | 1720 → 1752 | 0.03 → 0.00 |

Se detectó una regresión intermedia de CLS0.14–0.15: el footer sobredimensionado aparecía durante el skeleton y salía del viewport al llegar los datos. Se reservó espacio mínimo del contenido móvil; la medición final y una inspección de fuentes de layout-shift confirman la corrección. No se oculta con animación.

La carga móvil del perfil y Clientes no demuestra una reducción consistente: el beneficio cuantificable está en las lecturas del servidor y la estabilidad visual. El bundle inicial no tiene una reducción importante; la nueva lógica añade menos de1KB transferido en estas muestras y OCR sigue sin cargarse al abrir esas pantallas.

El cierre congelado pasó de955 a910ms en tres muestras: ahorro pequeño, aunque evita construir colecciones que no presenta. La medición de navegación preparada del harness quedó inconclusa por una respuesta RSC sin cierre: se acotó su timeout a15s, no se presentan cifras falsas. Las pruebas E2E de precarga/invalidation y pérdida de respuesta del pago sí pasan. No se midió aún latencia comparativa del pago ni cold start autenticado de Netlify. La ventana amplia no convierte pruebas de laboratorio en evidencia de iPhone físico.

## Diseño y motion

| Antes | Después | Propósito |
| --- | --- | --- |
| Navegación móvil fuera de alcance al desplazarse | Barra inferior persistente, notch/safe-area y teclado contemplados | Acciones frecuentes con una mano |
| Texto de submit cambia tamaño al esperar | Ancho/alto estables, spinner solo con petición pendiente | Feedback sin saltos ni éxito optimista |
| Apertura anima todos los hijos, incluidas filas financieras | Movimiento limitado a estados y formularios pertinentes | Evitar trabajo y distracción en listas |
| Error puede quedar en grupo colapsado | Abrir ancestros y enfocar campo inválido/aviso | Corrección accesible |

## Entornos y reproducción

QA usa PostgreSQL17-alpine, Auth2.197.0, PostgREST16.4 y Realtime2.140.3; comparte las19 migraciones del repositorio. No es una réplica binaria del hosting remoto. Se usó stack mínimo por límite de disco8GB/vfs; no se cambió infraestructura de producción. `scripts/setup-qa-local.mjs` crea DB/Auth/REST, `scripts/setup-qa-proxy.mjs` lo expone solo en loopback. Para el stack completo preferir Supabase CLI oficial; el mínimo no instala automáticamente Realtime/wal2json. En esta sesión se recuperaron por separado roles/schemas locales, plugin compilado y allowlist `output_plugin_libraries`; conservar esa diferencia al interpretar pruebas.

Sin nuevas dependencias de aplicación, servicios pagos, migraciones ni cambios a Rutinas. No se conserva información de clientes reales en evidencia ni se envían mensajes/avisos reales. Todas las claves de QA quedan fuera de Git. No se modificaron datos remotos. Falta recuperación de producción probada y aceptación física; no se promociona esta rama automáticamente.

## Cierre de verificaciones

- ESLint, TypeScript, build de producción, 110 unit tests y verificador de workspace correctos; pnpm audit --prod:0 avisos conocidos en esta revisión.
- 40 escenarios E2E cubiertos entre corrida inicial y reejecuciones, no una sola corrida limpia. Catálogo grande:226 perfiles sintéticos, búsqueda de200 resultados, paginación contenida, cinco anchos y axe correctos. Las mediciones comparativas anteriores usaron26 clientes; no se mezclan datasets.
- Capturas móvil/PC inspeccionadas en navegador. Teclado real de iPhone, gestos y llegada de push requieren hardware y permiso del comprador.
- Sin migraciones, cambios de políticas o modificaciones a datos de producción; firma de la versión final en Git/PR. Main conserva la versión previa hasta revisión.
- Prettier detectó avisos previos en cinco archivos fuera de esta intervención; no se reformatearon por alcance. Los archivos nuevos/modificados se formatearon.
