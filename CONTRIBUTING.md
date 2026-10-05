# Contributing

Thanks for helping Coach coach better. Contributions of every size are welcome: a missing exercise, a translation, a new data source, or better coaching logic.

## Layout

```
.claude-plugin/marketplace.json     the marketplace (this repo)
plugins/coach/.claude-plugin/       plugin manifest (name, version)
plugins/coach/skills/coach/
  SKILL.md                          how the coach behaves (the "brain")
  references/                       playbooks the coach reads on demand
  scripts/coach.mjs                 data engine (Node.js, no dependencies)
  scripts/lib/                      engine modules
  scripts/exercises.json            exercise catalogue (en/es names, muscle groups)
examples/demo/generate.mjs          synthetic 12-week dataset ("Alex")
tests/                              node:test suite
docs/media/                         README media, rendered from HTML
```

## Development

Requirements: Node.js 22+ for the test runner (the engine itself runs on Node 20+).

```bash
npm test                       # engine tests
claude plugin validate .       # marketplace + plugin manifests
claude --plugin-dir ./plugins/coach   # try your changes in a real session
```

Play with the demo data without touching your own:

```bash
COACH_HOME=/tmp/coach-demo COACH_TODAY=2026-10-05 node examples/demo/generate.mjs
COACH_HOME=/tmp/coach-demo COACH_TODAY=2026-10-05 node plugins/coach/skills/coach/scripts/coach.mjs workouts balance
```

## Rules of thumb

- **The engine computes, the skill coaches.** Numbers, parsing and thresholds go in `scripts/`, with a test. Judgement, tone and explanations go in `SKILL.md` and `references/`.
- **Coaching changes need evidence.** Link the research, position stand or textbook in the PR. Keep ranges, not dogma, and say when the user's data should override them.
- **Safety rules are not optional.** Anything touching minors, deficits, screening or supplements must keep `references/safety.md` and the engine guards consistent, with tests.
- **No personal data in the repo.** Fixtures and examples are synthetic.
- **New exercises**: add them to `exercises.json` with the name exactly as Hevy/Strong log it, `name.en` and `name.es`, and muscle groups from `exercises groups`. Primary means the muscle that limits the set.
- **No em-dashes in `SKILL.md`**: the coach copies its formats into replies (CI checks this).

## Commits and releases

Commit messages and PR titles follow [Conventional Commits](https://www.conventionalcommits.org): `feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`. Releases are automated: release-please opens a release PR that bumps the version in `package.json`, `plugin.json` and `SKILL.md` and updates `CHANGELOG.md`. Merging it tags the release, attaches the zips and makes the update available to every user through the marketplace.
