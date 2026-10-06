# Running La Bodita on the Raspberry Pi

Guests open the RSVP pages on the public address. The planner has its own
address behind a Cloudflare login that only the two of you can pass.

```
Guest  → https://labodita.gerardoyvicky.com/rsvp/… → Cloudflare → tunnel → Pi :8081 → guest-only API
Guest  → https://labodita.gerardoyvicky.com/guests → 404
You    → https://planner.gerardoyvicky.com         → Cloudflare login → tunnel → Pi :8080 → full planner
```

There are two locks on the guest side. Caddy's `:8081` door only serves the RSVP
pages, their images and `/api/rsvp/…`, and the API behind it runs with
`GUEST_ONLY=true`, so the planner's routes don't exist there at all.

The planner side has one lock, the Cloudflare login (Cloudflare Access). The app
has no login of its own yet, so step 4 sets up the login **before** the planner
gets its address. Never add a hostname that points at `web:8080` without it.

## What you need

- A Raspberry Pi 4 or 5 running **Raspberry Pi OS (64-bit)**, connected to your network
- A Cloudflare account with `gerardoyvicky.com` on it

Run every command below in a terminal on the Pi, either directly or over `ssh`.

## 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Log out and back in so the second line takes effect.

## 2. Get the code

```bash
sudo apt install -y git gh
gh auth login            # the repository is private
gh repo clone anavdp/la-bodita
cd la-bodita
```

## 3. Create the Cloudflare Tunnel

1. In the Cloudflare dashboard, open **Zero Trust → Networks → Tunnels → Create a tunnel**.
2. Choose **Cloudflared** and name it `la-bodita`.
3. On the install screen, pick **Docker** and copy the long token after `--token`.
   You don't need to run the command it shows.
4. Under **Public hostname**, add the guest address: subdomain `labodita`, domain
   `gerardoyvicky.com`, **Service** type `HTTP`, URL `web:8081`.

## 4. Put the login in front of the planner

Do this before the planner gets its address.

1. Open **Zero Trust → Access controls → Applications → Create new application → Self-hosted and private**.
2. Name it `La Bodita planner`. Choose **Add public hostname** with subdomain `planner` and domain `gerardoyvicky.com`.
3. Add a policy named `Gerardo and Vicky` with action **Allow**. Under **Include → Emails**,
   enter both of your email addresses. Everyone else is refused.
4. For the login method, keep **One-time PIN**, which emails you a code each time
   you sign in. A session lasts as long as you set under **Session duration**.
5. Save. Then go back to the tunnel from step 3 and add a second **Public hostname**:
   subdomain `planner`, domain `gerardoyvicky.com`, Service type `HTTP`, URL `web:8080`.

Check it from a private browser window: `https://planner.gerardoyvicky.com`
must ask for your email before showing anything.

## 5. Fill in the settings

```bash
cp .env.example .env
nano .env
```

Set `PUBLIC_URL=https://labodita.gerardoyvicky.com` (no trailing slash) and paste
the token into `CLOUDFLARE_TUNNEL_TOKEN`. Save with Ctrl+O, Enter, then exit with Ctrl+X.

## 6. Start it

```bash
docker compose up -d --build
```

The first build takes a while on a Pi. `docker compose ps` should show four
services running.

## 7. Add your data

Either start fresh:

```bash
docker compose exec backend python -m app.seed --name "La Bodita" --date 2026-10-29
```

or copy over the database you've been using on your laptop (`backend/la_bodita.db`),
after copying that file to the Pi:

```bash
docker compose cp la_bodita.db backend:/data/la_bodita.db
docker compose restart backend backend-public
```

## 8. Check both doors

- `https://labodita.gerardoyvicky.com` shows the "find your invitation" page.
- `https://labodita.gerardoyvicky.com/guests` and `…/api/weddings` give a 404.
- `https://planner.gerardoyvicky.com` asks for your email, then opens the planner.
- The planner's "copy link" button gives links on `labodita.gerardoyvicky.com`.

## Updating

```bash
cd la-bodita
git pull
docker compose up -d --build
```

## Backups

The database lives in a Docker volume on the Pi's SD card, and SD cards do fail.
Until the Cloud Storage backup is set up, take a copy now and then:

```bash
docker compose exec backend python -c "import sqlite3; sqlite3.connect('/data/la_bodita.db').backup(sqlite3.connect('/data/backup.db'))"
docker compose cp backend:/data/backup.db ~/la_bodita-$(date +%F).db
```

Then copy that file somewhere off the Pi.
