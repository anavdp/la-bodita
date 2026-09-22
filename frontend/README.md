# Frontend

React + Vite + TypeScript, tested with Vitest and Testing Library.

```bash
npm install
npm run dev            # Vite dev server on :5173
npm test               # Vitest
npm run test:coverage  # tests + the repo's 85% coverage gate
npm run typecheck
npm run build
```

The app talks to the backend at `http://localhost:8000` by default; point it
elsewhere with `VITE_API_URL`. The backend must be migrated and seeded first
(see the root `CLAUDE.md`), otherwise there is no wedding to plan.

## Layout

- `src/components/layout/` — the sidebar and top bar shared by every screen.
- `src/features/<feature>/` — one folder per screen, with its own components,
  data hook and tests.
- `src/api/` — the fetch wrapper and one module per resource. The API speaks
  `snake_case`; these modules map to the `camelCase` the app uses.
- `src/i18n/` — the EN/ES string catalogue behind the sidebar's language
  toggle. A deliberately small mechanism; issue #2 generalises it.
- `src/testing/` — render helpers and factories for tests.

## Design

`design/mockups/.../organic_celebration/DESIGN.md` is the canonical spec, and
`tailwind.config.js` ports the mockups' own tokens so a class means the same
thing here as in the reference markup. Read both before building a screen.

Known gaps in the shared shell, for issue #1 follow-up: the sidebar is hidden
below `md` and the mockups define no mobile navigation to replace it, and the
top bar's Add Task, notifications and settings controls are disabled until the
screens behind them exist.
