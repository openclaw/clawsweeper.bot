# Changelog

## Unreleased

## 1.0.1 — 2026-10-16

**Highlights:** Keep comment commands running through metadata edits and ignored bot labels, and update the dispatch action with its security-patched HTTP dependency.

- Fix ClawSweeper dispatch concurrency so metadata edits and ignored bot labels cannot displace comment commands; add regression tests and CI. Thanks @SebTardif (#2).
- Update the GitHub App token action to v3.3.0, including its patched HTTP dependency.
- Publish source releases through the shared GitHub Actions pipeline, with a dry run, signed tags, and verified source archives.
