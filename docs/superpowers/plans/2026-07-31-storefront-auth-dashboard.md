# Storefront Auth Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a dark orange LINE CRM landing page, real username/password authentication, and a protected themeable store dashboard.

**Architecture:** Nuxt owns frontend pages, route middleware, and Nitro APIs in one project. PostgreSQL/Drizzle persists users and hashed sessions; Node crypto provides password and token primitives without another dependency.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, Bun, PostgreSQL 17, Drizzle ORM, postgres.js

## Global Constraints

- Do not implement live LINE OA, Broadcast, Rich Menu, or OTP integration in this phase.
- Keep sidebar navigation to the three requested destinations.
- Use orange and black as the primary brand colors.
- Do not commit or push without an explicit request.

---

### Task 1: Authentication persistence

**Files:**
- Modify: `server/database/schema.ts`
- Create: `server/utils/auth.ts`
- Create: `server/utils/auth.test.ts`
- Create: `server/utils/session.ts`
- Create: `server/api/auth/register.post.ts`
- Create: `server/api/auth/login.post.ts`
- Create: `server/api/auth/me.get.ts`
- Create: `server/api/auth/logout.post.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `hashPassword`, `verifyPassword`, `hashSessionToken`, `createSession`, `getSessionUser`, `deleteSession`
- Produces: auth API responses `{ user: { id, username } }`

- [ ] Add `users` and `sessions` tables with unique usernames, foreign keys, and expiry index.
- [ ] Write Bun tests that reject a wrong password and verify a correct password/token hash.
- [ ] Implement crypto helpers with `node:crypto` scrypt, random bytes, timing-safe comparison, and SHA-256.
- [ ] Implement session cookie creation, lookup, expiry cleanup, and logout.
- [ ] Implement validated register/login/me/logout handlers with generic credential errors.
- [ ] Add `test` script, generate a Drizzle migration, run tests, and apply the migration.

### Task 2: Landing and auth UI

**Files:**
- Modify: `app/app.vue`
- Create: `app/assets/css/main.css`
- Create: `app/pages/index.vue`
- Create: `app/pages/login.vue`
- Create: `app/pages/register.vue`
- Create: `app/components/BrandMark.vue`
- Create: `app/components/AuthForm.vue`
- Modify: `nuxt.config.ts`

**Interfaces:**
- Consumes: `/api/auth/login`, `/api/auth/register`
- Produces: public landing and auth routes

- [ ] Create the shared orange/black design tokens, typography, focus, and reduced-motion rules.
- [ ] Build a dark landing hero with LINE CRM conversation visual, concise feature section, and login/register CTAs.
- [ ] Build accessible login/register forms with pending, inline validation, API error, and redirect states.
- [ ] Verify responsive layouts at desktop and mobile widths.

### Task 3: Protected dashboard shell

**Files:**
- Create: `app/middleware/auth.ts`
- Create: `app/layouts/dashboard.vue`
- Create: `app/components/AppIcon.vue`
- Create: `app/pages/dashboard.vue`
- Create: `app/pages/settings/store.vue`
- Create: `app/pages/settings/line-oa.vue`

**Interfaces:**
- Consumes: `/api/auth/me`, `/api/auth/logout`
- Produces: protected dashboard routes and persistent `urpoint-theme` cookie

- [ ] Redirect anonymous visitors to `/login` while preserving a safe return path.
- [ ] Build desktop sidebar and mobile drawer with only the requested navigation and SVG icons.
- [ ] Add top-bar light/dark icon toggle persisted through an SSR-readable cookie.
- [ ] Build dashboard summary content and focused foundations for Store Settings and LINE OA Connection.
- [ ] Add logout behavior and active-route states.

### Task 4: End-to-end verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Verifies: database, auth, routes, themes, responsive UI

- [ ] Run `bun test`, `bun run typecheck`, and `bun run build`.
- [ ] Run linter diagnostics on all edited files.
- [ ] Start PostgreSQL and Nuxt, then verify register → dashboard → logout → login.
- [ ] Inspect landing, dashboard light/dark modes, settings routes, and mobile sidebar in a browser.
- [ ] Document migration, test, and local run commands in README.
