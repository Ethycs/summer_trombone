# Content Submodule and Auto Deploy

**Status:** CURRENT
**Date:** 2026-09-09
**Applies to:** Content authoring, manifest dates, CI deployment
**Depends on:** [Static Publication Build](<00 - Static Publication Build.md>)

Content lives in its own repository and is mounted here as the `blog/` submodule,
so writing is separated from site engineering. Pushing an article there rebuilds
and redeploys the site without touching this repository by hand.

| | |
| --- | --- |
| Content repository | [Ethycs/summer_trombone_content](https://github.com/Ethycs/summer_trombone_content) |
| Mount point | `blog/` (`posts/*.md`, `papers/*.tex`) |
| Trigger | `repository_dispatch` of type `content-updated` |

## Publishing flow

```text
author pushes posts/new-piece.md
        │
        ▼
content repo: .github/workflows/notify-site.yml
        │  POST /repos/Ethycs/summer_trombone/dispatches
        │  event_type: content-updated        (needs SITE_DISPATCH_TOKEN)
        ▼
site repo: Build and Deploy
        │  git submodule update --remote blog   ← advances the pinned commit
        │  generate-manifest.js
        │  npm test → build → dist assertions
        │  auto-commit: system/filesystem.json + blog pointer
        ▼
GitHub Pages
```

## Why the pointer has to be advanced

A submodule records a fixed commit, not a branch. A push to the content
repository therefore changes nothing here on its own — without the
`git submodule update --remote` step the site would rebuild the *previously
pinned* content and appear to ignore the new article.

The pointer is advanced only for `repository_dispatch` and an opt-in
`workflow_dispatch`. Ordinary pushes to this repository build against the pinned
commit, so site-code changes stay reproducible and cannot accidentally publish
half-finished writing.

The auto-commit step stages `blog` alongside the manifest, so the advanced
pointer is recorded. Pushes made with `GITHUB_TOKEN` do not re-trigger
workflows, so this cannot loop.

## Dates across the submodule boundary

`generate-manifest.js` dates a **new** article from the first commit that added
it. That history now lives in the content repository, so the `git log` calls run
with their working directory inside `blog/` and a path relative to it
([generate-manifest.js](<../../.github/scripts/generate-manifest.js>)). Run from
the repository root they would return nothing — the parent tracks only a commit
pointer — and the fallback would use filesystem timestamps, which on a runner
are the checkout time.

Checkout therefore needs both `fetch-depth: 0` and `submodules: recursive`; a
shallow submodule clone leaves `--follow` with nothing to read.

**Existing articles are not re-derived.** The generator preserves `created` from
the previous `system/filesystem.json` and only consults git for files it has not
seen. Published dates are durable data, so rewriting content history cannot
silently move them. This is what protected the three existing pieces during the
migration: `git subtree split` could not carry history from before the content
moved into `blog/`, which would otherwise have shifted `premium_for_that` by
three days and `Green Teaming` by one.

## Working locally

```bash
git clone --recurse-submodules https://github.com/Ethycs/summer_trombone.git

# on an existing clone
git submodule update --init --recursive

# pull the latest content
git submodule update --remote blog
```

An empty `blog/` means the submodule was never initialised; the build will
report zero documents rather than failing loudly.

To edit content, commit inside `blog/` and push from there — that is a commit to
the content repository, and it is what triggers the deploy.

## Required secret

`SITE_DISPATCH_TOKEN` in the **content** repository: a fine-grained PAT with
`Contents: read and write` on `Ethycs/summer_trombone`. `GITHUB_TOKEN` cannot
start a workflow in another repository. The dispatch workflow fails with an
explicit error when the secret is absent, rather than passing while publishing
nothing.
