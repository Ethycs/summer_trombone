# Summer Trombone Documentation

**Status:** CURRENT
**Date:** 2026-08-20
**Applies to:** `docs/`
**Depends on:** [Agentic Technique Master](<Agentic Technique Master.md>)

This index is the entry point for project documentation. The master guide defines the writing conventions and document templates; this file defines how Summer Trombone applies them.

## Non-negotiable filing rules

1. A document has one canonical home. Other documents link to it instead of copying it.
2. Numeric prefixes are reserved for material with a required reading order.
3. Point-in-time documents use `YYYY-MM-DD_kebab-summary.md`.
4. Claims about implemented behavior carry evidence or an honesty marker such as `validated`, `UNCOMMITTED`, `known rough edge`, or `placeholder`.
5. Released standards are frozen. Changes require a new version or an explicit amendment.
6. Raw conversations and brainstorm dumps are source material, not engineering evidence.

## Documentation tree

```text
docs/
├── 000 - Doc Maintenance/   # Dated observations about drift and tree health
├── 00 - Theory/             # Conceptual foundations
├── 01 - Design/             # Intended behavior and rationale
├── 02 - Implementation/     # Setup, tooling, and realized implementation specs
├── 03 - Architecture/       # Current as-built system map
├── 04 - Reference/          # External material and human-facing reference
├── 05 - Standards/          # Internal normative contracts
├── 06 - Roadmaps/           # Living plans and gap tracking
├── 07 - Status Reports/     # Dated handoffs and snapshots
├── 08 - Analysis/           # Measured technical deep-dives
├── 09 - Archived/           # Superseded, immutable documents
├── Agentic Technique Master.md
└── README.md
```

## Where a new document belongs

| If the document answers... | Put it in... |
| --- | --- |
| What concepts or math does the project rest on? | `00 - Theory/` |
| What do we intend to build, and why? | `01 - Design/` |
| How do I set it up or implement the contract? | `02 - Implementation/` |
| How does the built system fit together now? | `03 - Architecture/` |
| What external or audience-facing information do I need? | `04 - Reference/` |
| What MUST conform, independent of rationale? | `05 - Standards/` |
| What remains, and in what order? | `06 - Roadmaps/` |
| What was true on a particular date? | `07 - Status Reports/` |
| What did measurement or comparison show? | `08 - Analysis/` |
| What did an active document supersede? | `09 - Archived/` |
| Where has documentation drifted from reality? | `000 - Doc Maintenance/` |

## Current baseline

| Artifact | Classification | Trust state |
| --- | --- | --- |
| `docs/Agentic Technique Master.md` | Repository documentation policy | CURRENT |
| `README.md` | Root-level project introduction and quick start | UNRECONCILED: it also carries architecture content |
| `implementation.txt` | Raw design and implementation source material | UNRECONCILED: not an active roadmap or as-built specification |
| `docs/000 - Doc Maintenance/2026-08-20_docs-tree-baseline.md` | Initial drift snapshot | CURRENT as of its date |
| `docs/01 - Design/00 - Static Publication Layer.md` | Publication design decision | CURRENT |
| `docs/02 - Implementation/00 - Static Publication Build.md` | Publication setup and build contract | CURRENT |
| `docs/03 - Architecture/00 - Publication Pipeline.md` | As-built publication system map | CURRENT |
| `docs/06 - Roadmaps/00 - SEO Publication Roadmap.md` | SEO implementation and remaining work | Living Document |
| `docs/07 - Status Reports/2026-08-20_static-publication-layer.md` | Implementation handoff | 🟡 IN FLIGHT — uncommitted |

Folder README files are routing indexes. A folder with no other files has no accepted project document in that lane yet.

## Adding or changing documentation

1. Choose the lane using the table above.
2. Start from the matching template in `Agentic Technique Master.md`.
3. Add the status block and hard constraints before explanatory prose.
4. Link prerequisites and related artifacts explicitly.
5. Close actionable documents with a reproducible verification command and a decision frame.
6. When replacing a document, copy the frozen prior version to `09 - Archived/` and update `09 - Archived/ARCHIVE-INDEX.md`.
7. When code changes without matching documentation, add a dated note to `000 - Doc Maintenance/`.

## Verification

Run `Get-ChildItem -LiteralPath docs -Directory | Sort-Object Name | Select-Object -ExpandProperty Name` from the repository root to confirm the lane structure, then use this index to decide the canonical home for the next document.
