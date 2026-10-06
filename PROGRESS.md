# PROGRESS — publicar la skill como `FlatHill70/coach-ai`

Origen: skill personal `~/.claude/skills/entrenador` (no se toca). Este repo es la versión universal.

## Decisiones cerradas
- Nombre `coach`, cuenta personal FlatHill70, repo público, licencia MIT.
- Bilingüe: README en inglés + README.es.md; la skill responde en el idioma del usuario.
- Instalación: marketplace de Claude Code (`/plugin marketplace add FlatHill70/coach-ai`) + instalador manual (install.sh / install.ps1).
- Fuentes v1: Hevy CSV, Strong CSV, Apple Salud vía Atajo, Health Connect, Hevy API (hevy-mcp), registro por chat.
- Nutrición completa: objetivos, TDEE adaptativo, menús, lista de la compra.
- Seguridad: cribado PAR-Q+; modo adolescente 13–17 (creatina solo 16–17 con consentimiento del tutor); <13 sin plan de gimnasio.
- Ejercicios propios: `exercises add` → `~/.coach/exercises.custom.json`.
- Media: banner + badges, capturas de conversación, GIF de demo.
- CI/CD: tests + validate en PR; release-please (versión en plugin.json/SKILL.md/package.json, CHANGELOG, tag, release con zip); auto-update vía marketplace.

## Hecho
- [x] Fase 1 — motor (`scripts/coach.mjs` + lib), catálogo bilingüe de 144 ejercicios, demo "Alex", 10 tests en verde.
- [x] Fase 2 — SKILL.md + referencias (safety, onboarding, levels-and-goals, programming, weak-points, nutrition, data-sources, apple-shortcut, cli). `claude plugin validate` OK.

- [x] Fase 4 — README/README.es, CONTRIBUTING, CHANGELOG, plantillas de issues, install.sh/ps1 (`4dfb4b1`).
- [x] Fase 5 — CI (tests en matriz + validate + smoke Node 20), release-please, workflow de release con zips y tag `coach--vX`.
- [x] Conversaciones reales grabadas con `docs/media/record-conversations.mjs` (`claude -p --setting-sources project`, sin shell:true en Windows).

- [x] Media en español (2026-10-06): conversaciones grabadas en castellano (`record-conversations.mjs --lang es`), `build.mjs` renderiza EN en `docs/media/` y ES en `docs/media/es/`; README.es usa la media ES. Badges rehechas (`for-the-badge`, logos, versión leída de `plugin.json`).

## En curso
- [ ] Fase 3 — media (banner claro/oscuro, social preview, 5 capturas + 2 móvil, GIF). Dirección: "Libreta de entrenamiento" (seed ec6191fb, pick). Ejecuta frontend-designer en docs/media/. Falta: revisión final (finish reviewer) y DESIGN.md.

## Pendiente
- [ ] Fase 6 — crear repo FlatHill70/coach-ai, push, permisos de Actions para release-please, release v0.1.0 + assets, topics, social preview (manual en Settings: GitHub no tiene API), probar `/plugin marketplace add` + install desde cero.
