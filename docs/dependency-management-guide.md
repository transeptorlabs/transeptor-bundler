# Dependency Management

## Overview

Transeptor Labs prioritizes security and stability, so we will manually manage Transeptor dependencies. Any new dependencies will be thoroughly evaluated to ensure they do not introduce security vulnerabilities. 

## Version Locking

All production dependencies in the `bundler-relayer` and `bundler-builder` nodes `package.json` will be locked. Dev dependencies the nodes use are set at `Caret Version(^)`.

## Dependency Audit Process

Monthly audits will be conducted to review and update our dependencies using `yarn audit`. If there are any vulnerabilities or outdated dependencies, include the necessary updates in the next minor release and detailed release notes.

**Critical Updates:**
For cases where a critical security vulnerability is discovered in a dependency used by our nodes, the monthly audit cycle will be bypassed, and the dependency will be updated in a patch release.

---