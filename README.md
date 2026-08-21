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

## Design system

See [`design/mockups/stitch_duplicate_of_la_bodita_dashboard_planner/organic_celebration/DESIGN.md`](design/mockups/stitch_duplicate_of_la_bodita_dashboard_planner/organic_celebration/DESIGN.md)
for the canonical color/typography/spacing/component tokens, and the sibling
folders for a `code.html` + `screen.png` reference per screen.
