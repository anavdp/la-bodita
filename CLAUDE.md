# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

La Bodita is a bilingual (English/Spanish) wedding-planning web app for two
users (bride/groom) — a personal productivity tool for a complex project
(registro civil paperwork, Italian documentation, a venue/church in
Venezuela, guest list, budget, calendar), not a wedding-invitation site.

The backend is scaffolded (FastAPI app skeleton, session management, Alembic)
but has no schema or endpoints yet. The frontend is still an empty directory —
it gets scaffolded with issue #1, and this file's Commands section needs a
frontend entry once it is.

## Commands

All backend commands run from `backend/` against its own virtualenv:

```bash
.venv/bin/pip install -e ".[dev]"   # install (first time)
.venv/bin/python -m pytest          # tests + 85% coverage gate
.venv/bin/uvicorn app.main:app --reload
.venv/bin/alembic upgrade head
.venv/bin/alembic revision --autogenerate -m "describe the change"
```

The commit gate lives in `.githooks/pre-commit` and is tracked in the repo.
Each clone must opt in once with `git config core.hooksPath .githooks`.

## Stack

- Backend: FastAPI + SQLAlchemy + SQLite, Alembic migrations
- Frontend: React (Vite) + TypeScript
- Hosting: self-hosted on a Raspberry Pi, fully Dockerized, reached only via
  Tailscale (no public internet exposure — driven by the sensitivity of
  stored documents: passports, IDs, certificates)
- Document storage: hybrid — compute/DB stay on the Pi, uploaded files go to
  a private Google Cloud Storage bucket (durable, decouples from the Pi's SD
  card)
- Reminders: APScheduler in FastAPI, email via a Gmail account (app password
  via env var, never in code)
- Testing: TDD, pytest (backend) + Vitest/RTL (frontend), Given/When/Then
  test naming (no formal Gherkin)

## Development guidelines

**TDD is mandatory, not aspirational.** Write the failing test first (per
the existing Given/When/Then naming convention), then the minimum code to
pass it, then refactor. Don't write implementation code that isn't driven by
a preceding failing test.

**Commit gate:** commits must be blocked if any test is failing or if
coverage falls below **85%**, enforced by a pre-commit hook — backend via
`pytest --cov --cov-fail-under=85`, frontend via Vitest coverage thresholds
set to 85 in `vitest.config`. The hook exists at `.githooks/pre-commit` and
runs the backend suite always, the frontend suite once
`frontend/package.json` exists. 85% is a floor, not a target — don't pad it
with low-value tests just to clear the number.

**Naming conventions:**
- Backend (Python): `snake_case` for variables/functions/modules, `PascalCase`
  for classes, per PEP 8. Names should be descriptive, not abbreviated.
- Frontend (React/TypeScript): `camelCase` for variables/functions,
  `PascalCase` for components, types, and interfaces.

## Task tracking

Work is tracked as GitHub issues on the `MVP` milestone, labeled by area
(`area:backend`, `area:frontend`, `area:design`, `area:infra`), with a
Projects board at github.com/users/anavdp/projects/1. Workflow: one branch +
one PR per issue, PR body includes `Closes #N` to auto-close on merge.
Issue #25 defines the full initial schema in one migration — it must land
before the per-entity endpoint issues (#14–#19), which only add endpoints on
top of it.

## Architecture: data model

`WEDDING` is the tenant root — every other table carries a `wedding_id` FK.
Exactly one `WEDDING` row exists today; onboarding another couple later
(this app may eventually be sold to other couples) means adding new
`WEDDING` + `USERACCOUNT` rows, not a schema change. This constraint shaped
several of the decisions below.

- `CATEGORY` / `SUBCATEGORY` are wedding-scoped, user-managed lookup tables
  (`name`, `emoji`, `color`) — no seed data, the user builds their own.
  Subcategories inherit the parent category's color; only the emoji differs.
- `ITEM` is the central planning hub (a venue candidate, a flight, the
  church, a dress...) — it alone carries `category_id`/`subcategory_id`.
  This was a deliberate refactor to avoid duplicating category across
  multiple tables and risking drift when they're cross-linked.
- `REQUIREMENT`, `CALENDAR_EVENT`, `BUDGET_LINE`, and `DOCUMENT` are optional
  detail records, each with its own nullable `item_id` FK pointing up at
  `ITEM` (children point to parent, never the reverse). None of them carry
  their own category. Each also has its own `title` field.
- `CALENDAR_EVENT` uses `start_date`/`end_date` (not a single date) to
  support ranges like a honeymoon trip.
- `DOCUMENT` can link to `item_id` and/or `requirement_id` — general
  item files/photos vs. files tied to a specific checklist step.
- `BUDGET_LINE` has `status` (idea/considering/confirmed/paid), `currency`,
  `estimated_amount`, `actual_amount`. Scenario comparison (e.g. "if I pick
  this venue and this honeymoon, what's the total") works by tagging
  alternatives as `considering` and summing a user-selected subset in the
  UI — there is no separate "options" schema.
- `GUEST` has `first_name`, `last_name`, `is_child` (for budgeting),
  `gender`, `relationship_type` (family/friends/other), `side`
  (Venezuela/Italy/Spain/other), `rsvp_status`, optional `phone`/`email`
  (captured now, features using them are explicitly post-MVP).

## Architecture: frontend design system

`design/mockups/stitch_duplicate_of_la_bodita_dashboard_planner/` holds the
approved reference for every screen: one folder per screen with a
`screen.png` and a `code.html` (Stitch-exported reference markup — useful
for exact spacing/color/radius values, but not meant to be pasted in as-is;
componentize idiomatically instead).

`organic_celebration/DESIGN.md` in that same directory is the canonical
design system spec (exact color tokens, Quicksand/Be Vietnam Pro type scale,
8px spacing base, the asymmetric corner-radius formula for cards, component
specs for stat cards / list rows / nav / inputs). Read it before building
any screen.

The sidebar and top bar are shared across every screen and must match
pixel-for-pixel (see issue #1, which every other frontend screen issue
depends on). Category color/emoji tags (defined in the Category Manager
screen) are the tagging system used throughout Items, Checklist, Calendar,
Budget, and Documents — don't invent a separate color system per screen.
