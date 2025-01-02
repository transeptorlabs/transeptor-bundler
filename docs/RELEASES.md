# Release process

This document outlines our release process for the project. Transeptor follows a monthly release cycle, with a new release released the first week of each month.

Features are developed and merged into the main branch. When the release date is near, the CI/CD pipeline automatically creates a new release PR.

Once the release PR is approved and merged, the CI/CD pipeline will automatically create and build the Docker artifacts and publish them to the Docker Hub.

Release PRs can be triggered manually by running the GitHub action workflow [create-release-pr.yml](https://github.com/transeptorlabs/transeptor-bundler/actions/workflows/create-release-pr.yml).

Release notes will be updated manually by the maintainers along with the changelog.