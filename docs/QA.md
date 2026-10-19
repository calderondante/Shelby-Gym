# QA y criterio de entrega

## Regresos y bajas

- [ ] Cuota vencida hace más de 30 días: aparece en el filtro correspondiente y no desaparece sola.
- [ ] Baja y retiro: salen de la lista activa, aparecen en sus filtros y conservan pagos y saldos.
- [ ] Recuperar con cuota vigente: no genera otro cargo.
- [ ] Recuperar después de meses: nueva cuota desde el primer abono; el saldo viejo continúa asociado al período anterior.
- [ ] Historial: alta, cuotas, abonos, saldos al vencimiento y cambios de estado agrupados por día.
- [ ] Monitor no puede retirar perfiles; el dueño sí. RLS no permite escrituras directas a tablas financieras.

## Sorteos e historial mensual

- [ ] El resumen de un mes distingue cobrado en ese mes, saldo actual de cuotas iniciadas ese mes y saldo total de todos los meses; pagos posteriores reducen el saldo correspondiente sin cambiar el cobrado del mes de origen.
- [ ] Cumpleaños sólo solicita mes. Clientes que cumplen ese mes aparecen en Participan o No participan, con motivo legible.
- [ ] El filtro muestra todo el mes aunque la fecha de hoy haya avanzado; no filtra por día. Cada fila exhibe estado actual de cuota y saldo cuando existe, tanto si participa como si no.
- [ ] Alta posterior al cierre queda fuera ese año; el mismo perfil puede entrar el año siguiente con cuota válida.
- [ ] Exactamente 30 días desde el vencimiento participa; más de 30 días queda fuera. Una renovación posterior al sorteo no altera la vigencia usada al cierre.
- [ ] Sólo dueño registra una fecha pasada o de hoy; anónimo/monitor no pueden insertar ni cambiar sorteos, y una fecha registrada no se sobrescribe.

Estado: primera aplicación implementada y verificada localmente el **2026-10-03**. El registro al final detalla lo ejecutado. Los puntos sin marcar son criterios generales de aceptación aún no acreditados completamente; no implican que todas sus partes estén sin probar. No hay aceptación de producción ni pruebas físicas en iOS/Android.

## Desktop, tablet y mobile

- [ ] Verificar cada pantalla/estado a 375, 390, 768, 1024 y 1440 px aproximadamente.
- [ ] Probar navegadores desktop acordados; Chrome/Android y Safari/iOS.
- [ ] Registrar versión/dispositivo real; distinguir emulación, WebKit automatizado y Safari físico.
- [ ] Sin overflow accidental; navegación, acciones principales, overlays y tablas tienen adaptación explícita.
- [ ] Touch targets cómodos, sin dependencia de hover; portrait/landscape, teclado virtual y safe areas revisados.
- [ ] Textos largos, fechas/números, zoom 200% y reflow sin pérdida de funciones.
- [ ] Si hay PWA: instalación/actualización/offline según alcance; logout/cambio de usuario sin datos privados residuales.

## Forms y workflows

- [ ] Labels, required/optional, ayudas y errores asociados accesibles.
- [ ] Validación cliente para feedback y server-side para integridad; constraints DB pertinentes.
- [ ] Submit con feedback inmediato, doble envío/concurrencia controlados y datos conservados ante fallo.
- [ ] Empty/loading/error/success verificables y con acciones útiles.
- [ ] Corrección de errores, cancelación y deshacer; confirmación contextual para acciones irreversibles.
- [ ] Workflow principal y variantes cumplen los criterios de PRODUCT.

## Auth y permissions

- [ ] Login/logout, expiración, recuperación y redirects según requisitos.
- [ ] Servidor valida sesión y autorización en cada frontera; UI no es el único control.
- [ ] Acceso directo a rutas, Server Actions y APIs probado con permisos insuficientes.
- [ ] RLS/grants probados por operación; usuario/anónimo/ownership y cruce de organización si aplica.
- [ ] Cambios de rol/revocación y claims obsoletos contemplados.
- [ ] Service role/secrets no llegan al cliente, assets, logs o Git.
- [ ] Vistas, funciones/RPC y Storage respetan los permisos.

## Casos del gimnasio

- [ ] Dueño configura actividad/oferta simultánea, precio y duración; la opción aparece en el alta con sus condiciones.
- [ ] Plan de un mes pagado el 11 de febrero vence el 11 de marzo, sin convertirlo en 30 días o mes calendario fijo.
- [ ] Definir y comprobar fin de mes, año bisiesto, hora/zona de vencimiento, pago parcial y renovación anticipada/tardía antes de cerrar el cálculo de vigencia.
- [ ] Cuota ficticia de 20.000: 10.000 transferencia + 10.000 efectivo deja abonado 20.000, saldo 0 y ambos medios visibles.
- [ ] Cuota ficticia de 20.000: 12.000 Mercado Pago deja saldo 8.000; abono posterior de 8.000 efectivo completa la misma cuota y conserva ambos registros.
- [ ] Primer abono del 11 de febrero inicia la suscripción mensual hasta el 11 de marzo aunque haya saldo; completar la cuota después no cambia esas fechas.
- [ ] Pantalla global incluye todos los clientes y muestra deuda y vigencia por separado; el filtro de deuda no oculta el acceso al listado completo.
- [ ] Segundo abono y reintento/doble click no generan nuevas suscripciones, cuotas o movimientos duplicados por defecto.
- [ ] Vigencia y estado de pago son visibles por separado en celular y PC; fallo de guardado no muestra saldo confirmado ni pierde inputs.
- [ ] Monitor puede registrar pagos con permiso, pero no modificar precios/duración sin una autorización comercial explícita; correcciones/anulaciones se prueban según permisos acordados.
- [ ] Registro manual de Mercado Pago no crea checkout, cargos, conexión API ni solicitudes de credenciales de pasarela.

## Error handling y seguridad

- [ ] Red lenta, timeout, pérdida de conexión y fallos de backend producen recuperación clara.
- [ ] No se filtran SQL, stack, PII, cookies o tokens; hay trazabilidad de diagnóstico restringida.
- [ ] Revisar IDOR/BOLA, inputs, XSS, redirects, uploads y abuso relevantes.
- [ ] Caché y prefetch no exponen datos privados entre usuarios; invalidación/freshness verificadas tras mutación.
- [ ] Migraciones reconstruyen desde cero y actualizan datos representativos; revisar locks/compatibilidad/recuperación.
- [ ] Backup y restauración probados según riesgo; producción y datos críticos requieren autorización explícita.

## Accessibility

- [ ] HTML semántico; teclado completo con focus visible y orden lógico.
- [ ] Labels y nombres accesibles, títulos de overlays, focus trap/restauración y Escape apropiados.
- [ ] Contraste WCAG 2.2 AA; estados no comunicados solo por color.
- [ ] Errores/anuncios accesibles sin ruido excesivo; no depender solo de toasts.
- [ ] `prefers-reduced-motion`, gestos alternativos y hover gating verificados.
- [ ] Revisión `web-design-guidelines` y comprobación manual; automatización cuando exista app.

## Performance y calidad visual

- [ ] JS cliente y dependencias justificados; fetching sin waterfalls evitables.
- [ ] Imágenes/fuentes optimizadas, contenido principal prioritario, paginación adecuada.
- [ ] Sin errores de consola, hydration ni rerenders innecesarios observados.
- [ ] Core Web Vitals medidos en condiciones acordadas. Referencia inicial: LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1 al percentil 75 con datos de campo cuando existan; no confundir score de laboratorio con evidencia de campo.
- [ ] Revisión visual de jerarquía, spacing, tipografía, densidad y acción principal en todos los estados.
- [ ] Motion con propósito, sin retrasar interacción; revisar con skills de Emil pertinentes.

## Regression testing y entrega

- [ ] Inspección de cambios ajenos y scripts existentes; no sobrescribir configuración válida.
- [ ] Lint, TypeScript strict/typecheck, tests relevantes y build ejecutados con los comandos reales del proyecto.
- [ ] Tests cubren reglas, permisos negativos, errores y workflows críticos; no solo detalles de implementación.
- [ ] Verificación de runtime/navegador tras cambios UI/Next; documentar límites de herramientas y versiones.
- [ ] PRODUCT/ARCHITECTURE/DATA_MODEL/SECURITY/ADR actualizados cuando corresponda.
- [ ] Sin mocks en producción, secretos rastreados ni TODOs silenciosos.
- [ ] Informe con resultado, evidencia, riesgos y pendientes; no declarar completo lo no verificado.

## Registro de pruebas

| Fecha/commit | Feature y criterio | Comando o prueba manual | Entorno/dispositivo/ancho | Resultado/evidencia | Pendiente y responsable |
| --- | --- | --- | --- | --- | --- |
| 2026-10-03 / sin commit | Exploración visual Shelby Gym: Clientes/alta/abonos | Playwright + revisión de capturas; detalle en [design/README](design/README.md) | Chromium, 375/390/768/1024/1440 px; emulación touch y teclado | Correcto en alcance de prototipo; sin overflow ni errores JS; contraste de parejas verificadas | Registro histórico anterior al desarrollo; no acredita el backend posterior |

## Validación de esta base

Ejecutar `node scripts/verify-workspace.mjs`, `npx --yes skills@1.7.0 list --agent codex` y `git status --short`. El script comprueba estructura, integridad local de skills y reglas de exclusión de Git; no sustituye las pruebas de la aplicación. Evidencia inicial en WORKSPACE.


## Evidencia de la aplicación — 2026-10-03, sin commit

| Verificación | Resultado | Alcance y evidencia |
| --- | --- | --- |
| `pnpm lint` + `pnpm typecheck` | Correcto | ESLint y TypeScript strict; tipos de rutas Next y DB |
| `pnpm test` | 5 pruebas correctas | Dinero en centavos, validación de importes/mezcla/ofertas, meses calendario, bisiesto/fin de mes y zona horaria; `tests/domain.test.ts` |
| `pnpm build` | Correcto | Build de producción de todas las rutas, Next 16.3.8 |
| `pnpm test:integration` | Correcto | Auth/PostgreSQL/REST reales y cuentas sintéticas locales; `scripts/test-integration.mjs` |
| Seguridad e integridad | Correcto en casos probados | Anónimo, no-personal y personal revocado sin acceso; monitor no configura precios; escalada de rol denegada; escrituras directas denegadas; replay idempotente, sobrepago, concurrencia de abonos, rollback, cambio de condiciones, snapshots y moneda bloqueada |
| `supabase db reset --local --no-seed` | Correcto | Reconstrucción desde cero de la DB desechable de QA y repetición posterior de integración |
| DB lint y advisors | Sin errores ni avisos | Esquemas `public,private`; advisors locales de seguridad/performance con nivel warn |
| `pnpm test:e2e` | 4 pruebas correctas | Chromium local: login/logout, alta, pago parcial/dividido, error de sobrepago sin perder inputs, persistencia, fechas inalteradas, roles, estados vacíos, responsive, Realtime y axe; `tests/e2e/gym.spec.ts` |
| Realtime | Correcto | Un monitor abona desde otro contexto; el saldo del dueño cambia sin recarga en menos de 8 s |
| Responsive | Sin overflow en 20 combinaciones | Clientes, alta, actividades y perfil a 375/390/768/1024/1440 px; capturas en `docs/design/screenshots/app/` |
| axe-core | Sin infracciones en las vistas examinadas | Clientes, alta, actividades, nueva actividad y ajustes; reglas WCAG 2/2.1/2.2 A/AA. No certifica toda la app ni reemplaza lector de pantalla/manual |
| Next MCP | Sin errores | `get_errors` con sesión de navegador activa y `get_compilation_issues`: listas vacías |
| `pnpm audit --prod` | 0 vulnerabilidades reportadas | Auditoría de dependencias de producción en esta fecha; no garantiza ausencia futura de vulnerabilidades |
| Base del workspace | Correcto | 16 skills, 154 archivos íntegros, documentación y exclusiones Git; `verify-workspace.mjs` |

Revisión visual manual de las capturas móvil/desktop y alta. Se corrigieron contraste del wordmark, targets de botones, conservación de inputs tras errores, foco sobre errores y altura del encabezado móvil. Las animaciones son CSS breves; no hay loops decorativos. Se respeta la preferencia de movimiento reducido.

También se comprobó anteriormente el flujo principal contra `next start`, y se repitió la prueba responsive sobre el build final. No hay mediciones de Core Web Vitals de campo ni simulación exhaustiva de redes lentas. La skill `next-dev-loop` no pudo ejecutarse con su herramienta `agent-browser`, ausente en este entorno: se usaron Playwright y el MCP de Next como verificación independiente, sin declarar cumplimiento literal del workflow especializado.

## Pendientes para aceptar producción

- Dueño/desarrollador: confirmar corte de vencimiento, fin de mes, renovaciones y correcciones de abonos; políticas actuales y restricciones en DATA_MODEL.
- Desarrollador y usuario: Safari/iPhone y Chrome/Android físicos, teclado virtual, portrait/landscape, zoom/reflow, lector de pantalla y pruebas de red/pérdida de conexión.
- Desarrollador: terminar recuperación de acceso y operación de altas/bajas del personal según modelo acordado; comprobar staging, backups y restauración reales.
- Dueño/desarrollador: retención y privacidad, despliegue, dominio y responsabilidades operativas. PWA/offline no implementados; no se cachean registros privados offline.

No se usaron datos de clientes reales ni se creó un proyecto remoto. Las credenciales locales generadas viven en archivos ignorados y quedan fuera de Drive. Los reportes/traces de Playwright también se excluyen porque pueden contener sesiones.

## Ampliación Excel y motion — 2026-10-04

- 12 pruebas de dominio: 5 originales y 7 de importación (fechas civiles, importes argentinos, agrupación, historial con precios distintos, errores, edad y plantilla XLSX real).
- Integración original de Auth/RLS/pagos repetida correctamente; suite nueva `scripts/test-import.mjs` correcta: preview sin escritura, rollback completo, dueño/monitor/anónimo, dos commits concurrentes, reintento, reordenación, duplicados, precios originales, edad referenciada, pagos mixtos, crédito de apertura y cobro posterior sin mover fechas.
- Reconstrucción de **todas** las migraciones en una DB temporal aislada del mismo PostgreSQL, usando el DDL real de Auth sin transferir ownership/ACL del sistema. Se eliminó solo esa DB temporal; la base activa permaneció intacta. DB lint y advisors locales: sin observaciones tras corregir los defaults JSON.
- Build de producción, lint y TypeScript strict correctos. Auditoría de dependencias de producción: 0 vulnerabilidades reportadas. Integridad de las 16 skills y 154 archivos conservada.
- Navegador: ocho pruebas entre `gym.spec.ts` e `import.spec.ts`, incluyendo lectura del XLSX en worker real, vista previa, historial importado, reimportación, archivo corrupto, permisos y movimiento. Se detectó un problema de especificidad/transition heredado en reduced motion y se corrigió; ahora también se cancela la transición CSS que estuviera en curso al cambiar la preferencia.
- Bienvenida, mapeo de columnas y revisión sin overflow a 375/390/768/1024/1440 px. Axe sin infracciones en los estados de importación comprobados. El historial muestra fechas originales y montos históricos; el perfil incluye edad registrada. Capturas en `docs/design/screenshots/import/` y `docs/design/screenshots/app/`.

Se inspeccionaron los estilos durante una pulsación real con puntero: hay feedback en modo normal y ausencia de transformación con reduced motion. Teclado conserva respuesta inmediata. La entrada entre pasos es cancelable; el título recibe foco y se hace visible tras avanzar desde formularios largos. Los navegadores sin `@starting-style` conservan el contenido con cambio inmediato.

Continúan pendientes pruebas físicas en Safari/iPhone y Chrome/Android, lector de pantalla y validación comercial con una planilla anonimizada representativa. No se importaron datos reales ni se desplegó producción. Estos resultados no equivalen a certificación WCAG completa.

Resultado final: **8/8 pruebas E2E correctas contra `next start`**, además de la repetición del recorrido de importación en el build posterior al ajuste de scroll/foco, con el título de revisión comprobado dentro del viewport. Grabación visual en `docs/design/motion/importacion-demo.webm`, solo datos sintéticos y sin pantalla de acceso. La grabación ilustra interacción; la evidencia funcional sigue siendo la suite automatizada.

## Muestra funcional local — 2026-10-13

- `scripts/seed-demo.mjs --qa` creó tres actividades y tres clientes ficticios en Supabase local mediante las RPC existentes. Una segunda ejecución creó **cero** clientes: no duplicó la muestra. Se verificó saldo de ARS 20.000 en el perfil de Sofía.
- `pnpm demo:local --host 172.26.91.253` levantó Next 16.3.8 con Supabase local accesible en la IP privada del entorno de pruebas. HTTP 200 en `/login` y `/auth/v1/health` desde esa red interna. Esa IP pertenece al cloud de esta sesión y **no es una dirección para el celular del usuario**.
- Playwright/Chromium con viewport de 390 × 844, emulación táctil y la URL por IP local: login real, búsqueda, perfil con saldo, actividades e inicio del asistente Excel. Sin errores JS de página. Lista de Clientes sin overflow a 375, 390, 768, 1024 y 1440 px. Capturas en [design/screenshots/demo](design/screenshots/demo/).
- Segundo recorrido móvil con escritura: alta nueva sobre el plan Integral, ARS 10.000 por transferencia más ARS 5.000 en efectivo, saldo ARS 30.000; abono posterior por Mercado Pago de ARS 30.000, cuota completa, dos asientos y vencimiento sin cambios.
- Se esperó el estado «En vivo» antes de capturar. Se ocultó solo el indicador de desarrollo de Next durante el modo demo. El backend, permisos y datos son los reales del entorno local.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (12/12), `pnpm build` y `node scripts/verify-workspace.mjs`: correctos. Se repitió el recorrido móvil tras reiniciar el servidor después del build. `agent-browser`, requerido por la skill `next-dev-loop`, no está instalado; Playwright y el servidor Next aportaron la verificación alternativa, sin atribuirle el flujo literal de esa skill.
- Pendiente: abrir el proyecto en la PC del usuario y comprobar el flujo en Safari/iPhone o Chrome/Android físico, incluyendo firewall/router y teclado virtual. La conexión cloud y la emulación de viewport no sustituyen esa prueba.
