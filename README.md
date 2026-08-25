# La Bodita

Wedding-planning web app — tracks registro civil (Spain) paperwork, Italian
documentation, venue/church logistics in Venezuela, guest list, budget, and
a shared calendar/countdown. Built for two users (bride/groom), bilingual
(English/Spanish).

## Stack

- **Backend:** FastAPI + SQLAlchemy + SQLite
- **Frontend:** React (Vite) + TypeScript
- **Hosting:** self-hosted on a Raspberry Pi, Dockerized, reached via Tailscale
- **Documents:** uploaded files stored in a private Google Cloud Storage bucket
- **i18n:** English + Spanish toggle
- **Testing:** pytest (backend), Vitest/RTL (frontend), TDD with Given/When/Then naming

## Structure

```
backend/    FastAPI app
frontend/   React + Vite SPA
design/     Stitch-generated mockups and design system reference
```

## Running the tests

First-time setup of the backend virtualenv:

```bash
cd backend && python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
```

Run the backend suite (the 85% coverage floor is enforced automatically —
`--cov-fail-under=85` lives in `pyproject.toml`, so a plain run is the gate):

```bash
cd backend && .venv/bin/python -m pytest
```

While iterating, run a single test file — or one test by name — with
`--no-cov`. Without it the run measures only the code that subset touches and
fails the 85% gate even when every test passes:

```bash
cd backend && .venv/bin/python -m pytest tests/test_health.py --no-cov
```

```bash
cd backend && .venv/bin/python -m pytest -k health --no-cov
```

Coverage is reported to the terminal by default. For a browsable HTML report:

```bash
cd backend && .venv/bin/python -m pytest --cov-report=html && open htmlcov/index.html
```

The frontend suite (`npm run test:coverage`, Vitest thresholds at 85%) arrives
with the frontend scaffold — see [`frontend/README.md`](frontend/README.md).

### Commit gate

Tests also run automatically before every commit. The hook is tracked in the
repo, but each clone has to opt in once:

```bash
git config core.hooksPath .githooks
```

After that, [`.githooks/pre-commit`](.githooks/pre-commit) blocks any commit
whose tests fail or whose coverage drops below 85%. It runs the backend suite
always and the frontend suite once `frontend/package.json` exists. To commit
despite the gate — for a work-in-progress branch, not for `main` — use
`git commit --no-verify`.

## Design system

See [`design/mockups/stitch_duplicate_of_la_bodita_dashboard_planner/organic_celebration/DESIGN.md`](design/mockups/stitch_duplicate_of_la_bodita_dashboard_planner/organic_celebration/DESIGN.md)
for the canonical color/typography/spacing/component tokens, and the sibling
folders for a `code.html` + `screen.png` reference per screen.
