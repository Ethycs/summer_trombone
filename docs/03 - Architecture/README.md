# Architecture Index

**Status:** CURRENT
**Date:** 2026-08-20
**Applies to:** The current Summer Trombone system map
**Depends on:** [Documentation index](<../README.md>)

Use this lane for the canonical as-built overview, subsystem boundaries, data flow, runtime behavior, and non-negotiable architectural constraints. Rationale-only proposals belong in Design.

## Active documents

| Document | State | Scope |
| --- | --- | --- |
| [Publication Pipeline](<00 - Publication Pipeline.md>) | CURRENT | Shared content metadata, static build, runtime consumers, and legacy compatibility |

**UNRECONCILED:** The root `README.md` describes the broader centralized `FileSystemSync` architecture, but the non-publication parts of that description have not yet been reconciled into this lane.

## Verification

Run `rg --files "docs/03 - Architecture"` to list architecture documents, then compare their module and data-flow claims with `js/main.js` and `js/modules/`.
