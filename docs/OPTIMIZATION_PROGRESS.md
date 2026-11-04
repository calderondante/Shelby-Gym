# Estado de reanudación ASTRA — 04/11/2026

Rama: perf/administracion-2026-11-04. Base: ed25251. Baseline aislada en /workspace/Shelby-Gym-baseline.

Completado: lecturas selectivas, perfil paralelo, Realtime compartido, colas sin solapamientos, móvil/safe-area/teclado, feedback/foco/motion, OCR cancelable, identidad de gastos estable. Sin cambios SQL/producción/Rutinas/dependencias runtime.

Verificado: 110 unit tests; integración financiera/RLS/concurrencia/importación/operaciones/comunicaciones/papel/avisos. 40 escenarios E2E cubiertos entre ejecución inicial y reejecuciones corregidas, incluidos Realtime real entre equipos, dos gastos consecutivos, catálogo de226 clientes, cinco tamaños, axe y reduced motion. No afirmar suite completa en una única corrida: la primera pasó32/36 y las causas de fallo de entorno/selector fueron corregidas y reprobadas.

Mediciones: tres muestras por ruta, misma DB26 clientes antes de prueba grande, build producción local, backend+200ms. Perfil/Resumen/informe ~18–19% menor HTML completo. Informe17→10 llamadas. CLSintermedio0.15 corregido reservando espacio del contenido. Carga móvil sin mejora consistente. Informe completo y capturas: OPTIMIZATION_2026-11-04.md.

Límites: navegación preparada del harness quedó inconclusa, timeout acotado; E2Eprecarga pasa. No fieldINP, latencia comparativa del pago, cold start autenticado remoto ni iPhone/cámara/push físicos. Sin mensajes reales ni modificaciones remotas. No se aprueba producción sin recuperación y revisión adecuadas. Estado exacto de commit/PR se informa al entregar.

QA recuperado: DB/Auth/REST/proxy y Realtime/wal2json locales, no imagen idéntica al hosting remoto. Guardar secreto solo en .env.local/.env.test.local ignorados. Antes de benchmarks congelar fixtures y evitar E2Een paralelo (colisionan traces y alteran datos). No volver a construir arquitectura ni reinstalar servicios ya operativos.

Entrega revisable: commit de implementación59310f0, rama publicada y PR borrador https://github.com/calderondante/Shelby-Gym/pull/1. Git limpio tras commits. No merge ni despliegue de producción. La documentación de cierre se conserva en commit posterior de esta misma rama.
