# Skills de proyecto

Inspección: 2026-10-03. Instalador verificado: `skills@1.7.0`, publicado desde `vercel-labs/skills`. Se consultaron `npx skills --help` y `npx skills@1.7.0 add --help` antes de instalar. Scope de proyecto es el default de `add`: se omitió `--global`, se eligió `--agent codex` y `--copy`.

## Instalación y detección

Las **16 skills** están en `.agents/skills/<nombre>/`, como archivos reales con `SKILL.md` y referencias pertinentes. No hay clones completos en el workspace ni enlaces a skills globales. `skills-lock.json` registra fuentes y hashes del instalador; [skills-provenance.json](skills-provenance.json) registra el commit inspeccionado y SHA-256 de cada archivo copiado.

Codex CLI 0.159.0-alpha.3 fue consultado con el protocolo de lectura `app-server → skills/list`, `cwds: ["/workspace"]`, `forceReload: true`: reconoce las 16 con `scope: repo`, `enabled: true`, **sin errores**. No se lanzó otra tarea de agente ni se ejecutó una skill de implementación para comprobarlo. La extensión de VS Code debe soportar Agent Skills y volver a cargar la sesión para reflejar nuevas skills; esta comprobación no sustituye verificar la versión instalada en tu PC.

Codex carga nombres/descripciones y consulta contenido cuando se selecciona. Invocar explícitamente, por ejemplo: `$emil-design-eng <tarea>` o `$review-animations <archivos>`. `review-animations`, `pick-ui-library` y `prototype` declaran `disable-model-invocation: true` upstream: conservar su uso explícito según AGENTS, sin depender de que cada cliente interprete todos los campos de metadatos del mismo modo.

La skill `shadcn` contiene sintaxis de contexto dinámico y permisos de herramientas de otros agentes; en Codex hay que ejecutar manualmente los comandos relevantes cuando exista un proyecto shadcn. No asumir interpolación automática de `!` ni que `allowed-tools` autorice instalaciones. Aquí solo se incorporó conocimiento, no se ejecutó shadcn/Supabase/Next.

## Inventario y motivo

Todas las rutas siguientes son relativas a `.agents/skills/`.

| Skill | Fuente | Motivo/alcance |
| --- | --- | --- |
| `emil-design-eng` | Emil Kowalski | UI polish, composición, feedback y detalles de producto |
| `animate` | Emil Kowalski | Construir motion con propósito y herramienta mínima |
| `review-animations` | Emil Kowalski | Revisar motion de un diff, sin convertirlo en auditoría global |
| `improve-animations` | Emil Kowalski | Auditar motion existente y escribir planes priorizados |
| `find-animation-opportunities` | Emil Kowalski | Proponer dónde conviene motion y rechazar decoración innecesaria |
| `apple-design` | Emil Kowalski | Principios Apple traducidos a web: gestos, tipografía, continuidad |
| `pick-ui-library` | Emil Kowalski | Selección explícita de librería para una necesidad concreta |
| `prototype` | Emil Kowalski | Explorar variantes aisladas y elegir visualmente antes de integrar |
| `vercel-react-best-practices` | Vercel Labs | React/Next: waterfalls, fetching, bundle, límites cliente y renders |
| `web-design-guidelines` | Vercel Labs | Auditoría UX, accesibilidad y estándares de interfaz web |
| `next-dev-loop` | Vercel / Next.js | Verificar comportamiento Next en ejecución con framework y navegador |
| `next-cache-components-adoption` | Vercel / Next.js | Migración deliberada a Cache Components cuando se elija esa estrategia |
| `next-cache-components-optimizer` | Vercel / Next.js | Mejorar navegación por ruta y protegerla con verificación de regresión |
| `supabase` | Supabase | Desarrollo, Auth/SSR, seguridad, CLI, migraciones y diagnóstico actuales |
| `supabase-postgres-best-practices` | Supabase | Schema, tipos, constraints, RLS, índices, consultas y conexiones |
| `shadcn` | shadcn-ui | APIs, composición, tokens y gestión de componentes oficiales |

## Fuentes y mantenimiento

| Repositorio | Publicador | Último push observado | Snapshot inspeccionado | Archivado |
| --- | --- | --- | --- | --- |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | Emil Kowalski | 2026-10-02 | `e8a175de22ae1e49370fc144c1f3bb9aeedf988d` | No |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | Vercel Labs | 2026-08-28 | `063bee94c3f4df8453406c830b0a7df0f2860278` | No |
| [vercel/next.js](https://github.com/vercel/next.js) | Vercel | 2026-10-03 | `dc7bf6e65d14fbf9494b9af525c01f8a976af27e` | No |
| [supabase/agent-skills](https://github.com/supabase/agent-skills) | Supabase | 2026-10-02 | `c9be0e931b7930f7d02126d04774d904c381e7d7` | No |
| [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | shadcn-ui | 2026-10-02 | `295a1f114a138f23b5dfee0e0c6812394dfeb90c` | No |

Se comprobó propietario, actividad, estado no archivado y archivos SKILL.md mediante API GitHub y catálogo del instalador. El snapshot Next proviene de la rama oficial actual; conocimiento desde canary **no implica usar runtime canary**. El instalador consultó las fuentes actuales; después se comparó cada archivo copiado con su blob Git en el commit inspeccionado para verificar procedencia exacta.

Las licencias declaradas por los repositorios de Emil, Next, Supabase y shadcn son MIT. Vercel Labs no expone una licencia a nivel repositorio en la API consultada; `vercel-react-best-practices` sí declara MIT en su frontmatter. No inferir una licencia global a partir de una skill. Conservar atribución y condiciones upstream al reutilizar/distribuir contenido; revisar licencia de dependencias y registries cuando se incorporen al producto.

Se conservan los textos de licencia oficiales de esas cuatro fuentes en [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), sin alterar las copias de las skills.

## Referencias upstream verificadas

El instalador omitió `metadata.json` de la skill React; no lo requiere la detección Codex y se registró la omisión en procedencia. Todas las referencias necesarias de las skills seleccionadas se conservaron.

El `AGENTS.md` compilado de React contiene tres enlaces relativos que upstream publica con un nivel incorrecto. No duplicar archivos ni modificar la copia para ocultarlo: al consultar ese documento, resolverlos dentro de `rules/`:

| Enlace publicado | Archivo local correcto |
| --- | --- |
| `./async-defer-await.md` | `.agents/skills/vercel-react-best-practices/rules/async-defer-await.md` |
| `./async-cheap-condition-before-await.md` | `.agents/skills/vercel-react-best-practices/rules/async-cheap-condition-before-await.md` |
| `./server-hoist-static-io.md` | `.agents/skills/vercel-react-best-practices/rules/server-hoist-static-io.md` |

## Selección y redundancias

No se instalaron React Native/Expo, Swift, mobile-native, deploy, gestión de tokens, tooling interno del framework, migración Radix→Base UI ni librerías runtime. Partial Prefetching quedó fuera de la selección inicial: es una optimización avanzada condicionada a arquitectura/versiones y no una necesidad de esta base.

El solapamiento entre skills de Emil es intencional: comparten criterios pero separan construcción, revisión, auditoría, búsqueda de oportunidades y prototipado, todos solicitados. No ejecutar todas para un cambio pequeño. React cubre ingeniería transversal; Next cubre loops concretos del framework. Supabase general cubre productos e integración; PostgreSQL profundiza integridad/SQL/RLS/performance. No se encontraron duplicados funcionalmente idénticos que hubiera que quitar.

## Conflictos y reglas de uso

| Conflicto potencial | Resolución del workspace |
| --- | --- |
| Supabase propone SQL directo para iterar schema | Solo en DB local desechable; todo cambio persistente, RLS/grants incluidos, se entrega y aplica mediante migraciones |
| `pick-ui-library` favorece Base UI/Sonner/Zustand y otras opciones | No cambiar base shadcn ni instalar competidores/stores sin necesidad; seguir la base/API del proyecto y evaluar dependencia real |
| Motion/Apple recomienda materiales, blur, springs o stagger | Claridad, velocidad, accesibilidad y reduced motion prevalecen; no introducir decoración o efectos por checklist |
| Una revisión de motion rechaza fades sin transform | Una alternativa reduced-motion puede evitar transform; no convertir recomendación estética en barrera de accesibilidad |
| React propone SWR/LRU/memo/preload en ciertos casos | No instalar ni cachear por defecto; medir, evitar shared state/filtraciones y definir freshness/invalidación |
| Next oficial exige 16.3+/Turbopack/herramientas y sugiere upgrade | Comprobar versión estable y requisitos reales; no actualizar ni activar flags solo por disponer de una skill |
| Skills usan saludos iniciales, formatos o workflows de aprobación | Invocar con tarea concreta y respetar alcance explícito del usuario; una skill instalada no obliga a pausar la preparación |
| `improve-animations` produce planes, `prototype` requiere elegir variante | Usarlas para esos objetivos; no confundir auditoría/prototipo con implementación completa ni dejar mocks en producción |
| Skills citan otras herramientas, issues externos o subagentes | No crear servicios, contactar terceros ni delegar solo por instalar skills; hacerlo únicamente si el trabajo autorizado lo requiere y las instrucciones aplicables lo permiten |

Las referencias de reglas React pueden recomendar distintos tratamientos según contexto; seguridad/auth y reglas del proyecto prevalecen sobre optimizar una métrica aislada. No editar upstream para ocultar conflictos: se documentan aquí y en AGENTS.

`web-design-guidelines` consulta reglas frescas desde el repositorio oficial de Web Interface Guidelines durante cada revisión; la skill es local, pero esa fuente requiere red. Si no está disponible, registrar el límite y aplicar QA/estándares locales sin fingir la consulta.

## Comandos reproducibles de selección

Estos comandos reinstalan la **selección** desde las fuentes actuales, no garantizan el mismo commit. No es necesario ejecutarlos al clonar: las copias ya están en el repositorio. Antes de reinstalar/actualizar, inspeccionar cambios locales y ayuda vigente; `--yes`/`--copy` pueden reemplazar archivos instalados.

```bash
npx --yes skills@1.7.0 --help
npx --yes skills@1.7.0 add --help
npx --yes skills@1.7.0 add emilkowalski/skills --list
npx --yes skills@1.7.0 add vercel-labs/agent-skills --list
npx --yes skills@1.7.0 add vercel/next.js --list
npx --yes skills@1.7.0 add supabase/agent-skills --list
npx --yes skills@1.7.0 add shadcn-ui/ui --list

npx --yes skills@1.7.0 add emilkowalski/skills --agent codex --skill emil-design-eng animate review-animations improve-animations find-animation-opportunities apple-design pick-ui-library prototype --copy --yes
npx --yes skills@1.7.0 add vercel-labs/agent-skills --agent codex --skill vercel-react-best-practices web-design-guidelines --copy --yes
npx --yes skills@1.7.0 add vercel/next.js --agent codex --skill next-dev-loop next-cache-components-adoption next-cache-components-optimizer --copy --yes
npx --yes skills@1.7.0 add supabase/agent-skills --agent codex --skill supabase supabase-postgres-best-practices --copy --yes
npx --yes skills@1.7.0 add shadcn-ui/ui --agent codex --skill shadcn --copy --yes

npx --yes skills@1.7.0 list --agent codex
node scripts/verify-workspace.mjs
git status --short
```

`--list` no admite `--json` en esta versión; `list --agent codex --json` sí. En la instalación inicial se usó `DISABLE_TELEMETRY=1` a nivel de cada proceso. No se alteró configuración global del usuario.

## Actualizaciones

Actualizar una fuente/skill a la vez: revisar actividad/publicador/licencia, listar catálogo, leer SKILL y referencias cambiadas, comparar diff y reconciliar conflictos. Inspeccionar `npx --yes skills@1.7.0 update --help` antes de usar `update`; elegir scope proyecto explícito (`--project` en esta versión) y nombres concretos. No correr actualizaciones masivas/globales.

Versionar copias, lockfile y procedencia revisada juntos. Regenerar hashes y comprobar blobs contra el nuevo commit; no cambiar el manifiesto solo para silenciar una validación fallida. El lockfile del instalador no se presenta como pin completo a commit: para reproducir exactamente esta base, conservar/clonar sus archivos versionados.
