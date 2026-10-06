# Running La Bodita on the Raspberry Pi

Guests open the RSVP pages on your public domain. The planner stays private and
is reachable only from your own devices over Tailscale.

```
Guest  → https://boda.example.com/rsvp/…  → Cloudflare → tunnel → Pi :8081 → guest-only API
Guest  → https://boda.example.com/guests  → 404
You    → https://<pi>.<tailnet>.ts.net    → Tailscale  → Pi :8080 → full planner
```

There are two locks on the public side. Caddy's `:8081` door only serves the RSVP
pages, their images and `/api/rsvp/…`, and the API behind it runs with
`GUEST_ONLY=true`, so the planner's routes don't exist there at all.

## What you need

- A Raspberry Pi 4 or 5 running **Raspberry Pi OS (64-bit)**, connected to your network
- A Tailscale account, with the Tailscale app on your laptop and phone
- A Cloudflare account with your domain on it

Run every command below in a terminal on the Pi, either directly or over `ssh`.

## 1. Put the Pi on Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Open the link it prints and sign in with the same account as your laptop. The Pi
then appears at <https://login.tailscale.com/admin/machines>.

## 2. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Log out and back in so the second line takes effect.

## 3. Get the code

```bash
sudo apt install -y git gh
gh auth login            # the repository is private
gh repo clone anavdp/la-bodita
cd la-bodita
```

## 4. Create the Cloudflare Tunnel

1. In the Cloudflare dashboard, open **Zero Trust → Networks → Tunnels → Create a tunnel**.
2. Choose **Cloudflared** and name it `la-bodita`.
3. On the install screen, pick **Docker** and copy the long token after `--token`.
   You don't need to run the command it shows.
4. Under **Public hostname**, choose your domain (and a subdomain like `boda` if you
   want one). Set **Service** to type `HTTP` and URL `web:8081`.

## 5. Fill in the settings

```bash
cp .env.example .env
nano .env
```

Set `PUBLIC_URL` to the address guests will open, for example `https://boda.example.com`
with no trailing slash. Paste the token into `CLOUDFLARE_TUNNEL_TOKEN`. Save with
Ctrl+O, Enter, then exit with Ctrl+X.

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

## 8. Open the planner privately

```bash
sudo tailscale serve --bg 8080
```

It prints an address like `https://raspberrypi.tail1234.ts.net`. That's the
planner, and it opens on any device signed in to your Tailscale.

## 9. Check both doors

- `https://<your domain>/rsvp` shows the "find your invitation" page.
- `https://<your domain>/guests` and `https://<your domain>/api/weddings` give a 404.
- The planner's "copy link" button gives links on your public domain.

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
