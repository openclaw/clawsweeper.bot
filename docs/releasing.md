# Releasing

This static site publishes GitHub source releases only. The private npm manifest
is local project metadata, not an npm package. There are no native binaries,
Homebrew packages, or Sparkle feeds. Release commands do not deploy to Vercel;
the existing deployment integration remains separate.

## Prepare

1. Sync `main` and require its exact commit's CI to pass. Check for another
   maintainer's in-flight release before starting.
2. Use a patch version for fixes and dependency/security updates, or a minor
   version for new user-facing features. Update `package.json` and move all
   `Unreleased` bullets into a dated `## X.Y.Z — YYYY-MM-DD` section, preserving
   every bullet and contributor credit. Put a one-line `**Highlights:**` first
   and keep an empty `## Unreleased` above the release section.
3. Run `node --test --test-concurrency=2 tests/*.test.mjs` and `actionlint`.
   Review the diff, including removed versus re-added changelog bullets.
4. Open a release-prep PR, run independent autoreview, require CI at the full
   PR head SHA, then merge. Require push CI at the resulting `main` commit too.

## Rehearse and publish

The only publication path is `.github/workflows/release.yml`, using the shared
`openclaw/release-workflows` source-release pipeline at `v1`. It validates the
protected source commit and exact notes, runs tests without write credentials,
and verifies the same source archives on two independent runners before
publication. There is no local `gh release create` path.

1. Dispatch `release.yml` on `main` with `version=X.Y.Z` and `dry_run=true`.
   Confirm that the run uses the release-prep merge commit and succeeds.
   Do not advance `main` between that rehearsal and tagging.
2. Create an annotated SSH-signed `vX.Y.Z` tag at that commit using the fleet
   release key from the `Release - Git tag SSH signing key - all repos` item.
   Never use a machine's default signing key or move an existing tag. Before
   pushing, require both of these checks to succeed:

   ```sh
   set -e
   git -c gpg.format=ssh -c gpg.ssh.allowedSignersFile=.github/release-allowed-signers verify-tag vX.Y.Z
   test "$(git rev-parse vX.Y.Z^{})" = "<release-prep merge commit>"
   git push origin refs/tags/vX.Y.Z
   ```

3. Follow the exact tag-triggered workflow run. On failure, keep the tag fixed
   and use the shared pipeline's retry support; never delete or move the tag.
4. Read `repos/openclaw/clawsweeper.bot/releases/tags/vX.Y.Z` with `gh api`.
   Require a published, non-prerelease release and a body byte-identical to
   the dated changelog section. Download every asset by its release URL,
   verify `SHA256SUMS`, and match `ASSET-INVENTORY.json` to the tagged commit.
5. Extract both source archives, confirm the package version, and run the
   regression tests from the downloaded source. Leave `main` synchronized and
   clean, with the empty `Unreleased` section ready for the next change.
