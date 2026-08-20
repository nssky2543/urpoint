# urpoint

Nuxt 4 + TypeScript full-stack app (frontend + Nitro API in one project) with local PostgreSQL via Docker. Package manager: Bun.

## Prerequisites

- [Bun](https://bun.sh)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)
- Git
- Public HTTPS URL when testing real LINE webhooks / LIFF (ngrok or similar in local)

You do **not** need a native Windows PostgreSQL install.

## Setup

```bash
bun install
Copy-Item .env.example .env
```

Edit `.env`:

```env
POSTGRES_PASSWORD=urpoint_local_dev
NUXT_DATABASE_URL=postgresql://urpoint:urpoint_local_dev@127.0.0.1:5432/urpoint
NUXT_PUBLIC_APP_URL=http://localhost:3000
NUXT_LINE_CREDENTIAL_KEY=<64-hex-chars>
NUXT_GOOGLE_CLIENT_ID=<google-oauth-client-id>
NUXT_GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
NUXT_S3_ENDPOINT=http://127.0.0.1:9000
NUXT_S3_REGION=us-east-1
NUXT_S3_ACCESS_KEY_ID=urpoint
NUXT_S3_SECRET_ACCESS_KEY=urpoint_minio_dev
NUXT_S3_BUCKET=urpoint
NUXT_S3_FORCE_PATH_STYLE=true
```

Generate the credential key:

```bash
bun -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set `NUXT_PUBLIC_APP_URL` to your public HTTPS origin when testing LINE callbacks/webhooks.

## Google Login

Store owners sign in with Google only. First-time login goes to `/settings/store` to complete shop details. Later logins go to `/dashboard`.

Create an OAuth client in Google Cloud Console (Web application) and add this authorized redirect URI:

```
{NUXT_PUBLIC_APP_URL}/api/auth/google/callback
```

Local example: `http://localhost:3000/api/auth/google/callback`

Then put `NUXT_GOOGLE_CLIENT_ID` and `NUXT_GOOGLE_CLIENT_SECRET` in `.env`.

Existing username/password accounts cannot sign in anymore. Sign up again with Google.

## Database

```bash
# start Postgres + MinIO (local S3)
docker compose up -d

# ready check
docker compose exec db pg_isready -U urpoint -d urpoint

# apply migrations
bun run db:migrate

# stop (keeps data)
docker compose down
```

MinIO API: http://127.0.0.1:9000  
MinIO Console: http://127.0.0.1:9001 (login with `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`)

Object storage is used for custom Rich Menu images. Point `NUXT_S3_*` at MinIO locally, or at a real S3-compatible endpoint in production.
## Development

```bash
bun run db:migrate
bun run dev
```

App: http://localhost:3000  
DB health: http://localhost:3000/api/health/database → `{ "status": "ok" }`

Public routes:

- `/` — UrPoint landing page
- `/login` — Google login for store owners
- `/register` — same Google sign-in; first-time users complete store settings next
- `/m/:storeSlug` — LIFF member page (registers customer in CRM)
- `/api/line/:webhookKey/webhook` — LINE Messaging webhook
- `/api/line/callback` — LINE Login OAuth callback
- `/api/auth/google/start` — start Google OAuth for store owners
- `/api/auth/google/callback` — Google OAuth callback

Authenticated routes:

- `/dashboard` — store overview with customer count and LINE status
- `/customers` — customer list from LINE LIFF registrations
- `/settings/store` — store name, business type, staff booking toggle
- `/settings/line-oa` — 4-step LINE OA connection wizard

## Connect LINE OA

1. Create a LINE Login channel and Messaging API channel under the **same Provider**.
2. Open `/settings/line-oa` and complete:
   1. Submit LINE Login Channel ID / Secret; UrPoint verifies them by requesting a token from LINE.
   2. UrPoint creates a LIFF app through LINE, or updates the supplied LIFF ID. Add the Callback URL in LINE Developers Console.
   3. Submit Messaging Channel ID / Secret / Long-lived Access Token; UrPoint verifies the token, sets the Webhook URL, and asks LINE to test it.
   4. Enable **Use webhook** in LINE Developers Console, then let UrPoint recheck LINE and activate the connection.
3. Steps 2–4 require `NUXT_PUBLIC_APP_URL` to be a public HTTPS URL with a trusted certificate.

Secrets and access tokens are encrypted at rest with `NUXT_LINE_CREDENTIAL_KEY` and returned only as masked values.

## Scripts

| Script | Purpose |
| --- | --- |
| `bun run dev` | Dev server |
| `bun run build` | Production build |
| `bun run preview` | Preview production build |
| `bun test` | Run Bun tests |
| `bun run typecheck` | TypeScript check |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:migrate` | Apply Drizzle migrations |
| `bun run db:studio` | Open Drizzle Studio at `https://local.drizzle.studio` |

## GitHub

Remote: `https://github.com/nssky2543/urpoint.git` (`origin`, branch `main`)
