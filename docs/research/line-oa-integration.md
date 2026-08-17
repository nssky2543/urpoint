# LINE multi-tenant CRM integration requirements

Researched from current first-party LINE documentation on 2026-07-31. Every source below is hosted on `developers.line.biz`.

## Architecture decision

A store integration normally needs two separate channels:

- A **LINE Login channel** for web OAuth and LIFF.
- A **Messaging API channel** attached to the store's LINE Official Account for webhooks, messages, rich menus, and bot information.

Create both channels under the **same provider** when the CRM must treat a LINE Login/LIFF user and a Messaging API user as the same person. LINE user IDs are provider-scoped: the same user has the same user ID across channel types under one provider, but a different ID under another provider. Channels can't be moved to another provider later. LIFF apps can't be added to Messaging API channels. Also, since September 2024, a Messaging API channel is created by enabling Messaging API for a LINE Official Account, not directly in the Developers Console.

For a multi-tenant SaaS, do not assume one central LINE Login channel can correlate users with arbitrary tenant-owned LINE Official Accounts. It works by user ID only when the relevant channels share a provider. LINE also says a provider should represent the actual service provider; separate tenant companies may therefore need separate providers and separate LINE Login channels. If no suitable same-provider LINE Login channel exists, use the Messaging API account-link flow for that tenant instead.

Sources:

- https://developers.line.biz/en/docs/line-developers-console/best-practices-for-provider-and-channel-management/
- https://developers.line.biz/en/docs/liff/getting-started/
- https://developers.line.biz/en/docs/messaging-api/getting-started/
- https://developers.line.biz/en/docs/messaging-api/getting-user-ids/
- https://developers.line.biz/en/docs/messaging-api/linking-accounts/

## Recommended four-step wizard

### 1. LINE Login / LIFF

Collect:

- LINE Login Channel ID
- LINE Login Channel Secret
- Optional expected provider/store metadata for an operator confirmation screen

Show the exact callback URL the operator must register on the LINE Login tab. The Channel Secret is server-only and is used when exchanging an authorization code; it must never be sent to LIFF/browser code. There is no documented client-credentials call that independently proves a LINE Login Channel ID/Secret pair. The definitive credential check occurs when the server exchanges a real authorization code.

OAuth implementation:

1. Redirect to `https://access.line.me/oauth2/v2.1/authorize` with `response_type=code`, `client_id`, registered and URL-encoded `redirect_uri`, unique `state`, and scopes.
2. Recommended scopes are `openid profile`. Add `email` only after LINE approves email permission and only if the product needs it.
3. Generate a cryptographically secure, unpredictable, single-use `state` for every attempt; bind it to the tenant, intended return path, and browser session in server-side/session storage. Never use an arbitrary return URL without an allowlist.
4. Generate a separate single-use `nonce` when requesting an ID token and pass the same expected nonce to ID-token verification.
5. Implement PKCE even for the confidential web client: generate a 43–128 character `code_verifier`, send its SHA-256 Base64URL value as `code_challenge`, set `code_challenge_method=S256`, and send the original verifier during token exchange. LINE supports only `S256`.
6. On callback, handle both success and error parameters, compare `state` before exchanging the code, then POST to `https://api.line.me/oauth2/v2.1/token` with the exact same `redirect_uri`, authorization code, Channel ID, Channel Secret, and PKCE verifier. The code is one-use and valid for 10 minutes.
7. Verify the returned ID token server-side with `POST https://api.line.me/oauth2/v2.1/verify`, supplying `id_token`, expected `client_id`, and expected `nonce`. Use the verified `sub` as the LINE user ID.

The callback `redirect_uri` must exactly match the registered callback URL, except LINE permits optional query parameters to be added. HTTPS is recommended by LINE's security checklist. Avoid an open redirect.

Sources:

- https://developers.line.biz/en/docs/line-login/integrate-line-login/
- https://developers.line.biz/en/docs/line-login/integrate-pkce/
- https://developers.line.biz/en/docs/line-login/security-checklist/
- https://developers.line.biz/en/docs/line-login/verify-id-token/
- https://developers.line.biz/en/reference/line-login/

### 2. URL + LIFF

Collect or display:

- Public application base URL
- Registered LINE Login callback URL
- LIFF Endpoint URL
- LIFF ID and generated LIFF URL (`https://liff.line.me/{liffId}`)
- Selected LIFF scopes
- Messaging webhook URL, ready for step 3

Add the LIFF app to the LINE Login channel. Its Endpoint URL must use HTTPS and cannot contain a URL fragment. `liff.init()` is guaranteed only at the endpoint URL or a lower-level path.

Select only required scopes:

- `openid`: required for `liff.getIDToken()` and `liff.getDecodedIDToken()`
- `profile`: required for `liff.getProfile()` and `liff.getFriendship()`
- `email`: requires prior OpenID Connect email permission
- `chat_message.write`: only if the app actually calls `liff.sendMessages()`

For server identity, send the raw token from `liff.getIDToken()` to the CRM backend and verify it with LINE. Do not send or trust profile fields from `liff.getDecodedIDToken()` or `liff.getProfile()` as server authentication. Verify against the tenant's expected LINE Login Channel ID; otherwise a valid token from another tenant/channel could be accepted.

Current caveat: LINE's LIFF registration page says new LIFF apps are recommended as LINE MINI Apps because LIFF is planned to be integrated into that brand. Existing LINE Login-channel LIFF setup remains documented and supported, but this roadmap should be rechecked before a new long-lived rollout.

Sources:

- https://developers.line.biz/en/docs/liff/registering-liff-apps/
- https://developers.line.biz/en/docs/liff/developing-liff-apps/
- https://developers.line.biz/en/docs/liff/using-user-profile/
- https://developers.line.biz/en/docs/liff/getting-started/

### 3. Messaging API

Collect:

- Messaging API Channel ID
- Messaging API Channel Secret
- A channel access token, or assertion-signing key material needed to issue one
- Optional expected Official Account basic/premium ID for an explicit mismatch check

Credential validation:

1. Call `GET https://api.line.me/v2/bot/info` with the supplied channel access token.
2. Require `200`, then display and persist the returned bot `userId`, `basicId`, optional `premiumId`, and `displayName` for operator confirmation.
3. For channel access token v2.1, also call `GET https://api.line.me/oauth2/v2.1/verify?access_token=...` and require the returned `client_id` to match the stored Messaging API Channel ID and `expires_in` to be positive.
4. This validates the token and identifies its Official Account. It **does not validate the supplied Channel Secret**. The Channel Secret is proven only by successfully verifying a real LINE-signed webhook. The wizard should label these as separate checks.

Token choice:

- **Default: channel access token v2.1.** LINE explicitly recommends it. It uses an RSA-2048/RS256 assertion signing key, supports a caller-selected lifetime up to 30 days, is revocable, returns a `key_id`, and allows at most 30 unexpired tokens per channel. Store the token and `key_id` pair.
- **Stateless token:** suitable when the backend can mint/cache short-lived tokens. Issue with `POST https://api.line.me/oauth2/v3/token`; it lasts 15 minutes, has no issuance-count limit, and cannot be revoked. It can be issued using Channel ID/Secret or a JWT assertion.
- Avoid introducing new long-lived tokens. Short-lived and long-lived token types still exist, but LINE's build guide recommends v2.1.

Webhook setup:

- Register one public HTTPS webhook endpoint on the Messaging API tab, click **Verify**, enable **Use webhook**, and normally enable **Webhook redelivery**.
- LINE allows only one webhook URL per Messaging API channel. Use a tenant-specific route such as `/api/line/webhook/{opaqueTenantKey}` so the server can select the correct Channel Secret before trusting body fields.
- The endpoint must use HTTPS with a publicly trusted certificate; self-signed certificates aren't accepted. LINE currently supports TLS 1.2 and 1.3, not 1.1 or lower.
- The console verification request is a POST whose body can contain `events: []`; return `200`.

Webhook processing order:

1. Read the raw UTF-8 request bytes and `x-line-signature` without parsing or modifying the body.
2. Select the tenant credential from the configured route, not from an unverified user-controlled field.
3. Compute Base64-encoded HMAC-SHA256 over the exact raw body using that tenant's Messaging API Channel Secret and compare signatures in constant time.
4. Reject missing or invalid signatures and do not process events.
5. Parse only after verification. Optionally require body `destination` to equal the bot `userId` saved from `/v2/bot/info`.
6. Insert each `(tenant_id, webhookEventId)` into a unique idempotency store before side effects. Treat a uniqueness conflict as already processed.
7. Queue verified events and return `2xx` quickly; LINE recommends asynchronous processing.

Redelivery is disabled by default, its schedule/count is undisclosed, ordering can change, and delivery is not guaranteed. `deliveryContext.isRedelivery` is informational; deduplicate by `webhookEventId`, which stays unchanged. Use event `timestamp` where ordering matters.

Sources:

- https://developers.line.biz/en/docs/messaging-api/building-bot/
- https://developers.line.biz/en/docs/messaging-api/generate-json-web-token/
- https://developers.line.biz/en/docs/messaging-api/verify-webhook-signature/
- https://developers.line.biz/en/docs/messaging-api/receiving-messages/
- https://developers.line.biz/en/docs/messaging-api/ssl-tls-spec-of-the-webhook-source/
- https://developers.line.biz/en/reference/messaging-api/#get-bot-info
- https://developers.line.biz/en/reference/messaging-api/#issue-stateless-channel-access-token
- https://developers.line.biz/en/reference/messaging-api/#issue-channel-access-token-v2-1

### 4. Finish

Do not mark a tenant connected until all applicable checks pass:

- LINE Login callback URL is registered and a real OAuth callback completed.
- OAuth `state`, nonce, PKCE, token exchange, and server-side ID-token verification passed.
- LIFF Endpoint URL and scopes are confirmed; a real LIFF ID token verified against the expected Channel ID.
- Messaging token returned the expected bot from `/v2/bot/info`.
- Webhook URL verification returned `200`, **Use webhook** is enabled, and at least one signed webhook passed verification with the stored Messaging Channel Secret.
- Login and Messaging channels are operator-confirmed under the same provider if shared user IDs are required.
- Redelivery and idempotency storage are enabled.
- Secrets are stored server-side and no secret/token is present in URLs, client bundles, logs, analytics, or error messages.

Persist a connection record keyed by internal `tenant_id`, including channel types separately, provider confirmation status, LINE Login Channel ID, LIFF ID, Messaging bot `userId`, Messaging Channel ID when known, token type/expiry/key ID, encrypted secret references, webhook route key, and last verification timestamps. Never identify a tenant only from a LINE user ID.

## Linking a LINE user to a store tenant

Use a compound identity such as `(tenant_id, line_user_id)`. Derive `line_user_id` only from a server-verified LINE Login/LIFF ID token (`sub`) or a signature-verified Messaging webhook (`source.userId`). The provider relationship determines whether those values can be compared across the two channels.

If the store already has its own customer account, prefer LINE's Messaging API account-link flow:

1. The user must be a friend of the Official Account.
2. Issue a one-time, 10-minute link token with `POST /v2/bot/user/{userId}/linkToken`.
3. Authenticate the user to the store account on the CRM service.
4. Generate a secure random, single-use nonce of 10–255 characters; LINE recommends at least 128 bits.
5. Bind the nonce server-side to `(tenant_id, store_customer_id)` and redirect to `https://access.line.me/dialog/bot/accountLink`.
6. On a signature-verified account-link webhook with `result=ok`, consume the nonce once and create the association.
7. Always allow unlinking and tell users at link time that unlinking is available.

This official flow avoids needing a LINE Login channel for account linking and protects against an attacker linking the wrong LINE account.

Source: https://developers.line.biz/en/docs/messaging-api/linking-accounts/

## Rich menus

Minimum API sequence:

1. Optionally validate the object: `POST https://api.line.me/v2/bot/richmenu/validate`.
2. Create: `POST https://api.line.me/v2/bot/richmenu`.
3. Upload image: `POST https://api-data.line.me/v2/bot/richmenu/{richMenuId}/content`.
4. Link as tenant default: `POST https://api.line.me/v2/bot/user/all/richmenu/{richMenuId}`, or link per user: `POST https://api.line.me/v2/bot/user/{userId}/richmenu/{richMenuId}`.

Images must be JPEG or PNG, 800–2500 px wide, at least 250 px high, aspect ratio at least 1.45, and at most 1 MB. An uploaded image cannot be replaced; create a new rich menu to change it. A LINE Official Account can have up to 1,000 API-created rich menus. Only one per-user menu can be linked at a time, and its priority is above the Messaging API default and Official Account Manager default. A `200` link response does not guarantee display for deleted, blocked, non-friend, or wrong-provider users.

Sources:

- https://developers.line.biz/en/docs/messaging-api/using-rich-menus/
- https://developers.line.biz/en/reference/messaging-api/#create-rich-menu
- https://developers.line.biz/en/reference/messaging-api/#upload-rich-menu-image
- https://developers.line.biz/en/reference/messaging-api/#set-default-rich-menu
- https://developers.line.biz/en/reference/messaging-api/#link-rich-menu-to-user

## Broadcast, multicast, and narrowcast

- **Broadcast** (`POST /v2/bot/message/broadcast`) sends to all current friends of the Official Account. Maximum 5 message objects per request; rate limit 60 requests/hour.
- **Multicast** (`POST /v2/bot/message/multicast`) targets up to 500 LINE user IDs per request, maximum 5 message objects, rate limit 200 requests/second. It can't target groups or multi-person chats. A `200` can still mean no delivery to blocked, deleted, non-friend, or wrong-provider users.
- **Narrowcast** (`POST /v2/bot/message/narrowcast`) targets friends by audiences/demographics, is asynchronous, accepts up to 5 message objects, and is limited to 60 requests/hour. Check its progress endpoint after the accepted response. Attribute targeting requires target reach of at least 100; final recipients generally must be at least 50, and each combined audience generally needs at least 50. Uploaded-user-ID and chat-tag audiences created by the same Official Account have stated exceptions. Filtering in Thailand excludes users under 20 in certain cases.
- All three consume the account's message quota and can return `429`. Use a unique `X-Line-Retry-Key` when safely retrying supported send requests. Validate message objects before a campaign send.

Exact limits are per channel and can change; treat `429` and asynchronous delivery failures as normal operational states, and recheck the current API reference before building campaign batching.

Sources:

- https://developers.line.biz/en/reference/messaging-api/#send-broadcast-message
- https://developers.line.biz/en/reference/messaging-api/#send-multicast-message
- https://developers.line.biz/en/reference/messaging-api/#send-narrowcast-message
- https://developers.line.biz/en/reference/messaging-api/#rate-limits

## Secret storage and rotation

LINE explicitly treats Channel Secrets as confidential and says they must be properly managed by the server. Implementation policy for this CRM should therefore be:

- Keep LINE Login Channel Secrets, Messaging Channel Secrets, channel access tokens, assertion private keys, OAuth verifiers, and linking nonces server-side only.
- Encrypt persistent tenant credentials with a managed secret/KMS key; store references rather than plaintext where the deployment platform supports it. Restrict decryption by tenant and operation, redact logs, and audit access. These storage mechanics are implementation recommendations; LINE's cited docs require confidentiality/proper management but don't prescribe a specific vault or encryption product.
- For v2.1 access-token rotation, issue and verify a replacement, deploy it, use the stored `key_id` to identify the old token, and revoke that token. Keep below 30 unexpired tokens.
- For stateless tokens, rotate by waiting at most 15 minutes because they cannot be revoked. A suspected leaked assertion private key or Channel ID/Secret still requires rotating the underlying credential.
- Reissuing a Messaging Channel Secret immediately invalidates the old secret. Coordinate webhook deployment because LINE documents no overlap/grace period.
- For a LINE Login Channel Secret, the reviewed official LINE Login pages establish confidentiality but don't document a rotation procedure or dual-secret grace period. Confirm the current Console reissue operation in the tenant runbook before an incident, and plan an atomic update of all code-exchange paths.

Sources:

- https://developers.line.biz/en/docs/line-login/security-checklist/
- https://developers.line.biz/en/docs/messaging-api/verify-webhook-signature/
- https://developers.line.biz/en/docs/messaging-api/generate-json-web-token/
- https://developers.line.biz/en/reference/messaging-api/#revoke-channel-access-token-v2-1
- https://developers.line.biz/en/reference/messaging-api/#issue-stateless-channel-access-token

## Known uncertainties and feature caveats

- Same-provider status is operationally critical but isn't exposed by the bot-info response. The wizard needs operator confirmation and a real cross-channel user-ID test, or it should use Messaging account linking instead.
- `/v2/bot/info` verifies a channel access token and identifies the Official Account; it doesn't prove the Messaging Channel Secret.
- LINE's docs reviewed here don't define a zero-downtime grace period for Channel Secret rotation.
- Webhook redelivery is best-effort, not a queue guarantee. Retain internal retry/dead-letter handling after acknowledging a verified event.
- Message quotas/pricing and some audience capabilities depend on account/plan/region. The API reference can accept a request before an asynchronous narrowcast later fails.
- New LIFF apps are currently documented, but LINE recommends LINE MINI App for new work because of the announced future brand integration.
