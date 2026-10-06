FROM node:22-alpine AS build

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
