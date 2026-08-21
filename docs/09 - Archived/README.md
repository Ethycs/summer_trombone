# Archive Policy

**Status:** CURRENT
**Date:** 2026-08-20
**Applies to:** Superseded documentation snapshots
**Depends on:** [Documentation index](<../README.md>), [Archive index](<ARCHIVE-INDEX.md>)

This lane is append-only. Copy a superseded document here without editing its contents, then add its original path, archive path, replacement, and archive date to `ARCHIVE-INDEX.md`. Raw brainstorm dumps and unresolved TODO stubs are not archives.

## Verification

Run `rg --files "docs/09 - Archived"` to list the archive, then confirm every snapshot appears in `ARCHIVE-INDEX.md` and links to its active replacement.
