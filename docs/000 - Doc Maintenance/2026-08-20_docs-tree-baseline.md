# Docs-tree Gaps — 2026-08-20

**Status:** CURRENT
**Date:** 2026-08-20
**Applies to:** Initial `docs/` organization
**Depends on:** [Documentation index](<../README.md>)

This is an observational maintenance note, not a roadmap or implementation plan.

## The tree today

```text
docs/
├── 000 - Doc Maintenance/   # active: this baseline
├── 00 - Theory/             # placeholder: no accepted theory docs
├── 01 - Design/             # placeholder: raw vision remains in implementation.txt
├── 02 - Implementation/     # placeholder: setup currently lives in README.md
├── 03 - Architecture/       # placeholder: overview currently lives in README.md
├── 04 - Reference/          # placeholder: no project reference docs
├── 05 - Standards/          # placeholder: no released standards
├── 06 - Roadmaps/           # placeholder: no reconciled living roadmap
├── 07 - Status Reports/     # placeholder: no handoff snapshots
├── 08 - Analysis/           # placeholder: no measured deep-dives
└── 09 - Archived/           # active: empty archive index
```

## Gap 1 — Raw source material spans three lanes

`implementation.txt` combines product vision, phased planning, and proposed implementation snippets. **UNRECONCILED:** it is not proof of the current system.

→ Cheap fix: verify its claims against the code, then extract durable material into `01 - Design/`, `02 - Implementation/`, and `06 - Roadmaps/`. Keep unimplemented ideas marked as such. Effort: medium.

## Gap 2 — The root README carries the system map

`README.md` currently serves as project introduction, local-development guide, architecture overview, and usage reference. This is convenient for onboarding but leaves no canonical as-built map under `03 - Architecture/`.

→ Cheap fix: preserve the concise root entry point, move detailed setup to `02 - Implementation/`, and reconcile the module map into `03 - Architecture/`. Effort: small.

## Gap 3 — Test evidence is not presented as a coherent lane

The repository has `test_parser.mjs` and `test-terminal-content-loader.html`, but `package.json` exposes no test command and the root README does not classify their coverage. **known rough edge:** a reader cannot run one command and learn the verified baseline.

→ Cheap fix: document what each test proves, add a repeatable test command when the harness supports it, and record pre-existing failures before expanding coverage. Effort: small to medium.

## Why this note exists

The new folder tree should not imply that documentation already exists or that aspirational prose describes shipped behavior. These markers let the next pass promote material only after reconciliation.

## Suggested cadence

Add one dated note after a session that substantially changes code without updating its canonical architecture, implementation, or reference document. When a gap is resolved, append the outcome to that note's decision log; do not rewrite the original observation.

## Decision log

| Date | Decision |
| --- | --- |
| 2026-08-20 | Established all standard lanes, including the optional maintenance, analysis, and archive lanes, so future documents have an unambiguous home. |
| 2026-08-20 | Left `README.md` and `implementation.txt` in place to avoid promoting or discarding unreconciled claims during structural setup. |
| 2026-08-20 | Reconciled the static publication subset into Design, Implementation, Architecture, Roadmap, and Status Report documents; the broader root README split remains open. |
| 2026-08-20 | Added `npm test` and `npm run test:publication` as coherent evidence for publication metadata and generated output; broader application test coverage remains open. |

## Verification

Run `git status --short` to confirm this setup changes only `docs/`, then decide whether the next reconciliation pass should begin with the root README split or the raw `implementation.txt` decomposition.
