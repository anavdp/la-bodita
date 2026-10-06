# The built files are the same on every CPU, so this stage runs natively on the
# build machine even when the image is for the Pi's arm64.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Guests' RSVP links and the WhatsApp preview image use the public address; the
# API is called on whatever address the page came from.
ARG VITE_PUBLIC_URL
RUN test -n "$VITE_PUBLIC_URL" || (echo "VITE_PUBLIC_URL is required" >&2; exit 1)
ENV VITE_PUBLIC_URL=$VITE_PUBLIC_URL VITE_API_URL=""
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
# deploy/Caddyfile, passed in as the "deploy" build context, so the Pi needs no
# copy of the repository.
COPY --from=deploy Caddyfile /etc/caddy/Caddyfile
