# Optimización de navegación — 27/10/2026

## Cambios

- Identidad verificada con `getClaims`; el rol activo y la sesión siguen verificándose por RLS en cada lectura. Cliente y contexto deduplicados por render con `React.cache`.
- Lecturas independientes en paralelo, y nombres de clientes unidos a la consulta de cuotas en Historial para evitar consultas posteriores por lotes.
- Cada sección de Mensajes consulta los datos que muestra. No se cargan campañas/clientes/plantillas al consultar Canales o Preparados.
- El logo usa el recurso cuadrado de la marca y tamaños adecuados; ya no descarga una captura de teléfono grande para mostrar el emblema pequeño.
- Precarga completa y limitada en memoria del router: como máximo dos rutas frecuentes al iniciar, después solo con intención de teclado, puntero o touch. Se omite con ahorro de datos/2G/desconexión, espera el fin de la navegación inicial y no se repite automáticamente con cada refresco. Las intenciones repetidas se deduplican durante 20 s.
- Feedback inmediato de navegación mediante `useLinkStatus`; respeta el movimiento reducido existente.

No hay caché persistente de fichas, caché compartida de servidor, nuevas dependencias, migraciones ni cambios de datos de producción.

## Mediciones de servidor

Entorno: Next en build de producción, Chromium y Supabase **locales**, base con datos sintéticos. Se añade **200 ms a cada petición HTTP de Auth/REST** mediante un proxy local. Proceso caliente; tres muestras por pantalla, mediana del HTML completo autenticado. El navegador se retira de la página para excluir precargas y Realtime de los contadores. Las cifras no son medidas de la conexión del comprador ni del arranque en frío de Netlify.

| Pantalla | Antes (ms) | Después (ms) | Peticiones antes → después |
| --- | ---: | ---: | ---: |
| `/clientes` | 1152 | 1088 | 5 → 5 |
| `/actividades` | 924 | 992 | 5 → 5 |
| `/historial` | 2169 | 1211 | 19 → 17 |
| `/ajustes` | 902 | 897 | 4 → 4 |
| `/comunicaciones?seccion=campanas` | 1149 | 936 | 12 → 8 |
| `/comunicaciones?seccion=historial` | 1159 | 920 | 12 → 5 |
| `/comunicaciones?seccion=canales` | 1123 | 895 | 12 → 5 |

Historial reduce la espera aproximadamente un 44%; Canales y Preparados evitan 7 de 12 peticiones. Clientes, Actividades y Ajustes no muestran una mejora grande o consistente en esta medición; no se les atribuye una reducción no demostrada. La prueba local usa JWT HS256 y el SDK mantiene la comprobación por Auth; producción usa ES256, cuya validación puede realizarse con claves públicas verificadas. No se cuantifica ese ahorro adicional sin una medición autenticada en el equipo del comprador.

## Navegación preparada

Chromium con viewport de celular y touch; misma latencia añadida de 200 ms por petición del backend durante el cambio Clientes → Actividades. Tres contextos independientes por modalidad. La modalidad preparada espera a que la precarga termine antes de tocar la pestaña; la modalidad sin precarga usa ahorro de datos. Se mide desde el toque hasta que aparece el título de la pantalla con sus datos.

- Sin precarga: [1348, 1386, 1427] ms; mediana **1386 ms**.
- Con precarga completa: [243, 287, 96] ms; mediana **243 ms**.

La mejora depende de que haya tiempo/conexión para preparar la pantalla; no se promete esa cifra para cada toque, dispositivo o conexión. Los datos siguen actualizándose mediante mutaciones, Realtime y refresco de 30 s. La regresión verifica un cambio desde otra sesión antes de abrir la ruta precargada y el cierre del acceso al salir.

## Marca

En la prueba a 390 px y densidad 2: logo optimizado de **21.140 a 3.378 bytes** (aprox. 84% menos); ancho solicitado de 1.200 a 256 px. Se reutiliza el logo provisto por el usuario, sin cambiar su identidad.

## Compatibilidad y límites

Next 16.4.1 requiere `PrefetchKind.FULL` en sus opciones para preparar el contenido dinámico completo; el modo automático puede preparar solamente el loading. Ese enum queda acotado al componente de navegación, con Next fijado en el lockfile y una prueba de la precarga real. Revisarlo al actualizar Next.

La instalación continúa siendo una PWA y necesita internet. Esta revisión no elimina el arranque del motor del navegador, las demoras del sistema del teléfono ni todos los efectos de un arranque en frío del hosting gratuito. La fluidez y los workflows deben aceptarse en iPhone/Safari y Android/Chrome físicos.

Ver [estado de entrega](HANDOVER_STATUS.md) para tareas comerciales y de recuperación pendientes.
