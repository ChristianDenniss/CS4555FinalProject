# UNB Parking Digital Twin — Frontend (MVP)

React + TypeScript frontend for the parking digital twin API.

## Run

```bash
cd FE
npm install
npm run dev
```

Runs at **http://localhost:5173**. API requests are proxied to **http://localhost:3000** (start the BE first).

## Build

```bash
npm run build
npm run preview   # serve dist/
```

## What’s in the MVP

- **Lots** — List parking lots, click one to open its spots grid.
- **Lot detail** — Spots as a grid (green = empty, red = occupied). Click a spot to toggle status (calls `PATCH /api/parking-spots/:id/status`). Optional section filter.
- **Auth** — Register, login, view profile (`/api/users/me`). Token stored in `localStorage`.
- **Logs** — List parking spot status logs, optional filter by spot.

## Env

- `VITE_API_URL` — Base URL for API (default: empty = same origin; with proxy you don’t need it).
