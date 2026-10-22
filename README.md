# Gr8r Studio

A calm, structured project management workspace: dashboards, inbox, my tasks, projects with
kanban / list / calendar / timeline views, members & invitations, tags, comments, notifications,
activity feed, favorites and full-text search.

Built with **React + TypeScript + Tailwind CSS** on the frontend (shadcn-style components) and
**Hono + Prisma + PostgreSQL** on the backend. Authentication by Better Auth (email + password).

## Stack

| Layer     | Tech                                                |
| --------- | --------------------------------------------------- |
| Frontend  | React 19, TypeScript, Tailwind CSS 4, Vite          |
| Backend   | Hono, Zod validation, Prisma ORM                    |
| Database  | PostgreSQL (Neon in production)                     |
| Auth      | Better Auth (credentials provider)                  |

## Getting started

Requires Node.js 18 or newer (`.nvmrc` pins 22).

```bash
npm install
cp .env.example .env        # configure DATABASE_URL + secrets
npx prisma generate
npm run dev:server          # API on http://localhost:3000
npm run dev                 # web app on http://localhost:5173
npm run build               # production frontend build in dist/
npm run lint                # ESLint (flat config)
```

### Environment variables

| Variable        | Used by  | Purpose                                  |
| --------------- | -------- | ---------------------------------------- |
| `DATABASE_URL`  | server   | PostgreSQL connection string             |
| `BETTER_AUTH_SECRET` | server | Session signing secret             |
| `FRONTEND_URL`  | server   | CORS origin for the web build            |
| `VITE_API_URL`  | frontend | API base URL (default `http://localhost:3000`) |

### Database

```bash
npm run db:push      # sync schema.prisma to the database (no migration files)
npm run db:generate  # regenerate the Prisma client
npm run db:studio    # browse data
```

> Prisma 7 reads its configuration from `prisma.config.ts` — plain `prisma` CLI commands work
> out of the box; `--skip-generate` style flags are no longer supported.

## Project structure

```
server/                 Hono API (auth, workspaces, projects, tasks, comments, tags, notifications, activity)
server/lib/activity.ts  fire-and-forget activity log + notification fan-out
src/
  app.tsx               router (lazy-loaded pages, guards)
  layouts/              app shell, sidebar, protected/guest routes
  pages/                home, overview, inbox, my-tasks, projects, project-detail,
                        calendar, timeline, search, favorites, notifications,
                        members, activity, settings, login, signup
  components/
    board/              kanban (dnd-kit): board, columns, cards, drag overlay
    tasks/              task drawer (assignee, due date, tags, comments), status/priority config
    ui/                 shadcn-style primitives (Button, Card, Dialog, Select, Sheet, …)
  lib/                  API client, auth client, utils
  stores/               zustand stores (workspace, theme)
prisma/schema.prisma    data model (User, Workspace, Member, Project, Task, Comment, Tag, Activity, Notification, Invitation, Favorite)
```

## Feature map

- **Workspaces** — multiple workspaces, OWNER/ADMIN/MEMBER/VIEWER roles, member removal guards.
- **Invitations** — email invites; an existing user joins instantly, a new one gets a pending
  invite consumed automatically at signup (`POST /workspaces/accept-invites`).
- **Projects** — colors, description, favorites toggle, detail endpoint
  (`GET /projects/detail/:id`) returning project + tasks in one round trip.
- **Tasks** — 6 statuses, priorities, assignee, due date, positions; drag & drop persists through
  `POST /tasks/reorder` (the moved column is rewritten atomically).
- **Collaboration** — comments (author delete, ADMIN+ moderation), visible tags per workspace,
  tags attach/detach on tasks.
- **Notifications & activity** — task watchers are notified on assignment and comment activity;
  per-workspace activity feed and stats dashboard.
- **Views** — kanban, list, calendar (month grid), timeline (relative bars), search, favorites,
  inbox (tasks assigned to me), overview dashboard.

## Deployment

- `npm run build` produces a static site (deploy `dist/` to Vercel/Netlify/Cloudflare).
- Run the API with any Node host (`npm run dev:server` for dev, `tsx server/index.ts` in prod).
- Set `FRONTEND_URL` so the API sends correct CORS headers to the deployed frontend.
