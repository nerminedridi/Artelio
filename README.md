# Artelio

A human-curated art marketplace built for the 2025–2026 web programming exam project. Artists upload and price artwork, curators build themed showrooms and approve submissions into them, visitors browse/comment/rate/buy through a cart with simulated payment, and an admin oversees the platform.

## Tech stack

- **Backend**: Node.js, Express 5
- **Database**: PostgreSQL (raw parameterized SQL via `pg`, no ORM)
- **Auth**: Passport (local strategy), bcrypt password hashing, `express-session`
- **Views**: EJS
- **Image upload**: Cloudinary (`multer` + `multer-storage-cloudinary`) — extra-credit integration; no local file storage
- **Frontend**: vanilla JS, ES6 classes (`public/js/main.js`), `page.js` for dashboard section routing

## Requirements

- Node.js 18+
- A running PostgreSQL server (tested against PostgreSQL 18)
- A free [Cloudinary](https://cloudinary.com) account (for image upload)

## Setup

1. **Install dependencies**
   ```
   npm install
   ```

2. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in your own values:
   ```
   cp .env.example .env
   ```

   | Variable | Description |
   |---|---|
   | `PORT` | Port the server listens on (default `3000`) |
   | `DATABASE_URL` | PostgreSQL connection string, e.g. `postgres://user:password@localhost:5432/artelio` |
   | `SESSION_SECRET` | Any long random string, used to sign session cookies |
   | `CLOUDINARY_CLOUD_NAME` | From your Cloudinary dashboard |
   | `CLOUDINARY_API_KEY` | From your Cloudinary dashboard |
   | `CLOUDINARY_API_SECRET` | From your Cloudinary dashboard |

   Make sure the database named in `DATABASE_URL` already exists (`CREATE DATABASE artelio;`) — the migration script creates the tables inside it, not the database itself.

3. **Create the schema**
   ```
   npm run db:migrate
   ```
   This runs [`db/schema.sql`](db/schema.sql). It drops and recreates every table, so only run it on a fresh/expendable database.

4. **Seed sample data**
   ```
   npm run db:seed
   ```
   This runs [`db/seed.sql`](db/seed.sql) and populates: 1 admin, 3 curators, 4 artists (incl. 1 pending approval), 3 visitors, 10 artworks, 3 showrooms, 10 submissions, 5 orders with real commission math, plus comments, ratings, saved items, and guestbook entries.

5. **Run the server**
   ```
   npm start
   ```
   Visit `http://localhost:3000`.

### Restoring from the provided database dump instead of re-seeding

A full dump (schema + data, as captured for submission) is included at [`db/dump/artelio_dump.sql`](db/dump/artelio_dump.sql). To restore it into an empty database instead of running migrate/seed:
```
psql -U <user> -d artelio -f db/dump/artelio_dump.sql
```

## Project structure

```
artelio/
├── db/              schema.sql, seed.sql, migrate.js, seed.js, dump/
├── server/
│   ├── config/      passport.js, cloudinary.js
│   ├── middleware/  auth.js (AuthGuard: requireAuth, requireRole, isOwner)
│   ├── models/      one ES6 class per entity (User, Artwork, Showroom, Order, Report, ...)
│   ├── routes/      auth, dashboard, artist, cart, orders, search, account, notifications, feedback, reports
│   └── utils/       pgErrors.js, tags.js, cache.js
├── views/
│   └── pages/       one .ejs/.html per page
├── public/
│   ├── css/, js/, images/
├── server.js        app entry point, route mounting, global error handler
└── .env.example
```

## Key design decisions

- **No real payment data stored.** Card number/expiry/CVV are format-validated only (16 digits, MM/YY not expired, 3-digit CVV); `orders.payment_data` stores only a masked summary (card brand + last 4 + cardholder name). No real transaction ever occurs.
- **Commission snapshot per order.** `orders` stores `commission_rate`, `commission_amount`, and `artist_net` at the moment of purchase, computed from the showroom's rate at that time — later changes to a showroom's commission rate don't retroactively change past orders.
- **Submissions decouple artworks from showrooms.** An artwork isn't "in" a showroom until a curator approves a `submissions` row for it — this models the curated approval workflow that's the core idea of the app.
- **Cloudinary, URL-only.** Uploaded images go straight to Cloudinary via API; only the returned secure URL is stored in Postgres. No files are written to local disk.
- **Global unique showroom theme**, enforced with a database `UNIQUE` constraint (`showrooms.theme`) plus a friendly `409` error on conflict; an admin can also manually override any showroom's theme from the admin dashboard if a conflict needs resolving by hand.

## Test accounts

All seeded accounts (from [`db/seed.sql`](db/seed.sql)) use the same password:

```
Password123!
```

| Name | Email | Role | Status | Notes |
|---|---|---|---|---|
| Admin | admin@artelio.com | admin | approved | Full platform oversight |
| Anna Moreau | anna.moreau@artelio.com | curator | approved | Owns "Chromatic Depths" & "Dreams in Motion" |
| Julien Faure | julien.faure@artelio.com | curator | approved | Owns "Still Waters" |
| Marco Bellini | marco.bellini@artelio.com | curator | **pending** | Seeded specifically to demo the curator-approval gate — will not appear publicly and cannot log into a curator dashboard until an admin approves the account from `/dashboard-admin` |
| Aria Solenne | aria.solenne@artelio.com | artist | approved | |
| Elara Vescovi | elara.vescovi@artelio.com | artist | approved | |
| Sarah Mitchell | sarah.mitchell@artelio.com | artist | approved | |
| Elio Marquez | elio.marquez@artelio.com | visitor | approved | |
| Nora Whitfield | nora.whitfield@artelio.com | visitor | approved | |
| Test Artist | artist@artelio.com | artist | approved | Generic role account for quick testing |
| Test Curator | curator@artelio.com | curator | approved | Generic role account for quick testing |
| Test Visitor | visitor@artelio.com | visitor | approved | Generic role account for quick testing |

### Suggested walkthrough

1. Log in as **admin@artelio.com** → approve Marco Bellini from the Users section, note the platform-wide stats and Commission Flow table under Analytics.
2. Log in as **anna.moreau@artelio.com** (curator) → review a pending submission, check the Earnings tab (per-showroom breakdown).
3. Log in as **aria.solenne@artelio.com** (artist) → upload a new artwork, submit it to a showroom, check the dashboard stats.
4. Log in as **elio.marquez@artelio.com** (visitor) → add an artwork to cart, check out with a test card (any 16-digit number, a future MM/YY, any 3-digit CVV), leave a comment/rating.
5. Log out and browse `/explore`, `/showrooms`, `/artists` as a guest to see the anonymous-user experience.

### Cloudinary

Image upload requires your own Cloudinary credentials in `.env` (see `.env.example`). Without them, artwork upload will fail — everything else works normally since existing seeded artworks already have real Cloudinary URLs.

## Known limitations

- Full responsive support (mobile/tablet) is implemented for all public pages; dashboards are desktop-first by design, per the project spec.
- Cross-browser tested on Chrome and Firefox, per the spec's required versions (Chrome 133+, Firefox 135+).

## Deployment

The repo includes a [`render.yaml`](render.yaml) Blueprint that provisions a free Node web service plus a free PostgreSQL database on [Render](https://render.com).

1. Push this repo to GitHub (already done if you're reading this from there).
2. On Render: **New +** → **Blueprint** → connect this repo. Render reads `render.yaml` and creates the `artelio` web service and `artelio-db` database together, wiring `DATABASE_URL` and a random `SESSION_SECRET` automatically.
3. Before the first deploy finishes setting up, add the Cloudinary env vars on the web service (**Environment** tab) — `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — copied from your local `.env`. They're marked `sync: false` in the blueprint so Render won't overwrite them on redeploys.
4. Once the service is live, apply the schema **once** via Render's Shell tab on the web service (or `psql` against the external database URL from Render's dashboard):
   ```bash
   npm run db:migrate
   npm run db:seed   # optional — loads the same demo data as local dev
   ```
   Do **not** re-run `db:migrate` after that: `schema.sql` drops and recreates every table, so running it again wipes production data. It's meant for first-time setup only.
5. Live URL: `[fill in after deploying]`

### Live demo

[Fill in deployed URL here, if applicable]
