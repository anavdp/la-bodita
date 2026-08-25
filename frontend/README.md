# Frontend

React + Vite + TypeScript. Not yet scaffolded — see `design/mockups` for the
approved screens and `../README.md` for the design system reference, and repo
issues for per-screen build tasks. The scaffold lands with issue #1 (shared
layout).

## Required test setup

The repo-wide commit gate (`.githooks/pre-commit`) runs the frontend suite
whenever `frontend/package.json` exists, via:

```bash
npm run test:coverage
```

Whoever scaffolds this app must add that script and set the 85% coverage
floor in `vitest.config.ts`:

```ts
test: {
  coverage: {
    thresholds: { lines: 85, functions: 85, branches: 85, statements: 85 },
  },
}
```
