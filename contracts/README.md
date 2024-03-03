# tools

![Node Version](https://img.shields.io/badge/node-18.x-green)
![Github workflow build status(main)](https://img.shields.io/github/actions/workflow/status/transeptorlabs/transeptor-bundler/build.yml?branch=main)

## Run dev node

```bash
chmod +x ./dev-node
```

```bash
./dev-node
```

with transeptor-bundler

```bash
./dev-node -b
```

You can recursively delete all package.json files within a directory
```bash
find ./packages -name 'package.json' -type f -delete
find ./packages -name './test' -type d -delete

```

find ./packages -type d -name 'test' -exec rm -rf {} +
