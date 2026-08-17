# Storefront Auth Dashboard Design

## Scope

Build the first store-facing slice of UrPoint:

- A polished dark landing page explaining LINE CRM, broadcast, Rich Menu, and future OTP support.
- Username/password registration and login backed by PostgreSQL.
- A protected dashboard with a light/dark theme toggle.
- Sidebar navigation limited to Dashboard, Store Settings, and LINE OA Connection.
- Store Settings and LINE OA Connection are presentational foundations only; no live LINE integration in this phase.

## Visual Direction

The landing page uses a near-black background, warm orange accents, off-white text, and a single signature visual: an orange conversation trail connecting LINE-style customer messages to a compact CRM preview. It avoids gradients-as-decoration, nested cards, and excessive badges.

The authenticated app uses a restrained product UI. Light mode is the default; dark mode is available from an icon in the top bar and persists in a cookie. Orange marks active navigation and primary actions, while black and neutral grays carry hierarchy.

## Routes

- `/` — landing page
- `/login` — username/password login
- `/register` — username/password registration
- `/dashboard` — protected overview
- `/settings/store` — protected store settings foundation
- `/settings/line-oa` — protected LINE OA connection foundation

## Authentication

`users` stores a unique lowercase username and a `scrypt` password hash. `sessions` stores only a SHA-256 hash of a random token, its user, and expiry. Successful login or registration sets a seven-day HttpOnly, SameSite=Lax session cookie; production cookies are Secure.

Registration validates username and password at the API boundary. Login returns the same generic error for unknown users and wrong passwords. Logout revokes the current session. Protected pages resolve the current user through `/api/auth/me` and redirect anonymous visitors to `/login`.

## Responsive Behavior

Desktop uses a fixed left sidebar and top bar. Mobile uses a compact top bar and an off-canvas navigation panel. All controls have visible focus states, labels, and reduced-motion-safe transitions.

## Verification

- Password hash/verify and token hashing have Bun tests.
- Database migrations apply to PostgreSQL.
- Register, login, current-user, logout, and protected-route flows are exercised.
- Nuxt typecheck and production build pass.
- Landing, auth, dashboard, both themes, and mobile navigation are inspected in a browser.
