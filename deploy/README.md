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
- The Docker Hub account `vitaledepalma`

The Pi never builds anything and never needs the code. On every push to `main`,
GitHub Actions runs the tests and, if they pass, builds the images for the Pi
(arm64, plus amd64 for laptops) and publishes them to Docker Hub as
`vitaledepalma/la-bodita-backend` and `vitaledepalma/la-bodita-web`. The Pi only
pulls them.

## 0. Let GitHub publish to Docker Hub

Do this once, from your laptop's browser.

1. On Docker Hub, open **Account settings → Personal access tokens → Generate new token**.
   Name it `la-bodita GitHub Actions`, set access to **Read & Write**, and generate it.
   Copy the token; Docker Hub only shows it once.
2. On GitHub, open the repository's **Settings → Secrets and variables → Actions →
   New repository secret**. Name it `DOCKERHUB_TOKEN` and paste the token.
3. Push to `main` (or re-run the latest **CI** run from the **Actions** tab). When
   the **Publish images to Docker Hub** job is green, both images show up under
   your repositories on Docker Hub.

The web image has the guests' address built in, `https://labodita.gerardoyvicky.com`.
If that ever changes, add a repository **variable** (same page, **Variables** tab)
named `PUBLIC_URL` with the new address and push again.

Docker Hub makes new repositories public. The images hold the app's code but no
passwords or guest data, which live only in `.env` and the database on the Pi. If
you make them private, run `docker login -u vitaledepalma` once on the Pi with a
**Read-only** token so it can still pull, and give Watchtower that login too by
adding `- ~/.docker/config.json:/config.json:ro` under its `volumes`.

Run every command from here on in a terminal on the Pi, either directly or over `ssh`.

## 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Log out and back in so the second line takes effect.

## 2. Get the compose file

The Pi needs one file from the repository, `docker-compose.yml`, which lists what
to run. The repository is private, so fetch it with the GitHub command line:

```bash
sudo apt install -y gh
gh auth login
mkdir -p ~/la-bodita && cd ~/la-bodita
gh api repos/anavdp/la-bodita/contents/docker-compose.yml -H "Accept: application/vnd.github.raw" > docker-compose.yml
```

Copying it over from your laptop with `scp` works just as well.

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
must ask for your email before anything else. After you enter the code, a
Cloudflare "Error 1033" page is expected for now: the tunnel only connects once
the app is running in step 6. If it shows the error *without* asking for your
email first, the login isn't covering that address. Fix it before going on.

## 5. Fill in the settings

```bash
nano .env
```

Write this one line, with the token from step 3 after the `=`:

```
CLOUDFLARE_TUNNEL_TOKEN=
```

Save with Ctrl+O, Enter, then exit with Ctrl+X.

## 6. Start it

```bash
docker compose pull
docker compose up -d
```

`docker compose ps` should show five services running.

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

Nothing to do on the Pi. Push to `main`, and once the **Publish images to Docker
Hub** job is green on GitHub, Watchtower notices the new images within the hour
and restarts the services that changed. The database stays as it is. It keeps
`cloudflared` up to date the same way.

To update right away instead of waiting:

```bash
cd ~/la-bodita
docker compose pull
docker compose up -d
```

`docker compose logs watchtower` shows what it updated and when.

To go back to an earlier version, pick its tag on Docker Hub (`sha-` plus the
commit's first seven characters), add `LA_BODITA_TAG=sha-1a2b3c4` to `.env`, and
run the two commands above. Watchtower leaves a pinned tag alone. Remove the line
to follow `latest` again.

If `docker-compose.yml` itself changed in that push, Watchtower can't pick that
up: fetch it again as in step 2, then run the two commands above.

## Backups

The database lives in a Docker volume on the Pi's SD card, and SD cards do fail.
Until the Cloud Storage backup is set up, take a copy now and then:

```bash
docker compose exec backend python -c "import sqlite3; sqlite3.connect('/data/la_bodita.db').backup(sqlite3.connect('/data/backup.db'))"
docker compose cp backend:/data/backup.db ~/la_bodita-$(date +%F).db
```

Then copy that file somewhere off the Pi.
