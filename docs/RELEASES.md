# Release process

Transeptor follows a monthly release cycle. Features land on `main` as [Conventional Commits](https://www.conventionalcommits.org/). [Release Please](https://github.com/googleapis/release-please) opens and updates a release pull request as those commits arrive. Merge that pull request during the release window.

The release pull request bumps `package.json`, `release-please-manifest.json`, and `CHANGELOG.md`. The bundler reads its version from `package.json`, so the Docker image and `web3_clientVersion` follow that bump. While the version is below 1.0.0, a breaking change bumps the minor version.

Merging the release pull request does two things:

1. Release Please tags `vX.Y.Z` (the same form as `v0.16.0`) and publishes the GitHub release. Commits before `v0.16.0` are not included; that tag is the bootstrap point.
2. After build, lint, and test pass, [main.yml](../.github/workflows/main.yml) publishes `transeptorlabs/bundler:<version>` and `transeptorlabs/bundler:latest` to Docker Hub. That job runs only when the merge commit message contains `chore(main): release` or `chore: release`, which is the release pull request title.

Dependency audit runs separately in [audit.yml](../.github/workflows/audit.yml) on pull requests and on pushes to `main` (`yarn run:audit:ci`). It does not gate the Docker publish.
