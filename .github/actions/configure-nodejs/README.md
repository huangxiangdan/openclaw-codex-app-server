# configure-nodejs action

Sets up Node.js, enables Corepack, restores a lockfile-keyed `node_modules` cache, and only runs `pnpm install --frozen-lockfile` on cache misses.

## Required workflow usage pattern

Use this action in a dedicated `install-deps` job first, then make all build/test jobs depend on that job with `needs: install-deps`.

Why:

- Cache key is based on `package.json` and `pnpm-lock.yaml`.
- When the dependency graph changes, parallel jobs can all miss cache, run full installs, and race to save the same key.
- Running one install job first seeds the new cache key once; dependent jobs then restore `node_modules` and skip reinstalling.
