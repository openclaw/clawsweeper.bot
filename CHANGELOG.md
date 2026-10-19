# Changelog

## Unreleased

- Restore CI after the keyless OIDC dispatch migration with updated command coverage, synthetic intake failure tests, and current dispatch documentation.
- Update CI checkout to v7.0.1 for dependency security fixes and safer fork handling.
- Ignore maintainer opt-in reminders in the comment prefilter so quoted commands do not queue another dispatch. Thanks @SebTardif (#4).
- Keep comment commands dispatching when the optional target acknowledgement token cannot be minted. Thanks @SebTardif (#5).

## 1.0.1 — 2026-10-16

**Highlights:** Keep comment commands running through metadata edits and ignored bot labels, and update the dispatch action with its security-patched HTTP dependency.

- Fix ClawSweeper dispatch concurrency so metadata edits and ignored bot labels cannot displace comment commands; add regression tests and CI. Thanks @SebTardif (#2).
- Update the GitHub App token action to v3.3.0, including its patched HTTP dependency.
- Publish source releases through the shared GitHub Actions pipeline, with a dry run, signed tags, and verified source archives.
