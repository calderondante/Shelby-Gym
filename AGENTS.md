# Constitución técnica para Codex

## Propósito y alcance

Este repositorio prepara una base reutilizable para aplicaciones web comerciales. El usuario autorizó iniciar Shelby Gym el 2026-10-03 tras revisar el prototipo. Este repositorio contiene ahora la aplicación, sus migraciones y documentación. No inventar requisitos pendientes del gimnasio ni de otro cliente.

Leer este archivo y los documentos pertinentes de `docs/` antes de trabajar. Conservar configuraciones válidas y cambios ajenos. Un dato pendiente se registra como `Por definir`, con su pregunta; no se convierte en requisito por suposición.

Las instrucciones explícitas del usuario prevalecen sobre las preferencias de las skills. Las skills aportan conocimiento especializado, no autorización para instalar, desplegar, publicar, escribir a producción o ampliar el alcance. Resolver discrepancias con estas reglas y registrar decisiones relevantes en `docs/DECISIONS.md`.

## Stack y límites

- Base recomendada: Next.js App Router, React, TypeScript strict, Tailwind CSS, shadcn/ui, Supabase, PostgreSQL y Supabase Auth. Vercel como hosting inicial; PWA cuando aporte valor verificable.
- Una base de código responsive para desktop, tablets, Android y iOS. React Native/Expo solo ante una necesidad nativa o distribución en stores demostrada y una decisión documentada.
- Preferir versiones estables compatibles y documentación correspondiente a la versión instalada. No adoptar canary, flags experimentales, monorepos o servicios adicionales por costumbre.
- No instalar paquetes para necesidades hipotéticas. Evaluar lo existente, mantenimiento, licencia, accesibilidad, seguridad, peso y coste de mantener cada dependencia. Versionar el lockfile del gestor elegido; no mezclar gestores.

## Skills de proyecto

Las skills están en `.agents/skills/<nombre>/SKILL.md`, con sus referencias locales. Consultar `docs/SKILLS.md` para rutas, alcance, requisitos y conflictos. Leer la skill claramente relevante **antes de improvisar o tomar decisiones importantes**, cargando solo sus referencias pertinentes.

Los tres enlaces relativos defectuosos del AGENTS compilado de React se resuelven a su carpeta `rules/` según el mapa de `docs/SKILLS.md`; no duplicar archivos ni alterar upstream.

| Trabajo | Skill a consultar |
| --- | --- |
| Diseño de interfaces y UI polish | `emil-design-eng` |
| Construir movimiento con propósito | `animate` |
| Revisión puntual de motion | `review-animations` (invocación explícita) |
| Auditoría y planes de mejora | `improve-animations` |
| Encontrar oportunidades de motion | `find-animation-opportunities` |
| Gestos, feedback y principios Apple para web | `apple-design` |
| Elegir una librería ante una necesidad real | `pick-ui-library` (invocación explícita) |
| Comparar prototipos aislados | `prototype` (invocación explícita) |
| React/Next, fetching y performance | `vercel-react-best-practices` |
| Revisión UX y accesibilidad | `web-design-guidelines` |
| Verificación Next en ejecución | `next-dev-loop`, si cumple sus requisitos |
| Adopción deliberada de Cache Components | `next-cache-components-adoption` |
| Optimización medida de navegación con caché | `next-cache-components-optimizer` |
| Supabase, Auth, SSR, seguridad y migraciones | `supabase` |
| Schema, SQL, RLS, índices y performance | `supabase-postgres-best-practices` |
| Componentes y APIs shadcn/ui | `shadcn` |

No ejecutar las fases de implementación de una skill por el mero hecho de instalarla. Las skills con `disable-model-invocation` se solicitan explícitamente; no modificar metadatos upstream para forzarlas. Si una skill requiere herramientas ausentes, comprobarlas y explicar la limitación; continuar verificaciones alternativas válidas dentro del alcance. No actualizar Next ni instalar herramientas solo para satisfacer una skill.

## Calidad del código

- Entregar código production-ready: TypeScript `strict`, sin `any` salvo excepción localizada y justificada; preferir `unknown` y narrowing en fronteras externas.
- Componentes pequeños, reutilizables y con responsabilidad clara. Separar UI, lógica de negocio y acceso a datos. Reutilizar lógica sin crear abstracciones prematuras.
- No hardcodear reglas o datos de negocio; documentar su fuente. Fixtures y mocks únicamente en tests o prototipos aislados, sin caminos de producción que los consuman.
- No dejar TODOs silenciosos, errores tragados o placeholders presentados como funcionalidad terminada. Registrar deuda con impacto, responsable y criterio de resolución.
- Manejar explícitamente estados loading, empty, error y success. Validar datos externos y presentar errores útiles sin filtrar detalles internos.

## UI y UX comercial

Crear interfaces con identidad y claridad de producto, evitando el aspecto de un dashboard genérico generado por IA. Definir jerarquía visual, acción principal, tipografía consistente, spacing excelente, densidad adecuada y feedback inmediato. Consultar `docs/DESIGN_SYSTEM.md` y las skills de Emil cuando corresponda.

No abusar de gradients, glassmorphism, sombras enormes, bordes, iconos o tarjetas para todo. Usar estructura tipográfica y agrupación antes que decoración. shadcn aporta primitivas accesibles, no impone el layout ni la identidad visual; mantener tokens y variantes compartidos.

Cada feature debe responder: ¿sin datos?, ¿fallo?, ¿espera?, ¿error del usuario?, ¿deshacer?, ¿confirmación necesaria?, ¿uso desde celular?, ¿acción principal evidente? Confirmar acciones irreversibles con contexto y consecuencias; favorecer deshacer en las reversibles. Evitar confirmaciones rutinarias sin valor.

Las animaciones deben explicar, orientar o dar feedback, nunca retrasar la interacción ni perjudicar la velocidad percibida. Preferir CSS para problemas simples; no instalar Motion para un fade. Respetar `prefers-reduced-motion`, frecuencia de uso y navegación por teclado. La accesibilidad prevalece sobre recomendaciones de stagger, blur, transform o materiales.

## Responsive y accesibilidad

- Diseñar mobile-first; verificar cada pantalla aproximadamente a **375, 390, 768, 1024 y 1440 px**, con contenido realista, textos largos y estados alternativos.
- Verificar Safari/iOS y Chrome/Android además de navegadores desktop. Emulación de viewport no demuestra compatibilidad con dispositivos físicos: registrar lo realmente probado.
- Nunca asumir hover. Acciones visibles con touch y teclado; limitar efectos hover a dispositivos que lo soporten. Touch targets cómodos, preferentemente al menos 44 × 44 CSS px; justificar excepciones y preservar separación.
- Tablas complejas requieren estrategia móvil explícita: columnas prioritarias, detalle accesible, presentación alternativa o scroll contenido con contexto. No permitir overflow horizontal accidental del documento.
- Usar HTML semántico, labels asociados, navegación por teclado, focus visible, orden lógico y gestión de foco en overlays. ARIA solo cuando HTML semántico no alcance.
- Contraste WCAG 2.2 AA, zoom/reflow, errores vinculados a campos y estados comunicados por texto además del color. No comunicar resultados únicamente mediante un toast efímero.

## Performance

Consultar las skills React/Next antes de cambios importantes. Server Components por defecto cuando tengan sentido, con límites cliente pequeños para interacción real. Minimizar JS enviado, evitar waterfalls y rerenders innecesarios, paralelizar lecturas independientes, paginar datos y optimizar imágenes y fuentes.

Usar lazy loading donde mejore la experiencia, evitando posponer contenido principal. Medir antes de memoizar o añadir dependencias. Definir políticas de caché, freshness e invalidación por recurso. **Nunca compartir datos privados entre usuarios/organizaciones por una clave de caché incompleta**; mantener auth en cada frontera de lectura/escritura. La optimización no justifica retirar controles de autorización.

## Base de datos y Supabase

- Consultar `supabase` y `supabase-postgres-best-practices` antes de schemas importantes, SQL o cambios de RLS.
- **Todo cambio persistente de schema se entrega y aplica mediante migraciones versionadas**, incluidas policies, grants, funciones, vistas, constraints e índices. No editar schema remoto mediante dashboard o SQL ad hoc. Prototipar SQL solo en una DB local desechable; trasladarlo a una migración y comprobar reconstrucción desde cero antes de integrar.
- Si la skill general de Supabase propone iteración con `execute_sql`/`db query`, restringirla al entorno local desechable. No usar esa recomendación como excepción al control de migraciones. Elegir workflow imperativo/declarativo al iniciar el producto y mantener su historial coherente.
- Nunca modificar datos críticos ni producción sin autorización explícita. Antes de aplicar: identificar proyecto y entorno, revisar SQL, impacto, backup y recuperación. Los ejemplos, `db reset` y comandos remotos no se ejecutan indiscriminadamente.
- RLS por defecto en todas las tablas expuestas; mínimo privilegio y denegación por defecto. Grants y RLS son controles distintos. Policies por operación, con `USING` y `WITH CHECK` cuando corresponda.
- Probar acceso autorizado, denegado, anónimo y cruzado entre usuarios/organizaciones cuando ese modelo exista. Nunca suponer multitenancy ni diseñar entidades sin requisitos.
- Service role/secret keys solo server-side y solo para usos privilegiados deliberados; jamás al navegador ni con prefijo `NEXT_PUBLIC_`. En operaciones normales usar el contexto del usuario para conservar RLS.
- Validar inputs server-side; usar constraints DB, claves foráneas reales e índices deliberados basados en consultas/RLS. Instantes en UTC con `timestamptz`; representar fechas civiles por separado y definir zona de visualización.
- Revisar vistas (`security_invoker` cuando corresponda), funciones privilegiadas, grants y Storage. No usar metadata editable por el usuario para autorización; no confiar en claims obsoletos para operaciones sensibles.

## Seguridad

Nunca guardar secretos en Git, logs, capturas o documentación. Usar `.env.local` para secretos de desarrollo y `.env.example` con valores vacíos o placeholders inertes. Solo publicar variables intencionalmente públicas. No leer ni imprimir valores de credenciales para una inspección rutinaria.

Validar y sanitizar según contexto; usar consultas parametrizadas y evitar HTML no confiable. Comprobar en el servidor auth, autorización, IDOR/BOLA, exposición de datos, RLS, inputs, uploads, redirects, errores y logging sensible. Ocultar controles en UI no protege un endpoint, Server Action ni una fila.

Documentar amenazas, permisos, backups, retención y restauración en `docs/SECURITY.md`. Separar entornos; usar datos sintéticos en tests. Si existe PWA, no cachear respuestas privadas o sesiones por defecto; revisar logout, cambio de usuario y datos offline.

## Flujo de desarrollo con IA

Para una feature importante:

1. Inspeccionar código relevante, instrucciones locales y estado de Git.
2. Comprender arquitectura, producto y decisiones existentes; consultar skills relevantes.
3. Plantear una solución breve, criterios de aceptación y riesgos.
4. Identificar archivos afectados; aclarar solo las decisiones que no se puedan resolver con evidencia.
5. Implementar en pasos revisables, conservando el trabajo ajeno.
6. Ejecutar lint, typecheck, tests pertinentes y build según scripts/versiones reales del proyecto. No inventar scripts ni declarar checks no ejecutados.
7. Revisar visualmente pantallas y estados afectados en los tamaños establecidos; registrar evidencia y limitaciones.
8. Revisar seguridad y permisos si toca datos/auth, con pruebas negativas relevantes.
9. Actualizar documentación/ADR e informar resultado, archivos, validación y pendientes.

Evitar tests que solo reflejen la implementación. Probar reglas de negocio, permisos, errores y workflows críticos. No llamar completa a una feature con verificaciones críticas pendientes. Validar instrucciones/skills/Git con `node scripts/verify-workspace.mjs`, además de `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build`. Auth/RLS/pagos se prueban con `pnpm test:integration` y navegador con `pnpm test:e2e`, siempre contra datos sintéticos locales.

No hacer push, deploy, crear servicios ni contactar a terceros sin una instrucción que lo autorice. No hacer commits automáticamente. No ejecutar comandos destructivos ni sobrescribir configuración útil por comodidad. Para instalaciones y actualizaciones, inspeccionar ayuda actual, diff y alcance; consultar `docs/SKILLS.md` para mantenimiento.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
