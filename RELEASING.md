# Releasing

Releases are cut by [release-please](https://github.com/googleapis/release-please) from
[Conventional Commit](https://www.conventionalcommits.org/) messages. Nobody edits a version
number or a changelog entry by hand.

## The loop

1. Land commits on `main` with conventional messages (`feat:`, `fix:`, `docs:`, …).
2. `.github/workflows/release.yml` keeps a **"chore: release x.y.z" PR** open, continuously
   rewritten to reflect everything merged since the last tag. It carries exactly two changes:
   the version in `package.json` and a new section in `CHANGELOG.md`.
3. Merging that PR is the act of releasing. The workflow then tags `vx.y.z`, publishes a GitHub
   Release, runs the tests, and pushes the package to npm with a signed provenance attestation.

Nothing reaches npm until that PR is merged, so the PR is the review gate — if the proposed
version or changelog looks wrong, fix the commits rather than the PR.

### What decides the version

While the package is pre-1.0, `feat:` bumps the minor and `fix:` bumps the patch — so `0.0.1`
plus one feature is `0.1.0`, not `0.0.2`. A `!` suffix or a `BREAKING CHANGE:` footer bumps the
minor too, until the first `1.0.0`. Commit types that don't affect users (`chore`, `ci`, `test`,
`build`, `style`) are hidden from the changelog and never bump the version on their own.

To override the computed version for one release, set `release-as` in `release-please-config.json`,
merge the resulting PR, then remove the key again.

## One-time setup

These are repository settings, not code — they have to be done once, by hand, before the first
release PR can merge successfully.

1. **Let Actions open PRs.** Settings → Actions → General → Workflow permissions → tick
   *Allow GitHub Actions to create and approve pull requests*. Without it, release-please fails
   with a permissions error when it tries to open the release PR.
2. **Add the npm token.** On npmjs.com, Access Tokens → Generate New Token → **Granular Access
   Token**, with *Read and write* on `agent-strata` (or on all packages, for the very first
   publish, since the package does not exist yet). Add it to the repo as the secret `NPM_TOKEN`
   under Settings → Secrets and variables → Actions.

## After the first publish: drop the token

npm's [trusted publishing](https://docs.npmjs.com/trusted-publishers/) cannot be used for a
package's *first* release — you can only configure a trusted publisher on a package that already
exists, which is why `0.0.1` goes out with `NPM_TOKEN`.

Once `0.0.1` is on npm, the long-lived token can be retired:

1. On the package's npmjs.com settings page, add a trusted publisher: repository
   `pessato/agent-strata`, workflow `release.yml`.
2. Delete the `NPM_TOKEN` secret from the repo, and delete the token on npmjs.com.
3. Remove the `NODE_AUTH_TOKEN` env block from the publish step in
   `.github/workflows/release.yml`. The `id-token: write` permission is already in place, so
   authentication switches to OIDC with no other change.

Provenance is attested either way; trusted publishing only removes the standing credential.
