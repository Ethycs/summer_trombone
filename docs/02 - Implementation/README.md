# Implementation Index

**Status:** CURRENT
**Date:** 2026-08-20
**Applies to:** Development setup, tooling, integration, and realized specs
**Depends on:** [Documentation index](<../README.md>)

Use this lane for reproducible setup, build and deployment procedures, toolchain notes, integration gotchas, and specifications realized directly by code. Aspirational behavior does not belong here.

## Active documents

| Document | State | Scope |
| --- | --- | --- |
| [Static Publication Build](<00 - Static Publication Build.md>) | CURRENT | Canonical HTML, metadata, discovery files, navigation, and verification |

**UNRECONCILED:** General development commands still live in the root `README.md`; this lane now covers the publication build but not the complete local setup.

## Verification

Run `rg --files "docs/02 - Implementation"` to list implementation documents, then verify every procedure against the current `package.json` scripts before relying on it.
