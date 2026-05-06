# Collaborative Team Hub

A real-time collaborative workspace platform. Teams can manage goals, action items, announcements, and analytics — all synced live via WebSockets.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Zustand |
| Backend | Node.js, Express, Socket.IO, Prisma |
| Database | PostgreSQL (primary) or MongoDB |
| Storage | Cloudinary (avatars / media) |
| Email | Nodemailer / SMTP |
| Deploy | Vercel (frontend) · Railway (backend) |

---

## Project Structure

```
/
├── frontend/          # Next.js app (deploy to Vercel)
│   ├── src/
│   │   ├── app/       # App Router pages
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/       # API client, permissions, socket
│   │   └── store/     # Zustand stores
│   ├── next.config.mjs
│   └── package.json
│
└── backend/           # Express REST API + Socket.IO (deploy to Railway)
    ├── prisma/        # Schema (PostgreSQL & MongoDB variants)
    ├── src/
    │   ├── controllers/
    │   ├── routes/
    │   ├── middleware/
    │   ├── socket/
    │   └── utils/
    └── package.json
```

---

## Features

- **Workspaces** — create/join teams, role-based permissions (Owner · Admin · Member)
- **Goals & Milestones** — track progress with nested milestones
- **Action Items** — Kanban board + list view with drag-and-drop
- **Announcements** — rich posts with reactions and comments
- **Analytics** — workspace activity charts (Recharts)
- **Real-time** — live notifications and updates via Socket.IO
- **Invitations** — token-based email invites
- **Theming** — light/dark mode, persisted per user

---

## Local Development

### Prerequisites

- Node.js ≥ 18
- pnpm ≥ 9 (`npm i -g pnpm`)
- PostgreSQL instance (or set `DATABASE_URL` to a remote DB)

### Backend

```bash
cd backend
cp .env.example .env          # fill in your values
npm install
npm run db:generate            # setup-db + prisma generate
npm run db:migrate             # run migrations
npm run db:seed                # optional seed data
npm run dev                    # starts on :5000
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local   # see env vars below
pnpm install                        # uses pnpm-lock.yaml
pnpm dev                            # starts on :3000
```

---

## Environment Variables

### Backend `.env`

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

DATABASE_URL=postgresql://user:pass@host:5432/dbname

JWT_ACCESS_SECRET=<random-hex>
JWT_REFRESH_SECRET=<random-hex>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="Team Hub <you@example.com>"
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## Deploying to Vercel (Frontend)

1. Push `frontend/` to a GitHub repo (or a sub-directory with the Vercel root set).
2. In Vercel → **Settings → General** set **Root Directory** to `frontend`.
3. Vercel auto-detects Next.js; the `pnpm-lock.yaml` in `frontend/` ensures pnpm is used.
4. Add env var: `NEXT_PUBLIC_API_URL=https://your-backend.railway.app`
5. Deploy.

> The `next.config.mjs` rewrites `/api/*` to the backend URL at build time, so no manual proxy setup is needed in production.

### Vercel `vercel.json` (optional, place in `frontend/`)

```json
{
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install --frozen-lockfile"
}
```

---

## Deploying to Railway (Backend)

The repo includes `railway.toml`. Connect the `backend/` directory to a Railway service.

Required Railway env vars: everything in `.env.example` with production values.

Run on deploy:
```
npm run build    # runs setup-db.js + prisma generate
npm run start
```

---

## API Overview

All routes are prefixed `/api`.

| Resource | Base Path |
|---|---|
| Auth | `/api/auth` |
| Users | `/api/users` |
| Workspaces | `/api/workspaces` |
| Goals | `/api/workspaces/:id/goals` |
| Milestones | `/api/milestones` |
| Action Items | `/api/workspaces/:id/action-items` |
| Announcements | `/api/workspaces/:id/announcements` |
| Notifications | `/api/notifications` |
| Analytics | `/api/workspaces/:id/analytics` |

Auth uses **JWT** (access token in `Authorization: Bearer` + refresh token in `HttpOnly` cookie). Rate limit: 300 req / 15 min.

---

## Database

Prisma schemas for both databases are in `prisma/`:

| File | Use |
|---|---|
| `schema.prisma` | Default (PostgreSQL) |
| `schema.postgresql.prisma` | Explicit PostgreSQL variant |
| `schema.mongodb.prisma` | MongoDB variant |

Switch databases by pointing `DATABASE_URL` to the correct connection string and running `npm run db:deploy`.

