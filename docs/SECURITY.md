# Security hardening: what changed and how to deploy it

Covers the 2026-11-10 audit (`WGC_Security_Audit_2026-11-10`) plus issues found
while fixing it. Companion changes live in `wgc-lead-pipeline` on the same
branch name.

## Request path after this change

```
visitor ─▶ Cloudflare ─▶ Railway edge ─▶ nginx (frontend service)
                                          │  derives real client IP
                                          │  per-IP limit_req / limit_conn
                                          │  adds X-Internal-Proxy-Token
                                          ▼
                                       API (private: api.railway.internal)
                                          │  per-route + per-session limits
                                          │  concurrency gate, daily read cap
                                          │  Turnstile-backed sessions
                                          ├─▶ extractor (private, Docling, no AI)
                                          └─▶ /api/leads/* ─▶ n8n WF-0 / WF-1
                                                (X-WGC-Gateway secret)
```

## Fixed

| Audit item | Fix | Where |
|---|---|---|
| API returned 502 / timed out | Root cause: nginx resolved `api.railway.internal` once at boot; the API redeployed on 2026-11-07 onto new private IPs, so every `/api` call hit dead addresses. nginx now re-resolves every 10 s. Reproduced and verified in Docker by moving the upstream to a new IP. | `nginx.conf.template` |
| Rate limiter trusts `X-Forwarded-For`, no expiry | XFF is never read. nginx derives the client from `CF-Connecting-IP` only when the Railway edge peer is a Cloudflare range, else `X-Real-IP`, and overwrites every identity header. API store has TTL eviction and a hard key cap, or Redis (`REDIS_URL`) for shared limits across replicas and restarts. | `nginx.conf.template`, `api/src/security/*` |
| Paid routes lack challenge, shared cost cap, concurrency | Turnstile-verified 30-min sessions required on paid routes (when keyed); per-IP and per-session quotas; 4 global / 1 per-client in-flight document reads; hard daily cap on reads (`EXTRACT_DAILY_CAP`, default 400; originally a cap on billable AI calls). nginx no longer strips `Origin`, and `INTERNAL_PROXY_TOKEN` refuses requests that skip nginx. | `api/src/app.ts` |
| Provider errors reach users | Public errors are fixed copy + `code` + `requestId`. Upstream detail is logged only, with key/token/URL-credential redaction. Tested with a mocked failure containing a fake key. | `api/src/http/errors.ts` |
| Weak AI input/output boundaries | Recommendations accept typed numbers + an allowlisted county only; status, explanation and county portal are computed server-side (rule engine mirrored, parity-tested). Extraction output validated field by field; a model's "not a document" text never reaches users. Recommendation HTML reduced to attribute-free `strong/b/em/i/p/ul/ol/li/br` on the server and again by DOMPurify in the browser. | `api/src/domain/*`, `src/lib/sanitize.ts` |
| Dependency advisories | API: hono 4.13, @hono/node-server 2, zod 4.6, @google/genai 1.52; unused `pdfjs-dist` removed. Frontend: dompurify 3.4.17, react-router 7.18.5. `npm audit --omit=dev`: 0 in both. Node 22 (20 is EOL). | `package*.json` |
| CSP `unsafe-inline` script, no HSTS | Inline nav script moved to `/site-nav.js`; `script-src` has no `unsafe-inline`. HSTS 180 d (no `includeSubDomains`/preload until every subdomain is checked). Added `frame-ancestors`, `base-uri`, `form-action`, `object-src`. Dotfiles return 404 instead of the SPA shell. | `nginx.conf.template` |
| `/privacy` 404, addresses logged | `/privacy` page written from the actual data flows (**needs counsel review**). Address and value logging removed. | `src/components/PrivacyView.tsx`, `api/src/adapters/index.ts` |

## Lead pipeline (LeadSimple) problems found and fixed

These were not in the audit. They come from reading the n8n workflows and the Railway setup.

1. **Anyone could mail anyone through Westrom's Brevo account.** The n8n token
   endpoint was public, tokens were reusable for 2 h, and `submission_id` is
   client-chosen. One script could create unlimited LeadSimple deals, send
   unlimited "new lead" emails to Jon/Ashley/Youssef, and send the guide email
   to any address on the internet. That is a spam relay that could get the
   Brevo account suspended. Fix: the `/api/leads/*` gateway with per-IP limits,
   at most 3 submissions per render token, one guide email per address per
   24 h, daily caps on submissions (300) and guide emails (150), and optional
   Turnstile. n8n accepts only gateway calls once `WGC_GATEWAY_SECRET` is set.
2. **No rate limiting existed in production.** The nginx limit in
   `wgc-lead-pipeline/infra` belonged to the abandoned VPS design. On Railway,
   n8n was called directly.
3. **Consent evidence was forgeable.** The IP came from the first
   `X-Forwarded-For` entry (client-controlled) and `ts` from the client clock.
   Now it uses the gateway-verified IP/UA and server receipt time.
4. **The documented embed snippet could not submit.** `data-endpoint=".../hook"`
   fell through to the SPA on Railway. `/hook/token` and `/hook/lead` now map to
   the gateway.
5. **The dedupe buffer was unbounded** (rewritten on every execution). It is now capped at 5000.

Still open (needs a decision or Railway access, not code):

- **n8n consolidated (2026-11-11).** n8n now runs as one `main` service in
  regular mode, pinned to `n8nio/n8n:2.44.4`, plus Postgres. The `worker`, `Redis`
  and its volume were deleted. Measured: n8n memory went from ~0.85 GB
  (main 0.41 + worker 0.43 + Redis 0.01) to ~0.69 GB on main alone (~19% less;
  main now runs the executions and JS task runner itself), with two fewer
  services to run and patch.
  `main`'s `/home/node/.n8n` is still ephemeral, so the estimator's
  `segment-index.json` and the metrics file are lost on each `main` redeploy.
  The index is currently missing (estimates fall back to RentCast market data):
  re-seed it (`wgc-lead-pipeline/infra/runbooks/deploy-estimator.md` STEP 1).
- **Metrics/dedupe use local files and workflow static data,** which race if
  executions overlap. At today's volume this is acceptable. If it grows, move
  them to Postgres.
- **Estimate-only submissions (no email) never reach LeadSimple** (WF-2 "Has
  contact?" has no false branch). This is intentional: no contact, no lead. Say
  so if the team expected otherwise.

## Data model

No new database is needed. The state these controls need is small, short-lived
counters (rate windows, token-use counts, a per-email-hash cooldown, daily
budgets). It lives in the API's counter store: memory by default, Redis with
`REDIS_URL`. Emails are stored only as SHA-256 hashes with a 24 h TTL.
`wgc-lead-pipeline` ADR-5 ("no lead database of ours") still holds.

The one model change worth considering later is a **delivery ledger**:
`submission_id → {status, deal_id, attempts, timestamps}`, with no PII. It would
let you reconcile "submitted vs. in LeadSimple" instead of relying on alert
emails. It touches ADR-5, so it is a product decision.

## Recommendations: templates, not AI (2026-11-11)

The rule engine already decides every outcome, so the recommendation text is
a template over its numbers (`api/src/domain/recommendations.ts`). No AI text
provider, no session, no budget slot; nothing leaves our server. The Groq and
Moonshot providers were removed; `GROQ_*`, `MOONSHOT_*` and
`OPENROUTER_TEXT_MODEL` are no longer read. Document reading moved to the private Docling `extractor` the same day, and
the remaining AI code (Gemini/OpenRouter providers, prompts, `@google/genai`)
was deleted; no AI keys are set anywhere. The daily cap and concurrency gate
now bound document reads (`EXTRACT_DAILY_CAP`, `EXTRACT_MAX_CONCURRENCY`;
the old `AI_*` names are still read as a fallback).

## Leads: accept, then deliver (2026-11-12)

Every accepted lead is written to the private Postgres (`lead` table, kept
permanently; owner decision, supersedes wgc-lead-pipeline ADR-5) before it
is handed to n8n WF-1. If n8n answers within 8 s the visitor sees the
estimate as before; otherwise the visitor still gets the normal success
answer, the lead stays `pending`, and the `worker` service (`node
dist/worker.js`, same image as the API) retries with backoff (30 s doubling
to hourly) until delivered. After 30 attempts it is marked `dead` and logged
as an error; it is never deleted. Rows are claimed with `FOR UPDATE SKIP
LOCKED` leases, so any number of API replicas and workers can share the
queue; WF-1 also dedupes on submission_id. If the database itself is down,
the API falls back to delivering directly.

Render tokens: the API can mint and verify them itself (`lead_token_key` in
`app_secret`), so the form keeps working while n8n is down. This is switched
on with `LEAD_TOKEN_ISSUER=api` only after WF-1 is imported with Header Auth
"WGC gateway" (value = `app_secret.n8n_gateway_secret`), because WF-1 then
trusts `gateway_verified` leads that waited in the queue past the 2 h token
window.

## Rental estimate from Rentvine (2026-11-12)

The `worker` service syncs active leases from Rentvine (corporation
`westromgroup`) at start when the data is over 20 h old and nightly at 03:17
America/Chicago; `NOTIFY rentvine_sync` runs it on demand. Its own client:
no connection to any other app. The key is read from this project's private
Postgres (`app_secret` rows `rentvine_api_key`, `rentvine_api_secret`, added
by a person in Railway's database view); it is never a variable. Read-only,
one request every 3 s, at most 40 pages; 429/5xx back off, 401/403 stop.
Only zip, beds, baths, sqft, rent, lease start date and an opaque unit id are
kept (`segment_index`); unchanged data is not rewritten; a partial read never
replaces a good index. Outcomes are in `rentvine_status`.

The API computes the estimate itself from that index (cached 10 min in
memory), so visitors get it even while n8n is down; n8n's estimate (RentCast)
is used only when ours has no data for the segment.

## Two API copies, shared limits, uptime alert (2026-11-12)

The API runs as two always-on replicas behind Railway's edge, so a crash or
deploy never drops requests (it does not sleep: nginx reaches it over the
private network, which refuses connections while a service is asleep; that
caused 502s on the lead form on 2026-11-12). Rate-limit and abuse counters
(per-IP limits, token-reuse cap, guide-email cooldown, daily caps) live in
the private Postgres (`rate_counter`, UNLOGGED, one atomic upsert each), so
the limits stay global across replicas; database trouble degrades to
per-process limits, never to a failed request. The worker sweeps expired
counters.

`GET /api/leads/health` (counts and ages only) answers 503 when a lead has
waited over 90 min, any lead failed for good in 24 h, or Rentvine has not
synced in 48 h. A Sentry uptime monitor watches it.

## Railway configuration (2026-11-11)

- frontend + api: serverless (sleep after idle), healthchecks (`/`, `/health`),
  restart ON_FAILURE x10, watch paths so each only rebuilds on its own files,
  and `RAILWAY_DOCKERFILE_PATH` pinned. Without it, a dashboard "Redeploy"
  rebuilt the frontend with Railpack/Caddy (no nginx, no `/api` proxy): the
  site's `/api` was down for ~35 minutes on 2026-11-10 until this was set.
- api: the Railway-generated public domain was removed; `api.wgcassetguide.com`
  stays attached (token-locked) until its Cloudflare DNS record is deleted.
- n8n: see "n8n consolidated" above.

## Environment variables

API service:

| Var | Required | Notes |
|---|---|---|
| `INTERNAL_PROXY_TOKEN` | yes | Same value on the frontend service. `openssl rand -hex 32` |
| `ALLOWED_ORIGINS` | yes | `https://wgcassetguide.com` |
| `LEAD_ALLOWED_ORIGINS` | no | Default `https://wgcassetguide.com,https://westromgroup.com,https://www.westromgroup.com` |
| `N8N_LEAD_WEBHOOK_BASE` | yes | `https://main-production-bf72.up.railway.app/webhook/d043c102d78e` |
| `N8N_GATEWAY_SECRET` | yes | ≥ 32 chars; same value as `WGC_GATEWAY_SECRET` on n8n |
| ~~`TURNSTILE_SECRET_KEY`~~ | **not a variable** | The Turnstile secret is a row in the private database: `app_secret` name `turnstile_secret_key`, added by a person in Railway's database view; restart the API after adding it. Absent = no challenge. (The variable is read only for local development.) |
| ~~`SESSION_SECRET`~~ | **not a variable** | Generated on first use in `app_secret` (`session_secret`) and shared by both API copies, so a session issued by one copy is valid on the other. Delete the variable if it is still set |
| `LEAD_REQUIRE_TURNSTILE` | later | `true` only after the widget carries `data-turnstile-sitekey` everywhere |
| `EXTRACTOR_URL` | recommended | `http://${{extractor.RAILWAY_PRIVATE_DOMAIN}}:8080`. Document reading via the private Docling service (no AI). Unset = legacy AI vision chain |
| `DATABASE_URL` | recommended | `${{Postgres.DATABASE_URL}}`, the project's private Postgres (no TCP proxy). Holds the API↔extractor token in `app_secret`, generated on first use; it is never a variable. Same reference on the extractor |
| `REDIS_URL` | no | Not used: with `DATABASE_URL` the rate-limit counters are shared by every API copy in Postgres (`rate_counter`) |
| `EXTRACT_DAILY_CAP` | no | Default 400 document reads per UTC day |
| `LEAD_DAILY_SUBMIT_CAP` / `LEAD_DAILY_GUIDE_EMAIL_CAP` | no | Defaults 300 / 150 |

Frontend service: `INTERNAL_PROXY_TOKEN` (same value), `API_UPSTREAM`
(unchanged), and optionally `VITE_TURNSTILE_SITE_KEY` (a public key, baked into
the build). `VITE_API_BASE_URL` must NOT be set in production: the site calls
its own `/api` (deleted 2026-11-13; the API has no public address). The old
AI variables (`OLLAMA_BASE_URL`, `TEXT_MODEL`, `VISION_MODEL`, `ESTATED_API_KEY`,
`AI_DAILY_CALL_CAP`) are gone and no longer read.

n8n `main`: `WGC_GATEWAY_SECRET` (step 6 below).

## Deploy order

Each step is safe on its own. Stop at any step if a check fails.

1. **Immediate outage relief (optional, before merging):** redeploy the
   frontend service. Restarting nginx re-resolves the API's current IP. This
   holds until the API's next redeploy.
2. Generate three secrets: `INTERNAL_PROXY_TOKEN`, `SESSION_SECRET`,
   `N8N_GATEWAY_SECRET`.
3. Set the API and frontend variables above. Old code ignores them, so this is
   safe before merge. It triggers redeploys, which also gives the step 1 relief.
4. Merge. Railway deploys both services from `main`. Check:
   - `https://wgcassetguide.com/taxes`: upload a notice; values + recommendation appear.
   - `/analysis`: submit; the estimate appears and a LeadSimple deal is created.
   - `curl -X POST https://api.wgcassetguide.com/api/recommend-tax` returns `403 forbidden`.
5. Remove the API's public domains (`api.wgcassetguide.com` and the
   `*.up.railway.app` one) once you confirm nothing else calls them. Nothing in
   either repo does. The token from step 3 already blocks them.
6. **n8n lock:** import the updated WF-0 and WF-1 from `wgc-lead-pipeline`,
   Publish both, then set `WGC_GATEWAY_SECRET` on n8n `main`. Setting it
   redeploys `main` and **wipes the estimator index**; re-seed right after. Confirm a direct
   `GET .../webhook/d043c102d78e/token` now returns an empty body.
7. Turnstile: create one widget in Cloudflare (Managed mode) with hostnames
   `wgcassetguide.com`, `westromgroup.com` and `www.westromgroup.com`. Add the
   SECRET key as an `app_secret` row named `turnstile_secret_key` (database
   view, never a variable) and restart the API; its log then says
   `Bot challenge: Turnstile on`. Set the public SITE key as
   `VITE_TURNSTILE_SITE_KEY` on the frontend service (a build-time value) and
   redeploy it. For the lead form, add `data-turnstile-sitekey` to every
   embed, then set `LEAD_REQUIRE_TURNSTILE=true` on the API.
8. AI provider keys: none are used any more (all removed from Railway on
   2026-11-11). Revoke the old OpenRouter / Groq / Google AI / Moonshot keys
   in those dashboards so they cannot be misused.

## Verification done in this branch

- API: 95 tests (security, gateway, contracts, parity), lint, `npm audit` clean.
- Frontend: 31 tests, lint, build, `npm audit` clean.
- Real nginx 1.31 container: config test, identity derivation (Cloudflare
  vs. direct peer, forged headers), per-client 429s with JSON body, dotfile
  404s, security headers, body limits, `/hook` alias, and DNS re-resolution
  after the upstream moved IPs.
- Compiled API behind real nginx: internal-token gate, CORS, generic errors
  on real provider 401s with redacted logs. Real Redis: atomic counters,
  expiry, degraded mode when Redis is down.
- Browser (Playwright) against the full local stack: lead form submit through
  the gateway (gateway secret and allowlisted body reached the fake n8n; the
  estimate rendered), all SPA routes and the static pages load with zero CSP
  or console errors, mobile nav works without inline script.
- Not verified here: a Docker image build (the sandbox's network proxy is not
  reachable from inside `docker build`), real Turnstile keys, and real n8n.
