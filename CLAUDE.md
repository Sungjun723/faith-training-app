# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"신앙훈련 노트" (Faith Training Notes) — a web app for a church small-group to check off daily
spiritual disciplines, review weekly progress, and take cumulative Bible-memorization tests.
UI text, commit messages, and docs are in Korean.

## Stack

- Frontend: Vue 3 (`<script setup>`) + Vite + TypeScript + Pinia + Vue Router — `client/`
- Backend: Node.js 20 + Express + TypeScript — `server/`
- Database: MySQL 8 + Drizzle ORM — `server/src/db/`
- npm workspaces monorepo (root `package.json` has no deps of its own, just workspace scripts)
- No Tailwind — a custom design-token CSS system (`client/src/styles/design-tokens.css`) is used
  instead, deliberately, for finer control over spring-based motion (see `.designrules`)
- No test runner or linter is configured in this repo. Verification = `npm run build`
  (`vue-tsc --noEmit` + `tsc`), which is the closest thing to CI here.

## Commands

```bash
npm install                 # installs client + server workspaces from the root

npm run dev:server          # http://localhost:3000 (tsx watch, API)
npm run dev:client          # http://localhost:5173 (Vite dev server, /api proxied to :3000)

npm run build                # vite build (client) && tsc build (server) && db:migrate && db:seed
npm run start                # runs server/dist/index.js — serves the API and client/dist as one process

npm run db:generate          # drizzle-kit generate — create a migration from schema.ts changes
npm run db:migrate           # apply pending migrations
npm run db:seed              # create the seed admin account + a sample group + sample passages
```

There's no dedicated typecheck/lint script — `npm run build --workspace client` runs `vue-tsc --noEmit`
before `vite build`, and `npm run build --workspace server` is a plain `tsc` build; run either from
inside `client/` or `server/` to typecheck just one side without touching the DB.

Local setup needs `server/.env` (copy from `server/.env.example`): DB connection vars, `JWT_SECRET`,
and `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` used only by `db:seed`.

## Architecture

### Deployment model: one process, two builds

Hostinger's Node.js hosting runs a single process, so client and server are built separately but
deployed together. `server/src/index.ts` serves `/api/*` via Express routes and falls back to
`client/dist/index.html` for every other path (SPA routing — no rewrite rules needed, no
refresh-404 issue).

### Group-based week numbering (recent breaking change, replaced a global `weeks` table)

There is no shared/global week table. Each `groups` row has a `startDate`, and week numbers are
computed per-user from their group's start date — see `server/src/services/groupWeeks.ts`:

- The group's `startDate` is used directly as the anchor (no day-of-week restriction — a group can
  start on any weekday).
- `weekNumber = floor((date - anchor) / 7 days) + 1`, clamped to a minimum of 1.
- `weekly_training_records` and `memorization_test_sessions` key off `weekNumber` (per-user), not
  off a shared week id. `memorization_passages` are keyed by `weekNumber` alone and are shared
  across all groups (the passage assigned to "week 3" is the same text for every group, even though
  different groups reach "week 3" on different calendar dates).
- A user with no `groupId` (only possible for `role = admin`) cannot resolve a current week —
  `getUserGroup` throws in that case. Every `member` must have a group.
- `docs/database-schema.md` has the full reasoning for this calculation, including how the "일요일
  묵상 제외 + 6일 집계" (Sunday-excluded, 6-day) weekly rollup interacts with an arbitrary anchor
  weekday.

### Auth/authorization boundary

- JWT in an httpOnly/Secure cookie (`auth_token`, see `server/src/middleware/auth.ts`), single
  access token, no refresh-token flow (deliberately, for this app's scale).
- The role is trusted from the signed JWT payload — no per-request DB re-check.
- `requireAuth` / `requireAdmin` middleware in `server/src/middleware/auth.ts` are the *real*
  security boundary. The Vue Router `beforeEach` guard (`client/src/router/index.ts`, checking
  `meta.requiresAdmin`) is UX-only and must never be treated as enforcing access control.
- All member-data routes must scope queries by `req.user.id` from the verified token — never trust
  a `user_id` field from the request body.
- Password reset for members is admin-driven (admin sets a new password directly in the member
  detail screen) — there is no email-based reset flow implemented.

### Server layout (`server/src/`)

- `routes/` — Express route handlers, one file per resource (`auth`, `training`, `memorization`,
  `admin`, `profile`)
- `services/` — pure calculation logic kept out of route handlers, e.g. `groupWeeks.ts` (week
  numbering above) and `memorizationDiff.ts` (scoring diff logic for memorization tests)
- `db/schema.ts` — single source of truth for the Drizzle schema; run `db:generate` after editing it
- `middleware/` — `auth.ts` (JWT/role checks), `errorHandler.ts` (central error → HTTP response,
  including the `AppError` class services throw)

### Client layout (`client/src/`)

- `stores/` (Pinia) — one store per domain (`auth`, `training`, `weekly`, `memorization`); calendar
  data is fetched a month at a time (`GET /api/training/month?year&month`), not per-day
- `views/admin/*` — admin-only screens, gated by `meta.requiresAdmin` in the router (UX gate only,
  see Auth section above)
- `utils/api.ts` — shared fetch wrapper for the `/api` backend

### Motion/animation conventions

`.designrules` at the repo root documents the Apple "fluid interfaces" motion philosophy (spring
physics over CSS keyframes/transitions, interruptibility, direct 1:1 gesture tracking, damping/
response defaults) that this app's interactive UI is meant to follow — read it before writing or
reviewing anything gesture- or transition-heavy.

## Docs

Design/decision background lives in `docs/`: `architecture.md` (stack rationale, repo layout, perf
decisions), `database-schema.md` (full schema + week-calculation reasoning), `user-flow.md`,
`feature-spec.md`. `README.md` also has the Hostinger deployment steps and a running checklist of
what's been verified vs. still needs a live DB to confirm.
