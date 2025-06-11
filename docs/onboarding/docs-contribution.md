# Docs contribution

This document outlines the process for making changes to the documentation site. The docs are built with Docusaurus and maintained on the [website](https://github.com/transeptorlabs/transeptor-bundler/tree/website) branch.

To contribute changes, fork the repo and create a branch off of `website`. Once your changes are ready, open a pull request back into the `website` branch.

When the pull request is approved and merged, the GitHub action will automatically deploy the updated docs site.

- [Transeptor Docs site](https://transeptor.transeptorlabs.io/docs) 

## Steps

1. Fork the repository and clone it locally.

2. Check out the `website` branch.

```bash
git checkout website
```

3. Create a new branch for your changes.

```bash
git checkout -b docs/your-change
```

4. Make your changes in the `docs/` directory.
5. Commit and push your changes.

```bash
git add .
git commit -m "docs: describe your change here"
git push origin docs/your-change
```

6. Open a pull request targeting the `website` branch.

Once merged, the changes will be live on the docs site automatically.
