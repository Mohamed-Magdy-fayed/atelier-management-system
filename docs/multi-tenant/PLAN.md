# Multi-tenant conversion — build plan

## How to use this document

1. **First action of the first session:** commit this file to the repo at
   `docs/multi-tenant/PLAN.md`. Every step prompt below assumes it is there.
2. Work one step at a time. Each step is scoped to a single PR.
3. To start a step, open a **new session** and paste the step's **Prompt** block verbatim. It tells
   the session to read this document first, so it needs no other context from this conversation.
4. Do not start a step until its **Depends on** steps are merged.
5. Merge only when the step's **Acceptance** boxes are all ticked and the **Review focus** items have
   been checked by a reviewer. `npm run typecheck && npm run build` must pass on every PR.

Steps are numbered `01`–`31` and grouped into phases. Phases P0–P2 are additive and reversible. **P1
Step 07 is the point of no return.** P3 is where a mistake becomes a data breach rather than a bug —
its exit criterion is a green isolation test, not a passing build.

---

# Part 1 — Context

The app today is a single-tenant back-office for one atelier (Alaa El-Kasry). It has a `branches`
table and branch-scoped data, so it *looks* half-way to multi-tenant — but branches are locations
inside one business, and everything above them (users, settings, public catalog, brand, storage
paths, cache keys) is global. Critically, `role === "admin"` short-circuits every branch check in
`src/features/system/shared/staff-access.ts`, making an admin a global superuser. That property must
not survive.

Goal: each atelier is a **tenant**; tenants own **branches**; no tenant can ever observe another's
data. Reference architecture: the [Vercel Platforms Starter Kit](https://github.com/vercel/platforms).

## Locked decisions

| Decision | Choice |
|---|---|
| Hierarchy | Tenant → Branch → data |
| Isolation | Shared DB + `tenantId` column, enforced in the app layer; RLS designed for, deferred to P7 |
| Routing | Subdomain via the Vercel kit's `/s/[subdomain]` rewrite; custom domains for tenant #1 only |
| Existing prod data | Backfilled into tenant #1, nothing lost |
| Passkeys | **Disposable** — no production enrollments to preserve; `biometric_credentials` may be dropped |
| Brand | App name is **Gateling Atelier** (`funtastic` and the `Funtastic` refs in `docs/` are stale) |
| WhatsApp | **No env vars** — per-tenant config lives in that tenant's `settings` rows |
| Billing | Paymob (Egypt) — deferred, not built here |

## Alignment with the Vercel Platforms kit

The kit's conventions map on unusually well: this repo already uses `proxy.ts` (the Next.js 16
replacement for `middleware.ts`, which the official repo also uses now) and already has Upstash Redis
wired up — exactly what the kit uses for subdomain lookup.

**Adopted:** the `app/s/[subdomain]/` rewrite; `NEXT_PUBLIC_ROOT_DOMAIN` with `rootDomain`/`protocol`
helpers; `extractSubdomain(request)` handling dev / Vercel preview / production; apex hosts marketing
and the platform console; wildcard DNS `*.domain.com`.

**Deviations:** the kit stores tenants in Redis only — here they are a Postgres table (FKs, backfill
and joins are all required) with Redis as a read-through cache. The kit has no auth, no roles and no
data isolation to enforce; everything in Part 2 P3 is net-new and is where the risk lives.

## Five findings that shape the work

1. **The migration chain is safe to generate against.** `drizzle-kit generate` diffs only the
   *latest* snapshot, and `meta/0013_snapshot.json` matches `schema.ts`. The missing `0003`–`0008`
   snapshots are inert history — **do not fabricate them**; that corrupts `prevId` chaining and can
   resurrect the `0009` failure.
2. **`src/proxy.ts` never runs for tRPC.** Its matcher excludes `/api`, and must keep excluding it
   (the `/s/` rewrite would corrupt API routes). So the rewrite gives *page* routes their tenant,
   while **tRPC resolves the tenant independently from the `Host` header**. That is also
   security-correct: an inbound `x-tenant-id` is attacker-controlled.
3. **Seven global unique constraints, not five** — also `dresses.code` and
   `reservations.reservationCode`, both inline `.unique()`.
4. **`reservationCode` embeds the branch short code** and counts per-branch-per-day. Once short codes
   are only tenant-unique, two tenants each having a `MAIN` branch produce colliding codes.
5. **`rental_customers`' unique doesn't enforce what the code believes.** It is on raw `phone`, but
   dedup logic (migration `0011`, `src/lib/phone.ts`) works on the normalized key via the
   `rental_customer_phone_key()` IMMUTABLE function. So `0100…` and `+20100…` can both exist today.

---

# Part 2 — Architecture reference

Steps below refer to these sections by name. This is the design; the steps are the execution order.

## §A New schema — `src/drizzle/schemas/tenancy/`

A **third** top-level schema folder, deliberately not inside `auth/`.

**`tenants`** — `id`, `slug` (varchar 63, globally unique — the subdomain label), `customDomain`
(nullable, unique), `nameEn`/`nameAr`, `logoUrl`, `currency` (default `EGP`), `locale`,
`defaultCountry`, `timezone` (default `Africa/Cairo`), `status` (enum
`trial|active|suspended|cancelled`), `plan` (varchar placeholder), `fromName`, `replyToEmail`,
timestamps.

**`tenant_memberships`** — PK `(tenantId, userId)`; `role` (new enum `tenant_role`:
`owner|admin|employee|customer`), `status` (`active|invited|suspended`), `invitedBy`, timestamps. Plus
a redundant `uniqueIndex(tenantId, userId)` so it can serve as an FK target.

A **new** enum rather than widening `user_role`: `owner` is net-new, and widening would silently
change the meaning of `users.role` and the `rolesPermissions` matrix at the same time.

**`users.platformRole`** — new column, enum `platform_role` (`none|support|superadmin`), default
`none`. The *only* cross-tenant authority in the system.

**`tenant_access_audit`** — `actorUserId`, `tenantId`, `reason`, `startedAt`, `endedAt`. Cheap now,
impossible to retrofit credibly later.

## §B Users stay global identities — no `tenantId` on `users`

Forced by existing structure: `user_oauth_accounts` PK is `(providerAccountId, provider)`, so
tenant-scoped users would mean one Google account can only belong to one tenant;
`biometric_credentials.credentialId` is globally unique by WebAuthn spec; and keeping
`users_email_unique`/`users_phone_unique` removes the two riskiest constraint swaps from the
migration entirely.

Consequence: sign-in is two steps — authenticate the global identity, then assert membership in the
host's tenant. Cross-tenant *identity* is shared; cross-tenant *access* is not.

## §C Which tables get `tenantId`

All nine tenant-owned tables, **including those already reachable via `branchId`**: `branches`,
`branch_memberships`, `dresses`, `reservations`, `payments`, `expenses`, `rental_customers`,
`settings`.

Identity-level tables (`user_credentials`, `user_oauth_accounts`, `user_tokens`,
`biometric_credentials`) do **not** — they are scoped transitively by `userId`.

The uniformity is not cosmetic: one identically-named column on every table is what makes the
isolation test generic, the compiler sweep mechanical, and the future RLS policy a copy-paste. A
transitive join-based check is none of those.

## §D Integrity — composite FKs, not trust

Denormalization invites drift (a dress whose `tenantId` disagrees with its branch's). Close it in the
DB:

- `branches`: `uniqueIndex("branches_tenant_id_unique").on(tenantId, id)` — a redundant unique whose
  only job is to be an FK target.
- `dresses`, `reservations`, `payments`, `expenses`, `branch_memberships`: replace the single-column
  branch FK with `foreignKey({ columns: [tenantId, branchId], foreignColumns: [BranchesTable.tenantId, BranchesTable.id] })`.
- `branch_memberships` additionally gets a composite FK to `(tenant_memberships.tenantId, userId)` —
  making it structurally impossible to assign a branch to a non-member of that tenant.

## §E The seven global uniques

| Constraint | Resolution |
|---|---|
| `users_email_unique`, `users_phone_unique` | **Keep global** (§B) |
| `branches_short_code_idx` | → `unique(tenantId, shortCode)` — every tenant gets its own `MAIN` |
| `dresses_code_unique` | → `unique(tenantId, code)` |
| `reservations_reservationCode_unique` | → `unique(tenantId, reservationCode)` + tenant-scope the generator |
| `settings_code_unique` | → `unique(tenantId, code)` |
| `rental_customers_phone_unique` | → stored generated column `phoneKey generatedAlwaysAs(sql\`rental_customer_phone_key(phone)\`)` + `unique(tenantId, phoneKey)` |

The generated column works because the function is already `IMMUTABLE STRICT` — Postgres's exact
requirement — and drizzle-orm 0.45 supports `generatedAlwaysAs`. It keeps the constraint expressible
in `schema.ts` (a bare functional index would cause permanent schema/DB drift) and finally makes the
SQL function and `phone.ts` verifiable against each other.

## §F Barrel-cycle rules

`users-table.ts ⇄ branch-memberships-table.ts ⇄ branches-table.ts` all import from `"."` and work
only because Drizzle's `references(() => …)` is lazy. Adding `tenants` to that cycle invites
`Cannot access 'X' before initialization` depending on bundler order.

1. **Table files import table objects by direct path, never from a barrel.** Already the convention
   in `system/` (e.g. `rental-customers-table.ts`); `auth/` is the outlier.
2. **`tenants-table.ts` imports nothing.** Ownership is a `tenant_memberships` row with
   `role='owner'`, *not* a `tenants.ownerId` column — keeping `tenants` a dependency-free graph root
   that can never be in a cycle.
3. Cycle-forming `relations()` go in `tenancy/relations.ts`, imported last. `relations()` is inert at
   definition time, so cycles there are harmless.

## §G Tenant resolution

**Route shape** (Vercel kit):

```
app/(marketing)/…                     ← apex: landing, /get-started, platform console
app/s/[subdomain]/(system-pages)/…    ← dashboard, dresses, reservations, …
app/s/[subdomain]/(public)/…          ← /, /browse, /locations
app/s/[subdomain]/(customer-portal)/… ← /my-account
app/s/[subdomain]/(auth)/…            ← sign-in, sign-up, reset, …
app/api/…                             ← unchanged, NOT rewritten
```

The rewrite is transparent, so `Link href`s and the registry's `pathPrefixes` keep using public paths
(`/dashboard`, not `/s/alaa/dashboard`).

**Host parsing** — `src/features/core/tenancy/lib/host.ts`, pure and unit-testable. New env
`NEXT_PUBLIC_ROOT_DOMAIN` plus `rootDomain`/`protocol` helpers. Exact root match → apex;
`<label>.${ROOT_DOMAIN}` → tenant slug; no match → `tenants.customDomain` lookup. **Vercel preview
URLs use `---` in place of a dot** — the detail most often missed when porting the kit. Dev:
`alaa.localhost:3000` works natively in Chrome/Firefox (Safari needs a hosts entry). One exported
`RESERVED_SLUGS` constant used by *both* host parsing and signup validation — two lists will diverge.

**Caching** — proxy declares `runtime: "nodejs"`; Redis fronts the Postgres lookup:
`tenant:host:<host>` → `{id, slug, status}`, 300s TTL, **with negative caching** (60s) so random
subdomain traffic can't become a DB DoS.

**Into tRPC** — one shared resolver, `src/features/core/tenancy/server/resolve.ts`
→ `requireTenantFromHost(host)`, called independently by the proxy, by `createTRPCContext` (from
`(await headers()).get("host")`), and by server components via a `React.cache`-wrapped
`getCurrentTenant()`. **Strip any inbound `x-tenant-id`/`x-tenant-slug`.**

## §H The session schema does not change

Do **not** add `tenantId` to `sessionSchema` — `getUserSessionById` does `safeParse` and returns null
on failure, so a schema change logs the entire user base out.

The host is authoritative for *which tenant*. The session is authoritative for *who*. The membership
row is authoritative for *what role*. A tenant id in the session is a third source of truth that can
disagree with the host, and every disagreement is a latent security bug.

Cost: one membership lookup per request, cached at `t:<tid>:member:<uid>`, 60s TTL. Benefit: no mass
logout, no transition window, no reconciliation logic.

**Rule for `CLAUDE.md`:** any future addition to `sessionSchema` must be `.optional()`.

## §I Procedure ladder — `src/integrations/trpc/procedures.ts`

| Procedure | Composition | Guarantees |
|---|---|---|
| `baseProcedure` | dbError | unchanged; **restrict to `i18n.*` only** |
| `publicTenantProcedure` | + tenant | `ctx.tenant` non-null and active — public catalog |
| `tenantProcedure` | + auth + membership | `ctx.tenant`, `ctx.actor {id, role, status}` |
| `staffProcedure` | role ∈ owner/admin/employee | replaces `assertOperationalStaff` |
| `adminProcedure` | role ∈ owner/admin | replaces the 8 `assertAdminRole` copies |
| `ownerProcedure` | role = owner | tenant settings, member removal |
| `platformProcedure` | `platformRole` ∈ support/superadmin | **no tenant**; only cross-tenant surface |

`tenantMiddleware` before `membershipMiddleware`; `dbErrorMiddleware` outermost so tenant-lookup
failures still map. Suspended tenants reject with a distinct code so the UI can show a billing page
rather than a generic 403.

## §J Authorization refactor

**Lead with a compiler sweep, not with edits.** Make `tenantId: string` a **required, non-optional**
property of every `buildWhere` argument type in `src/features/system/*/server/filters.ts`, then run
`npm run typecheck`. The compiler enumerates every call site that hasn't been updated. This converts
"find all the places needing a tenant filter" from archaeology into an error list that goes to zero.
Same trick for `uploadImage(…)` and `formatCurrency({currency, locale})` — required, never defaulted;
a default guarantees half the call sites silently keep the old behaviour.

**Reframe the admin short-circuit rather than deleting it.** `resolveListBranchId` returns `undefined`
for admins, producing a query with no branch predicate. Under tenancy that is *correct* (an owner
should see all their branches) **provided a tenant predicate is unconditionally present**. Replace
with `resolveBranchScope(ctx, inputBranchId?) → { tenantId, branchId? }` where `tenantId` is always
`ctx.tenant.id` and always applied.

`assertDressIdsAccessible`/`assertReservationIdsAccessible` become *simpler and stricter*: always run
the query with `WHERE id IN (…) AND tenantId = ctx.tenant.id`, and let the existing
`rows.length !== ids.length` check cover both the tenant boundary and existence.

**`userCanViewAllBranches` must die.** It decides all-branch access by
`count(branches) === count(memberships)`. Under tenancy `count(branches)` becomes a cross-tenant
count and the heuristic **fails silently rather than throwing**. Replace with an explicit rule:
`role ∈ {owner, admin}` ⇒ all branches in the tenant; employees ⇒ their memberships.

**Platform admin rule:** platform access changes which tenant `ctx.tenant` points at; it **never**
removes the tenant predicate. A support admin picks a tenant from the apex console, which writes a
`tenant_access_audit` row and issues a short-TTL Redis grant (`impersonate:<sessionId>`).
`tenantMiddleware` consults it when the user has no membership. Every downstream query then behaves
identically to a normal tenant admin's — which is what makes the isolation test meaningful.

**`users.role` is deprecated in place, not deleted.** It still drives `permissions.ts` and the
proxy's screen RBAC; removing it would be a fourth concurrent refactor.

## §K Safety net

**Primary: a router-enumerating cross-tenant isolation test.** `appRouter._def.procedures` is an
enumerable map of every procedure path. One test file that:

1. Seeds the `two-tenant` profile — two tenants with structurally *identical* data (same branch short
   codes, dress codes, customer phones). Identical data proves the composite uniques work *and* turns
   any leak into a wrong-tenant row rather than an empty result.
2. Builds a caller via `createCallerFactory` with tenant A's context and asserts, for every `query`,
   that no returned row carries any of tenant B's ids (a deep UUID scan is crude and effective).
3. For every `mutation` taking an id, passes a **tenant B id** and asserts `NOT_FOUND`/`FORBIDDEN` —
   never success, never a 500.
4. **Fails on unknown procedures**, via an explicit allowlist file. This is what stops the mechanism
   rotting after two sprints.

Rejected: a tenant-bound `db` proxy can't be made sound against Drizzle's builder API without
reimplementing it, and a leaky guard manufactures false confidence. A lint rule catches only syntax;
the real bug is semantic, and the required-parameter trick covers it better for free.

Secondary, cheap: a CI grep failing if `ctx.db` appears outside `src/features/*/server/**` or
`src/drizzle/**`.

**RLS seam (P7):** identical `tenantId uuid NOT NULL` on all nine tables → one policy template;
`ctx.db` stays the only DB handle. Later, wrap each request in a transaction issuing
`select set_config('app.tenant_id', $1, true)` and hand `tx` to the context as `ctx.db`. Two
prerequisites to bank now: the app must connect as a non-owner role (or use `FORCE ROW LEVEL
SECURITY`), and per-request transactions interact with Neon's pooler.

## §L Subdomain fallout

**WebAuthn** — passkeys are disposable, so this is a design choice not a crisis. Derive RP ID from
the request host's registrable suffix (`ROOT_DOMAIN` for `*.ROOT_DOMAIN` and apex; the custom domain
itself for custom domains), replacing the global `env.BASE_URL` derivation. `expectedOrigin` becomes
an array validated against `^https://[a-z0-9-]+\.${ROOT_DOMAIN}$` plus the apex (simplewebauthn v13
accepts `string[]`). `rpName` reads `tenant.nameEn`.

**OAuth** — Google rejects wildcard redirect URIs, and `base.ts` stores `state`/`codeVerifier` in
cookies unreadable on another host. Design: fixed apex callback + Redis-carried state + one-time
handoff. (1) Sign-in on `<slug>.domain.com` writes `oauth:req:<opaqueId>` →
`{state, codeVerifier, tenantSlug, redirectTo}`, 10 min TTL; redirects with `state=<opaqueId>` and a
single permanently registered `redirect_uri`. (2) Apex callback looks up Redis by `state`, takes the
verifier from there rather than a cookie, exchanges the code, resolves the global user. (3) Writes
`oauth:handoff:<code>` (60s, **single-use, deleted on read**), 302s to
`https://<slug>.domain.com/oauth/complete?code=…`, which checks membership and sets the session cookie
**on the tenant host**.

**Cookies: host-only.** Do not add a `domain` attribute. A shared `.domain.com` cookie means one
session id is presented to every tenant subdomain — a bug in `tenantMiddleware` becomes cross-tenant
access, and XSS on one tenant becomes platform-wide. Host-only means the browser enforces the
boundary for free. Cost: a user in two tenants signs in twice. Correct trade.

**Vercel** — wildcard `*.domain.com` (auto TLS; needs NS at Vercel or DNS-01) + apex + `www` redirect.
Custom domains are **not** covered by the wildcard cert; each needs individual registration. Support
exactly one (tenant #1's current host, so links and SEO survive), added manually. `BASE_URL` becomes
the apex/platform URL only, and every other use must be audited.

## §M Firebase path scheme

```
atelier/{tenantId}/users/{userPhone}.{ext}          ← profile images
atelier/{tenantId}/{branchId}/{dressCode}-{n}.{ext} ← dress images
```

Replacing the current flat `${folder}/${Date.now()}-${uuid}${ext}`. Consequences of deterministic
names, all of which need handling:

- **Deterministic names collide, and a collision destroys the previous image.** Before writing to a
  key that already exists, the UI must **ask the user to confirm that the existing image will be
  replaced** — naming the dress code or phone number in the prompt, and showing the existing image
  next to the new one where practical. Never silently overwrite. Mechanically: a
  `checkImageExists(path)` call before upload, a confirm dialog on a hit, and an explicit
  `overwrite: true` flag on the upload mutation that the server requires when the key is occupied.
  A missing flag on an occupied key is a `CONFLICT`, not an overwrite.
- **Re-upload overwrites in place**, so the public URL never changes and browsers/CDN serve the stale
  image. Add an `updatedAt`-derived `?v=` param, or set a short cache TTL on the bucket. Pick one
  deliberately — this is the likeliest "why is the old photo still showing" bug.
- **Dresses have multiple images**, hence the `-{n}` leaf. Decide the renumber rule when an image is
  deleted from the middle — and note that renumbering is itself an overwrite, so it must not trigger
  the confirm prompt for images the user did not choose to replace.
- **Moving a dress between branches must move its objects** — copy, verify, then delete. Renaming a
  dress code or a user's phone has the same effect.
- `userPhone` and `dressCode` must be sanitized for object keys.
- `uploadImage`/`deleteImage` take `tenantId` as a **required** parameter; the prefix is derived from
  the procedure, never caller-supplied (a caller-supplied `../` is traversal into another tenant's
  prefix). `deleteImage` verifies the `atelier/{tenantId}/` prefix.
- **Do not migrate legacy objects** under `uploads/`/`reservations/` — URLs are stored in rows and
  public. Accept legacy prefixes on read for tenant #1 only; new writes use the new scheme.
- Objects stay `public: true`: isolation is by URL obscurity, not ACL. Signed URLs are a separate
  project.

## §N Other integrations

- **Redis** — sessions stay `session:<id>` (identity-level). Everything else gets a `t:<tenantId>:`
  prefix via a `tenantKey()` helper so it's never hand-concatenated.
- **Cache tags** — a **security** issue, not performance. Over-invalidating is merely slow; a
  `cacheTag`/`unstable_cache` whose *key* omits the tenant will serve one tenant's payload to
  another. Replace `getGlobalTag` with `getTenantTag(tag, tenantId)`; give `revalidateAuthCache` a
  tenant parameter.
- **Inngest** — app id becomes `gateling-atelier`. The id correctly stays global; add a required
  `tenantId` to every event payload and to `step.run` idempotency keys. One function exists today, so
  this is ~20 minutes now versus a multi-day retrofit in a year.
- **Email** — keep **one** SMTP account; pass `fromName: tenant.nameEn` and `replyTo` per call
  (`SendMailOptions` already supports the override). Per-tenant SMTP credentials are an
  SPF/DKIM/DMARC deliverability project disguised as a feature. Also `SMTP_USER` is declared in the
  env schema and never read — auth uses `SMTP_FROM_EMAIL`.
- **WhatsApp** — remove `WAPILOT_INSTANCE_ID`/`WAPILOT_API_TOKEN` from `src/env/server.ts` entirely;
  config moves into the tenant's `settings` rows alongside the existing `WHATSAPP_NUMBER` code.
  **This requires secret handling first** — `settings.value` is plain `text`, so as-is the token
  would be readable by anyone with settings read access and would appear in CSV exports and backups
  in the clear. Moving it out of env without the following is a net security regression.

  **Write-once secret model:**
  - Add an `isSecret` boolean to `settings`. Encrypt `value` at rest for secret rows, with a key
    **separate** from `JWT_SECRET_KEY`.
  - **Once saved, the plaintext is never viewable again — by anyone, including the owner.** The
    server never decrypts a secret in response to a read; decryption happens only at the point of
    use (the outbound Wapilot call). Reads return a mask plus metadata only: `isSet`, `updatedAt`,
    `updatedBy`, and at most a last-4 hint.
  - **Only `ownerProcedure` may write a secret** (see §I). Admins can see that a value is configured;
    they cannot set, replace, or read it.
  - Replacement is the only edit path: the owner types a new value, which overwrites. There is no
    "reveal" affordance to build, so there is no reveal endpoint to get wrong.
  - Excluded from CSV export and from every tRPC response payload.

## §O Branding and config

**The rule:** if it's needed to render the shell before user data loads, or it changes how values are
*formatted*, it's a `tenants` column. If an admin toggles it in Settings and it changes *behaviour*,
it's a `settings` row (now `unique(tenantId, code)`).

**One conflict:** `BUSINESS_TIMEZONE` would exist in both. Make `tenants.timezone` authoritative and
have `system-settings-registry.ts` read/write through to it, leaving the Settings UI unchanged. Two
sources of truth for timezone will cause a bug.

**`appName`** becomes the *platform* name (Gateling Atelier), used only on the apex. A `TenantProvider`
populated in `app/s/[subdomain]/layout.tsx` feeds the five consumers (`app-shell-layout`,
`auth-page-placeholder`, `customer-portal-shell`, `public-shell`,
`reservation-receipt-sections`). Add `generateMetadata()` for per-tenant title/description/icons/OG.

**`src/lib/format.ts`** hardcodes `currency: "EGP"` and locale `"en-EG"` — make both required params.

**`src/lib/phone.ts`** is Egypt-specific and mirrored by the SQL function. **Do not internationalize
it** — changing normalization changes the generated column's expression, which rebuilds a unique
index on a populated table. Add `tenants.defaultCountry` as the seam and document Egypt-only.

**Registry** — `entities.ts`'s `branchScope: "global" | "branch-aware" | "future-branch-aware"` is now
wrong: `branches`/`settings` are `"global"` but under tenancy mean *tenant*-global. Rename to
`scope: "tenant" | "branch"` and drop `"future-branch-aware"` (a TODO encoded in a type).

## §P Onboarding

**Two flows on two hosts** — conflating them is the mistake to avoid.

**Tenant signup, apex only** (`domain.com/get-started`). One transaction: validate slug against
`^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])$` + `RESERVED_SLUGS` (handle the race by catching the unique
violation, not check-then-insert) → create-or-reuse the global user → insert tenant → membership with
`role='owner'` → first branch (`MAIN`) + branch membership `isCurrent` → seed default settings → warm
the Redis host key → redirect to the tenant host via the §L handoff (the session must be created on
the tenant host). Create the tenant immediately as `status='trial'` and gate on verification later —
abandoning at verification with no tenant is a worse funnel than a few dead trial rows.

**Customer self-signup, tenant subdomain** (existing `/sign-up`). Keeps `role: "customer"` and
additionally inserts a `tenant_memberships` row. **Security detail:** if the email already exists
globally, do *not* create a second user — attach a membership to the existing identity, but only
after password verification. Otherwise "sign up" becomes an account-takeover primitive: register with
a victim's email at your own tenant and you'd get a membership on their identity.

---

# Part 3 — Build steps

Branch naming: `feat/mt-NN-<slug>`. PR title: `mt-NN: <title>`.

---

## Phase P0 — Verification and free wins *(fully reversible, no schema change)*

### Step 01 — Migration safety gate and backup

**Depends on:** none

**Prompt:**
```
Read docs/multi-tenant/PLAN.md. Execute Step 01.

Do NOT change src/drizzle/schema.ts or add migrations in this step. This is a verification
and guard-rail step only.

1. On a clean tree run `npm run db:generate`. It MUST report no schema changes. If it emits
   any SQL, STOP and report — the head snapshot is stale and every later step is unsafe.
2. Run `drizzle-kit introspect` against production into a scratch directory (NOT
   src/drizzle/migrations) and diff the result against src/drizzle/schema.ts. Migrations
   0003-0008 were hand-written, so this is where a hand-edit that never reached schema.ts
   shows up. Report every difference; do not silently reconcile.
3. Spin up a fresh local Postgres (`npm run db:reset`) and run `npm run db:migrate`. All 14
   migrations must apply green. This proves 0009-as-no-op is inert and that
   rental_customer_phone_key() exists.
4. Add a `db:push` tripwire: a script that refuses to run when the resolved DATABASE_URL host
   matches the production host. Wire it into the db:push npm script. See the env-precedence
   comment in src/drizzle/seed/cli.ts for prior art on why this matters.
5. Write docs/multi-tenant/STEP-01-REPORT.md recording all four results.

Do NOT fabricate the missing meta snapshots for 0003-0008 — that corrupts prevId chaining.
```

**Acceptance:** `db:generate` reports no changes · introspect diff is clean or every difference is
documented · `db:migrate` green from zero · `db:push` refuses against prod · report committed.

**Review focus:** confirm the tripwire actually fires (test it) · confirm no snapshot files were
added or edited.

---

### Step 02 — Close the unauthenticated upload hole

**Depends on:** none *(can run parallel to 01)*

**Prompt:**
```
Read docs/multi-tenant/PLAN.md. Execute Step 02.

This is a live security fix, independent of multi-tenancy.

1. `uploadImage` in src/integrations/trpc/routers/_app.ts is exposed on `baseProcedure` —
   anyone on the internet can write unlimited public objects into the Firebase bucket
   unauthenticated. Move it to `protectedProcedure`.
2. `deleteImage` in src/integrations/firebase/storage.ts only validates that the URL starts
   with the bucket prefix, so any known URL can be deleted by any caller. Add ownership
   validation appropriate to the current single-tenant model (Step 24 will make it
   tenant-scoped).
3. Verify the two existing callers still work: src/components/forms/image-field.tsx and
   src/features/system/dresses/admin/components/dress-images-field.tsx.
```

**Acceptance:** unauthenticated `uploadImage` call returns UNAUTHORIZED · both upload UIs still work ·
`typecheck && build` green.

**Review focus:** no other `baseProcedure` mutation writes data — audit `_app.ts` while here.

---

### Step 03 — Rename `funtastic` → `gateling-atelier`

**Depends on:** none

**Prompt:**
```
Read docs/multi-tenant/PLAN.md. Execute Step 03.

The app name is Gateling Atelier. Replace the stale `funtastic` / `Funtastic` brand:
1. src/integrations/inngest/client.ts — `new Inngest({ id: "funtastic" })` → "gateling-atelier".
2. docs/scaling-guide.md and any other docs referencing "Funtastic".
3. Grep the whole repo for both spellings and report anything you did not change, with a reason.

Note: changing the Inngest app id creates a new app in the Inngest dashboard. Flag this in the
PR description so it is a conscious deploy-time decision, and check whether any in-flight
events would be orphaned (there is currently only one demo function, `processTask`).
```

**Acceptance:** no `funtastic` occurrences remain except deliberately-noted ones · PR description
flags the Inngest app-id consequence.

---

### Step 04 — Break the `auth/` barrel import cycle

**Depends on:** none

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, section §F. Execute Step 04.

src/drizzle/schemas/auth/{users-table,branches-table,branch-memberships-table}.ts import each
other through the folder barrel (`from "."`). This works today only because Drizzle's
`references(() => ...)` is a lazy callback, and it is fragile. Step 05 adds a new table that
must not join this cycle.

Convert those three files to direct-path imports (e.g.
`@/drizzle/schemas/auth/users-table`), matching the convention already used in
src/drizzle/schemas/system/ (see rental-customers-table.ts). Do not change any table
definition, column, or relation — imports only.
```

**Acceptance:** no table file in `schemas/auth/` imports from `"."` or `"./"` · `typecheck && build`
green · `npm run db:generate` still reports **no schema changes** (proof nothing semantic moved).

**Review focus:** the `db:generate` no-op is the real assertion here — insist on seeing it.

---

### Step 05 — Two-tenant seed profile skeleton

**Depends on:** none *(schema lands in 06; this step only prepares the shape)*

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, section §K. Execute Step 05.

Restructure src/drizzle/seed/ so that seeding is parameterised by tenant, ahead of the schema
landing:
1. Extract the per-tenant data creation in core.ts into a function taking a tenant descriptor.
2. Add a `two-tenant` profile stub under profiles/ that will create TWO tenants with
   structurally IDENTICAL data — same branch short codes, same dress codes, same customer
   phones. Identical data is the point: it proves the composite uniques work and turns any
   isolation leak into a wrong-tenant row rather than an empty result.
3. Leave the tenant id threading as a TODO where the column does not exist yet; the profile
   need not run successfully until Step 08.
4. Do not change existing profile behaviour (baseline, demo, performance, settings).
```

**Acceptance:** existing seed profiles behave identically · `two-tenant` profile is registered and
documented · `typecheck` green.

---

## Phase P1 — Schema and backfill

### Step 06 — Tenancy tables, additive and nullable *(migration 0014)*

**Depends on:** 01, 04

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, sections §A, §B, §C, §F. Execute Step 06.

Create src/drizzle/schemas/tenancy/ with tenants, tenant_memberships, and tenant_access_audit
exactly as specified in §A, obeying every rule in §F (tenants-table.ts imports nothing;
direct-path imports only; cycle-forming relations() in tenancy/relations.ts). Add
`export * from "@/drizzle/schemas/tenancy"` as the FIRST line of src/drizzle/schema.ts.

Add `platformRole` to users per §A.

Add `tenantId uuid` — NULLABLE, NO foreign key — to the nine tables in §C. FKs are
deliberately deferred to Step 08 so the backfill need not respect insert order.

Do NOT add tenantId to users or to any identity-level table (§B explains why this is forced by
the existing user_oauth_accounts primary key).

Then run `npm run db:generate` and commit the generated 0014 SQL together with its meta/
snapshot and _journal.json update. Do not hand-edit the generated SQL.

This migration must be a no-op for application behaviour: nothing dropped, nothing tightened.
```

**Acceptance:** 0014 SQL + snapshot + journal committed together · migration applies clean on a fresh
DB *and* on a prod-restored Neon branch · app behaviour unchanged · `typecheck && build` green.

**Review focus:** every added column is nullable · no FK constraints in 0014 · no unique constraint
touched · `tenants-table.ts` has zero imports.

---

### Step 07 — Backfill tenant #1 *(migration 0015 — POINT OF NO RETURN begins)*

**Depends on:** 06

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, section §A and the Migration strategy notes in Step 06/08.
Execute Step 07.

Generate an empty custom migration:
  drizzle-kit generate --custom --name=backfill_tenant_alaa
This emits an empty .sql plus a journal entry plus a snapshot copy, keeping the chain intact —
the same approach migration 0011 used. Hand-write the SQL body (permitted: this is a data
migration). Model the file's style on 0011: header comment explaining intent, statements
separated by `--> statement-breakpoint`.

Contents:
1. INSERT INTO tenants with a LITERAL deterministic UUID ...0001 (not gen_random_uuid()) —
   every later statement, rollback script and debugging session needs to name it. Set
   customDomain to the current production hostname.
2. Nine UPDATE ... SET "tenantId" = '...0001' WHERE "tenantId" IS NULL statements.
3. INSERT INTO tenant_memberships from users, mapping users.role -> tenant_role. Then one
   explicit UPDATE ... SET role='owner' selecting the owner BY EMAIL — ask which email before
   writing it; do not guess, and do not use "first admin". Include soft-deleted users as
   status='suspended' so undeleting cannot orphan.
4. TRUNCATE biometric_credentials (passkeys are disposable; this removes the RP-ID migration
   problem entirely — see §L).
5. Seed tenant #1's WhatsApp settings rows from the current WAPILOT_* env values. Step 27
   deletes the env vars.
6. An assertion block PER TABLE at the end:
   DO $$ BEGIN IF EXISTS (SELECT 1 FROM dresses WHERE "tenantId" IS NULL)
     THEN RAISE EXCEPTION 'backfill incomplete: dresses'; END IF; END $$;
   Drizzle runs the batch in one transaction — that is what saved the project during the 0009
   incident — so a raised exception rolls everything back cleanly.

BEFORE this PR is merged, also run the duplicate-detection query from migration 0011 against
production and report the result. Step 08's (tenantId, phoneKey) unique is STRICTER than
today's raw-phone unique; if that query returns rows, a merge block must be added to this
migration. Do not let Step 08 be where this is discovered.
```

**Acceptance:** rehearsed ≥3× on a Neon branch restored fresh from prod each time · all assertion
blocks pass · row counts identical before and after · dedup query result reported · rollback
(`DROP COLUMN` + `DROP TABLE`) verified to work.

**Review focus:** the owner email is confirmed by a human, not inferred · the tenant UUID is a literal
· soft-deleted users are handled · the dedup query result is in the PR description.

---

### Step 08 — Tighten and swap constraints *(migration 0016 — POINT OF NO RETURN)*

**Depends on:** 07

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, sections §C, §D, §E. Execute Step 08.

Edit src/drizzle/schema.ts to the final state, then `npm run db:generate`:
1. tenantId -> NOT NULL on all nine tables.
2. Single-column FKs to tenants.id, PLUS every composite FK in §D (this is what prevents a
   dress whose tenantId disagrees with its branch's).
3. The rental_customers phoneKey stored generated column and its (tenantId, phoneKey) unique
   per §E.
4. Drop the five global uniques and create their composite replacements per §E. Keep
   users_email_unique and users_phone_unique GLOBAL.
5. (tenantId) indexes on all nine, and (tenantId, branchId) replacing the old single-column
   branch indexes.

Do NOT use CREATE UNIQUE INDEX CONCURRENTLY — it cannot run inside a transaction, which would
forfeit drizzle's all-or-nothing rollback. That matters far more than a sub-second lock at this
data volume.

Read the generated SQL by eye before applying, especially the phoneKey column: it depends on
the rental_customer_phone_key() function created in 0011, and generator ordering is the one
place here likely to need correcting. If you must edit the generated SQL, document the
exception in a header comment the way 0009 does, and say so explicitly in the PR.

Also: reservationCode is generated per-branch-per-day and embeds the branch short code
(src/features/system/reservations/server/mutations.ts). Now that short codes are only
tenant-unique, add a tenant predicate to both the counter query and
ensureUniqueActiveReservationCode.
```

**Acceptance:** rehearsed ≥3× on a prod-restored branch · every composite FK present · a deliberately
mismatched `(tenantId, branchId)` insert is rejected by the DB · reservation code generation still
produces unique codes · `typecheck && build` green.

**Review focus:** **this is the point of no return — confirm a tested backup exists before merge** ·
whether the generated SQL was hand-edited and why · `users_email_unique`/`users_phone_unique` are
untouched.

---

### Step 09 — Tenant-aware seeds

**Depends on:** 08, 05

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, section §K. Execute Step 09.

Complete the seed work started in Step 05 now that the schema exists:
1. core.ts creates a tenant first; every profile takes a tenantId.
2. Make the `two-tenant` profile actually run: two tenants, structurally IDENTICAL data (same
   branch short codes, same dress codes, same customer phones). If it fails, the composite
   uniques from Step 08 are wrong — that is a real finding, report it rather than working
   around it.
3. clear-db.ts handles the new tables in FK-safe order.
```

**Acceptance:** all profiles run green against a fresh DB · `two-tenant` produces two fully populated
tenants with colliding natural keys · `clear-db` leaves no orphans.

---

## Phase P2 — Tenant resolution and context *(additive; still one tenant)*

### Step 10 — Host parsing and reserved slugs

**Depends on:** 08

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, section §G. Execute Step 10.

Create src/features/core/tenancy/lib/host.ts — pure, no I/O, fully unit-tested:
  resolveTenantHost(host) -> {kind: "tenant"|"custom"|"apex"|"reserved"|"unknown", ...}
Model it on the Vercel Platforms kit's extractSubdomain.

- Add NEXT_PUBLIC_ROOT_DOMAIN to the env schema, plus rootDomain/protocol helpers.
- Handle all three environments: *.localhost:3000 in dev, Vercel preview URLs (which use `---`
  in place of a dot — this is the detail most often missed when porting the kit), and
  production.
- Export ONE RESERVED_SLUGS constant, used later by BOTH host parsing and signup validation.
  Two separate lists will diverge. Include: www, app, api, admin, auth, mail, cdn, static,
  status, docs, blog, help, support, billing, dev, staging, preview, test, s — plus every
  current top-level route segment.

Unit tests are the deliverable here as much as the code. Cover apex, tenant, reserved, custom,
unknown, port suffixes, trailing dots, uppercase hosts, and the `---` preview form.
```

**Acceptance:** unit tests cover all listed cases · no I/O in the module · `RESERVED_SLUGS` exported
once.

---

### Step 11 — Tenant resolver with Redis cache

**Depends on:** 10

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, section §G. Execute Step 11.

Create src/features/core/tenancy/server/resolve.ts exporting
  requireTenantFromHost(host): Promise<TenantContext>

- Redis read-through cache: `tenant:host:<host>` -> {id, slug, status}, 300s TTL.
- NEGATIVE caching (60s) for unknown hosts, so random subdomain traffic cannot become a DB
  DoS. This is not optional.
- Invalidation on tenant create/rename/suspend; the short TTL means a missed invalidation
  self-heals.
- Add a React.cache-wrapped getCurrentTenant() for server components.

Nothing consumes this yet — that is Steps 12 and 17.
```

**Acceptance:** cache hit/miss/negative-hit all covered by tests · invalidation helper exists ·
unknown host does not hit Postgres twice in a row.

---

### Step 12 — Tenant in the tRPC context

**Depends on:** 11

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, sections §G and §H. Execute Step 12.

Add `tenant` to createTRPCContext in src/integrations/trpc/init.ts, resolved from
`(await headers()).get("host")` via requireTenantFromHost. It is null on the apex.

Resolve it here INDEPENDENTLY — do not expect a header from the proxy. src/proxy.ts's matcher
excludes /api, so it never runs for tRPC; and an inbound x-tenant-id would be
attacker-controlled anyway. Explicitly ignore/strip any inbound x-tenant-id or x-tenant-slug.

Do NOT change sessionSchema. §H explains why: getUserSessionById does safeParse and returns
null on failure, so adding a field logs the entire user base out — and a tenant id in the
session would be a third source of truth that can disagree with the host.

Add to CLAUDE.md: any future addition to sessionSchema must be .optional().
```

**Acceptance:** `ctx.tenant` populated on a tenant host, null on apex · `sessionSchema` unchanged ·
inbound `x-tenant-id` provably ignored (test it) · existing procedures still work.

**Review focus:** no header-passing shortcut from the proxy · the `CLAUDE.md` note landed.

---

### Step 13 — The procedure ladder

**Depends on:** 12

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, section §I. Execute Step 13.

Create src/integrations/trpc/procedures.ts with the full ladder in §I: publicTenantProcedure,
tenantProcedure, staffProcedure, adminProcedure, ownerProcedure, platformProcedure.

- tenantMiddleware runs BEFORE membershipMiddleware.
- dbErrorMiddleware stays outermost so tenant-lookup DB failures still map correctly.
- Suspended tenants reject with a DISTINCT error code so the UI can show a billing/suspension
  page rather than a generic 403.
- Membership lookups cached at `t:<tid>:member:<uid>`, 60s TTL, explicitly invalidated on
  membership mutation.
- Keep init.ts small: baseProcedure and protectedProcedure stay there.

ADD ONLY. Do not migrate any router to the new procedures in this step — that is Phase P3, one
domain per PR. Nothing should break.
```

**Acceptance:** ladder compiles and is unit-tested against fake contexts · no existing router changed
· `typecheck && build` green.

---

### Step 14 — TenantProvider and tenant-aware shell

**Depends on:** 12

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, section §O. Execute Step 14.

Add a TenantProvider React context fed by getCurrentTenant(). Wire the five appName consumers
to read the tenant name (locale-selected between nameEn/nameAr) instead of the i18n constant:
app-shell-layout, auth-page-placeholder, customer-portal-shell, public-shell,
reservation-receipt-sections.

The i18n `appName` key becomes the PLATFORM name (Gateling Atelier), used only on apex
surfaces. Keep both en.ts and ar.ts in sync.

With only one tenant this is behaviour-neutral, which is the point — it should look identical
in the running app.
```

**Acceptance:** UI is visually identical for tenant #1 · no component reads `t("appName")` for tenant
identity · EN and AR both updated.

---

## Phase P3 — Authorization refactor *(the risky phase)*

### Step 15 — Compiler sweep: make `tenantId` a required filter parameter

**Depends on:** 13

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, section §J. Execute Step 15.

Do this BEFORE any other P3 work. Change every buildWhere in
src/features/system/*/server/filters.ts so its argument type has `tenantId: string` as a
REQUIRED, non-optional property. Then run `npm run typecheck`.

The compiler now enumerates every call site that has not been updated. That error list IS the
work plan for Steps 16-19 — it converts "find all the places needing a tenant filter" from
archaeology into a list that goes to zero.

In THIS step, only: change the types, apply the tenantId predicate inside each buildWhere, and
commit the resulting error list to docs/multi-tenant/STEP-15-ERRORS.md. Do not fix the call
sites yet — that is the per-domain steps. It is expected and acceptable that typecheck FAILS at
the end of this PR; say so in the PR description and note that CI will be red until Step 19.

If red CI on a merged branch is unacceptable to your workflow, do this step on a long-lived
integration branch that Steps 16-19 merge into, and merge to main only after Step 19.
```

**Acceptance:** every `buildWhere` argument type requires `tenantId` · the error list is committed ·
the branching strategy (red CI vs integration branch) is stated explicitly in the PR.

---

### Step 16 — Rewrite `staff-access.ts`

**Depends on:** 15

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, section §J. Execute Step 16.

Rewrite src/features/system/shared/staff-access.ts:

1. Replace resolveListBranchId with
     resolveBranchScope(ctx, inputBranchId?) -> { tenantId, branchId? }
   where tenantId is ALWAYS ctx.tenant.id and always applied. Do NOT try to remove the
   `role === "admin"` early return: under tenancy, an owner seeing all their branches is
   correct. The bug was the empty WHERE clause, not the short-circuit — and the WHERE clause
   is now never empty.

2. Rewrite assertDressIdsAccessible / assertReservationIdsAccessible to ALWAYS run their query
   with `WHERE id IN (...) AND tenantId = ctx.tenant.id`, deleting the admin no-op entirely.
   The existing `rows.length !== ids.length` check then covers both the tenant boundary and
   existence. This is simpler than the current code as well as stricter.

3. Replace assertOperationalStaff usage with the staffProcedure from Step 13 where the call
   site is a procedure entry point.

~98 call sites depend on this module's signatures. Let the typechecker drive; do not
hand-search.
```

**Acceptance:** no code path can produce a query without a tenant predicate · an admin of tenant A
cannot read tenant B's dress by id · error list from Step 15 shrinks measurably.

**Review focus:** read every remaining `role === "admin"` in the file and confirm a tenant predicate
is applied on that path.

---

### Step 17 — Rewrite `branch.ts` active-branch machinery

**Depends on:** 16

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, section §J. Execute Step 17.

src/features/core/auth/nextjs/actions/branch.ts (513 lines) decides all-branch access via
`count(branches) === count(memberships for user)`. Under tenancy count(branches) becomes a
cross-tenant count, so the heuristic FAILS SILENTLY rather than throwing — sometimes granting
an employee all-branch access, sometimes demanding an active branch from an owner.

1. Delete userCanViewAllBranches. Replace with an explicit rule: role in {owner, admin} => all
   branches in the tenant; employee => their memberships. No counting.
2. Tenant-bound every query in the file: getBranches, ensureActiveBranchWhenRequired,
   setActiveBranchForUserAction, clearActiveBranchForUserAction.
3. The "auto-insert a membership for admins who aren't members" behaviour must now be
   tenant-bounded.

This is a rewrite, not a find-and-replace. Read the whole file first.
```

**Acceptance:** an employee of tenant A never sees a tenant B branch · owner/admin see all their own
branches · active-branch switching works · no `count()`-based authorization remains.

---

### Step 18 — Migrate routers to the ladder, one domain per PR

**Depends on:** 16

> Repeat this step **ten times**, once per domain: `branches`, `dashboard`, `dresses`, `expenses`,
> `payments`, `rental-customers`, `reservations`, `settings`, `users`, `customer-portal`.
> Branch `feat/mt-18-<domain>`. **Do not batch them** — a mistake in a shared file is invisible in a
> 24-file diff.

**Prompt:** *(substitute the domain)*
```
Read docs/multi-tenant/PLAN.md, sections §I and §J. Execute Step 18 for the DOMAIN domain only.

1. In src/features/system/DOMAIN/server/router.ts, swap protectedProcedure for the correct
   rung: staffProcedure or adminProcedure per §I.
2. Narrow each query/mutation function's ctx parameter from TRPCContext to the narrowed staff
   context type. The typechecker will now flag every getRequiredSession(ctx) call in this
   domain as returning a redundant value — delete them.
3. Fix every Step-15 typecheck error belonging to this domain by threading ctx.tenant.id into
   the filter object.
4. Delete src/features/system/DOMAIN/server/shared.ts. Its TRPCContext / ProtectedTRPCSession
   types move to one shared location (create src/features/system/shared/types.ts on the first
   domain; reuse it thereafter).

Touch no other domain. Report how many Step-15 errors remain.
```

**Acceptance (per domain):** domain's `shared.ts` deleted · no `getRequiredSession` remains in the
domain · every list query carries a tenant predicate · error count decreasing.

---

### Step 19 — Cross-tenant isolation test *(P3 exit criterion)*

**Depends on:** all ten Step 18 PRs, 17, 09

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, section §K. Execute Step 19.

Build the router-enumerating isolation test. appRouter._def.procedures is an enumerable map of
every procedure path in the app.

1. Seed the `two-tenant` profile from Step 09.
2. Build a caller via createCallerFactory with tenant A's context. For EVERY query procedure,
   assert no returned row carries any of tenant B's ids. A crude deep UUID scan is effective —
   do not over-engineer this.
3. For EVERY mutation taking an id, pass a TENANT B id and assert NOT_FOUND or FORBIDDEN.
   Never success. Never a 500 (a 500 usually means the query ran and something else broke —
   investigate any you find).
4. Maintain an explicit allowlist file of procedure paths the test knows how to exercise. Any
   procedure NOT in the list FAILS the suite with "new procedure X has no isolation coverage".
   This is what stops the mechanism rotting after two sprints — do not skip it.
5. Add a CI grep that fails if `ctx.db` appears outside src/features/*/server/** or
   src/drizzle/**.
6. Wire both into CI as required checks.

typecheck must be fully green by the end of this PR — the Step-15 error list reaches zero here.
```

**Acceptance:** every procedure is covered or explicitly allowlisted · suite is green · suite **fails**
when you deliberately remove one tenant predicate (prove this in the PR) · CI grep active ·
`typecheck && build` green.

**Review focus:** the deliberate-break demonstration is the whole point — do not accept this PR
without it.

---

## Phase P4 — Route move and subdomain fallout

### Step 20 — Move routes under `app/s/[subdomain]/`

**Depends on:** 19

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, section §G. Execute Step 20.

Restructure src/app per §G: tenant route groups move under app/s/[subdomain]/; a new apex
(marketing) group is created; app/api stays where it is and is NOT rewritten.

This is mostly a file move. The rewrite is transparent, so Link hrefs and the registry's
pathPrefixes keep using public paths (/dashboard, not /s/alaa/dashboard).

Two things to VERIFY rather than assume:
1. src/proxy.ts reads request.nextUrl.pathname BEFORE issuing its own rewrite, so the existing
   getProtectedScreenDefinitionByPathname(pathname) RBAC check should still see /dashboard.
   Prove this holds.
2. app/s/[subdomain]/layout.tsx resolves the tenant ONCE from params.subdomain and provides it
   downstream, so nothing below re-resolves.

Do not change the proxy's rewrite logic yet — that is Step 21. This PR is the move plus the
layout.
```

**Acceptance:** every existing route reachable at its unchanged public path · RBAC rewrite to
`/unauthorized` still works · no double tenant resolution per request.

---

### Step 21 — Proxy: subdomain detection and rewrite

**Depends on:** 20

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, sections §G and §L. Execute Step 21.

Update src/proxy.ts:
1. Declare runtime: "nodejs" in its config.
2. Resolve the tenant from the Host header via requireTenantFromHost (Step 11).
3. Rewrite <sub>.domain.com/path -> /s/<sub>/path. Keep /api excluded from the matcher — the
   rewrite would corrupt API routes, and tRPC resolves its own tenant.
4. Apex hosts serve the (marketing) group.
5. Unknown tenant -> 404. Suspended tenant -> a distinct suspension page, not a generic error.
6. Reserved subdomains handled per RESERVED_SLUGS.
7. Strip any inbound x-tenant-id / x-tenant-slug from the forwarded request.

Preserve the existing behaviour: session load, auth/public route classification,
getProtectedScreenDefinitionByPathname RBAC rewrite, and updateUserSessionExpiration.

Test manually with alaa.localhost:3000 AND the apex AND a Vercel preview URL (the `---` form).
```

**Acceptance:** tenant subdomain, apex, reserved label, unknown tenant, suspended tenant and preview
URL all behave correctly · `/api/trpc` unaffected · session expiry sliding still works.

---

### Step 22 — OAuth cross-host handoff

**Depends on:** 21

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, section §L. Execute Step 22.

Google does not accept wildcard redirect URIs, and src/features/core/auth/core/oauth/base.ts
stores state/codeVerifier in cookies that are unreadable on a different host (cookies are
host-only — see Step 23).

Implement the fixed-apex-callback + Redis-state + one-time-handoff design in §L exactly:
1. Sign-in on <slug>.domain.com writes oauth:req:<opaqueId> -> {state, codeVerifier,
   tenantSlug, redirectTo}, 10 min TTL. Redirect to Google with state=<opaqueId> and ONE
   permanently registered redirect_uri on the apex.
2. Apex callback looks up Redis by state, takes the verifier FROM REDIS not from a cookie,
   exchanges the code, resolves the global user.
3. Write oauth:handoff:<code>, 60s TTL, SINGLE-USE (deleted on read), bound to the tenant
   slug. 302 to https://<slug>.domain.com/oauth/complete?code=...
4. /oauth/complete (already exists) consumes the handoff, checks tenant membership, and
   creates the session cookie ON THE TENANT HOST.

Single-use, short TTL, and slug-binding are all required, not optional. Update the Google
console redirect URI as a documented deploy step.
```

**Acceptance:** Google sign-in completes on a tenant subdomain · replaying a handoff code fails ·
an expired `oauth:req` fails cleanly · state/verifier no longer in cookies.

**Review focus:** handoff is genuinely single-use (test the replay) · the handoff is bound to the
tenant, so it cannot be redeemed on another subdomain.

---

### Step 23 — Cookie scoping and WebAuthn RP ID

**Depends on:** 21

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, section §L. Execute Step 23.

1. COOKIES: confirm and document that setCookie in
   src/features/core/auth/core/session.ts sets NO domain attribute, so the session cookie is
   host-only. Do not "fix" this to share across subdomains — a shared .domain.com cookie means
   one session id is presented to every tenant subdomain, so a bug in tenantMiddleware becomes
   cross-tenant access and XSS on one tenant becomes platform-wide. Host-only makes the
   browser enforce the boundary for free. Add a comment at the definition site explaining
   this, so nobody "improves" it later.
   Note the locale cookie also becomes per-subdomain — acceptable, arguably correct.

2. WEBAUTHN: src/features/core/auth/nextjs/actions/passkey.ts derives getRpId() and
   EXPECTED_ORIGIN from a single global env.BASE_URL. Replace with derivation from the request
   host's registrable suffix: ROOT_DOMAIN for *.ROOT_DOMAIN and the apex; the custom domain
   itself for custom domains. expectedOrigin becomes an ARRAY validated against
   ^https://[a-z0-9-]+\.${ROOT_DOMAIN}$ plus the apex — simplewebauthn v13 accepts string[].
   Never trust a raw request origin without that regex. rpName reads the tenant name.

   Existing credentials were truncated in Step 07, so there is nothing to preserve.

3. Audit every other use of env.BASE_URL; it now means the apex/platform URL only.
```

**Acceptance:** a passkey enrolled on one subdomain is rejected on another · sessions do not bleed
between two subdomains in two browser profiles · every `BASE_URL` use audited and listed in the PR.

---

### Step 24 — Cache-tag tenant audit

**Depends on:** 21

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, section §N. Execute Step 24.

Treat this as a SECURITY issue, not a performance one. Over-invalidating is merely slow; a
cacheTag/unstable_cache whose KEY omits the tenant will serve one tenant's cached payload to
another.

1. `grep -rn "cacheTag\|unstable_cache\|getGlobalTag" src/` and audit EVERY hit for tenant
   presence in the cache key. List them all in the PR, each marked safe or fixed.
2. In src/lib/data-cache.ts replace getGlobalTag with getTenantTag(tag, tenantId); widen the
   CacheTag union beyond "users" | "branches" to cover the other entities.
3. Give revalidateAuthCache in src/features/core/auth/db-cache.ts a tenant parameter.
4. Add a `t:<tenantId>:` prefix helper (tenantKey()) for Redis keys and apply it everywhere
   except session:<id>, which is identity-level and stays global.
```

**Acceptance:** every cache call site enumerated in the PR with a verdict · no `global:` tag remains
on tenant-scoped data · Redis keys namespaced via the helper, never hand-concatenated.

---

### Step 25 — Vercel wildcard domain setup

**Depends on:** 21

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, section §L. Execute Step 25.

Infrastructure + docs, minimal code:
1. Add *.domain.com as a wildcard domain on the Vercel project (auto TLS; requires the
   domain's nameservers at Vercel, or a DNS-01 challenge via CNAME). Add the apex and a www ->
   apex redirect.
2. Register tenant #1's CURRENT production hostname as its custom domain manually — wildcard
   certs do NOT cover custom domains, so it needs individual registration. This preserves
   existing links and SEO.
3. Set NEXT_PUBLIC_ROOT_DOMAIN in every environment.
4. Write docs/multi-tenant/DOMAINS.md covering the DNS records, the cert model, and why
   self-serve custom domains are deferred.
```

**Acceptance:** wildcard resolves and serves a tenant · apex serves marketing · tenant #1's legacy
host still works · docs committed.

---

## Phase P5 — Integrations and branding

### Step 26 — Firebase tenant path scheme

**Depends on:** 19, 02

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, section §M. Execute Step 26.

Implement the new path scheme in §M. Make tenantId a REQUIRED parameter of uploadImage and
deleteImage so the compiler enumerates the call sites — do not default it.

Handle every consequence listed in §M; they are not optional:
- OVERWRITE CONFIRMATION. Deterministic names collide, and a collision destroys the previous
  image. Before writing to an existing key the UI MUST ask the user to confirm the existing
  image will be replaced, naming the dress code or phone number, and showing the existing
  image alongside the new one where practical. Implement it as: checkImageExists(path) before
  upload -> confirm dialog on a hit -> an explicit `overwrite: true` flag on the mutation that
  the server REQUIRES when the key is occupied. A missing flag on an occupied key is a
  CONFLICT error, not a silent overwrite. Add the dialog copy to BOTH en.ts and ar.ts.
  Renumbering after a mid-list delete must NOT trigger this prompt for images the user did not
  choose to replace.
- Cache-busting for deterministic (overwriting) names — pick ?v= or a bucket TTL DELIBERATELY
  and say which in the PR. This is the likeliest "why is the old photo still showing" bug.
- The -{n} leaf for multiple dress images, plus a stated renumber rule on mid-list delete.
- Moving a dress between branches MOVES its objects: copy, verify, then delete. Same for
  renaming a dress code or a user's phone.
- Sanitize userPhone and dressCode for object keys.
- The folder prefix is derived from the procedure, NEVER caller-supplied — a caller-supplied
  `../` is traversal into another tenant's prefix.
- deleteImage verifies the atelier/{tenantId}/ prefix.
- Do NOT migrate legacy objects under uploads/ and reservations/ — their URLs are stored in
  rows and are public. Accept legacy prefixes on read for tenant #1 only.
```

**Acceptance:** new uploads land at the specified paths · uploading to an occupied key prompts for
confirmation and cancelling leaves the original intact · the mutation rejects an occupied key without
`overwrite: true` · re-upload visibly updates in the browser · moving a dress moves its objects ·
legacy images still render · cross-tenant delete-by-URL rejected · dialog copy in EN and AR.

---

### Step 27 — WhatsApp config into settings, with secret handling

**Depends on:** 19

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, section §N. Execute Step 27.

Move WhatsApp config out of env and into the tenant's settings rows — but do the secret
handling FIRST, in this same PR. settings.value is plain text, so without it a Wapilot API
token would be readable by anyone with settings read access and would appear in CSV exports
and DB backups in the clear. Moving the token out of env without this is a NET SECURITY
REGRESSION.

WRITE-ONCE SECRET MODEL — implement exactly this:
1. Add an `isSecret` boolean to settings (generated migration).
2. Encrypt `value` at rest for secret rows, using a key SEPARATE from JWT_SECRET_KEY.
3. Once saved, the plaintext is NEVER viewable again — by anyone, INCLUDING THE OWNER. The
   server must never decrypt a secret in response to a read. Decryption happens only at the
   point of use, inside the outbound Wapilot call. Do not build a "reveal" endpoint; if it
   does not exist, it cannot be got wrong.
4. Reads return a mask plus metadata only: isSet, updatedAt, updatedBy, and at most a last-4
   hint. Never the value, in any tRPC response payload.
5. Only ownerProcedure may WRITE a secret. Admins may see that a value is configured; they
   may not set, replace, or read it. Replacement is the only edit path — the owner types a new
   value which overwrites.
6. Exclude secret rows from CSV export.
7. Add setting codes for the Wapilot instance id and API token alongside the existing
   WHATSAPP_NUMBER code — do not create a third home for WhatsApp config. Note WHATSAPP_NUMBER
   itself is NOT a secret; only the instance id and token are.
8. src/integrations/whatsapp/wapilot-api.ts resolves credentials per request from
   ctx.tenant.id.
9. DELETE WAPILOT_INSTANCE_ID and WAPILOT_API_TOKEN from src/env/server.ts and from all
   deployment environments. Tenant #1's rows were seeded in Step 07 — verify they are present
   and that a real WhatsApp send works BEFORE removing the env vars.

Add UI copy for the masked/replace flow to BOTH en.ts and ar.ts.
```

**Acceptance:** secret values encrypted at rest · absent from CSV export · masked in the UI and never
in a network response · **no endpoint exists that returns a decrypted secret** · an admin (non-owner)
cannot write one · WhatsApp still sends for tenant #1 · env vars gone everywhere.

**Review focus:** confirm the token is not in any tRPC response payload — check the network tab, not
just the code · confirm there is no reveal/decrypt read path anywhere, including debug or export
routes · confirm the owner-only write is enforced server-side, not just hidden in the UI.

---

### Step 28 — Inngest, email identity, format, registry

**Depends on:** 19

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, sections §N and §O. Execute Step 28.

1. INNGEST: add a required tenantId to every event payload schema and include it in step.run
   idempotency keys. There is one function today (processTask), so this is ~20 minutes now
   versus a multi-day retrofit in a year — do it even though nothing needs it yet.
2. EMAIL: keep ONE SMTP account. Pass fromName: tenant.nameEn and replyTo per call —
   SendMailOptions already supports the override. Do NOT add per-tenant SMTP credentials
   (that is an SPF/DKIM/DMARC deliverability project, not a feature). Interpolate the tenant
   name into the authTranslations.emails.* copy instead of baking it in. While here:
   SMTP_USER is declared in the env schema and never read (auth uses SMTP_FROM_EMAIL) — fix
   or remove it.
3. FORMAT: src/lib/format.ts hardcodes currency "EGP" and locale "en-EG". Make both REQUIRED
   parameters so the compiler enumerates call sites — a default would guarantee half of them
   silently keep showing EGP. Add a useTenantFormat() hook and a server equivalent.
4. TIMEZONE: resolve the two-sources-of-truth conflict per §O — tenants.timezone is
   authoritative, and system-settings-registry.ts reads/writes through to it, leaving the
   Settings UI unchanged.
5. REGISTRY: rename entities.ts's branchScope to scope: "tenant" | "branch" and drop
   "future-branch-aware" (a TODO encoded in a type). branches and settings become "tenant".

Do NOT internationalize src/lib/phone.ts — changing normalization changes the Step 08
generated column's expression, which rebuilds a unique index on a populated table. Add
tenants.defaultCountry as the seam and document Egypt-only.
```

**Acceptance:** no currency/locale defaults remain · timezone has one authoritative source · Inngest
events carry `tenantId` · emails show the tenant name · `phone.ts` untouched.

---

## Phase P6 — Onboarding and the real test

### Step 29 — Apex marketing surface and tenant signup

**Depends on:** 25, 22

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, section §P. Execute Step 29.

Build the apex (marketing) surface and domain.com/get-started.

Tenant creation is ONE transaction, in this order: validate slug against
^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])$ and RESERVED_SLUGS (from Step 10 — reuse the constant,
do not re-declare it) -> create or reuse the GLOBAL user -> insert tenant (status 'trial') ->
membership with role 'owner' -> first branch (shortCode 'MAIN') + branch membership isCurrent
-> seed default settings from system-settings-registry.ts -> warm the Redis host key ->
redirect to https://<slug>.domain.com via the Step 22 handoff (the session MUST be created on
the tenant host).

Handle the slug race by CATCHING the unique violation, not by check-then-insert.

Create the tenant immediately rather than after email verification — abandoning at the
verification step with no tenant is a worse funnel than a few dead trial rows. Gate meaningful
use on verification instead.
```

**Acceptance:** a new tenant is reachable at its subdomain immediately · reserved and duplicate slugs
rejected · concurrent identical-slug signups produce exactly one tenant · partial failure leaves no
half-built tenant.

---

### Step 30 — Tenant-scoped member signup and invites

**Depends on:** 29

**Prompt:**
```
Read docs/multi-tenant/PLAN.md, section §P. Execute Step 30.

1. Customer self-signup on a tenant subdomain (existing /sign-up) keeps role "customer" and
   additionally inserts a tenant_memberships row.

   SECURITY, do not skip: if the email already exists globally, do NOT create a second user —
   attach a membership to the existing identity, but ONLY after password verification.
   Otherwise "sign up" becomes an account-takeover primitive: register with a victim's email
   at your own tenant and you would get a membership on their identity.

2. Employee/admin creation stays admin-invite-only via the existing users screen, now writing
   tenant_memberships rather than users.role.

3. Add the invite flow: create an invited membership, email the invite, accept on the tenant
   host.
```

**Acceptance:** signing up with an email that exists in another tenant requires the password · an
invited user lands in the right tenant with the right role · no path writes `users.role` for business
authorization.

---

### Step 31 — Second-tenant acceptance

**Depends on:** 30, 19

**Prompt:**
```
Read docs/multi-tenant/PLAN.md. Execute Step 31 — the acceptance test for the whole project.

Create a SECOND REAL TENANT through the actual UI and operate it end to end: create a branch,
a dress with images, a rental customer, a reservation, and a payment. Use natural keys that
COLLIDE with tenant #1 (same branch short code MAIN, a dress code that already exists there, a
customer phone that already exists there) — collisions are the test.

Then:
1. Re-run the Step 19 isolation suite against this real data.
2. Verify tenant #1's data is completely absent from tenant #2's every screen.
3. Verify images are under separate Firebase prefixes and neither tenant can delete the
   other's by URL.
4. Verify reservation codes do not collide across tenants.
5. Verify WhatsApp and email send with tenant #2's own identity.
6. Write docs/multi-tenant/ACCEPTANCE.md with the evidence.

Report any leakage as a blocking defect. Do not close this step with known leakage.
```

**Acceptance:** zero cross-tenant leakage across all six checks · evidence committed.

---

## Deferred, deliberately

**SaaS billing via Paymob.** Nothing exists today. Two notes for when it is built: (1) namespace it
hard — `subscriptions`, `invoices`, `billing_events` — well away from the existing `payments` domain,
which is a customer rental ledger; a `payments` table meaning two things is a permanent tax. (2)
Paymob is a card/wallet gateway rather than a subscriptions platform, so recurring billing is not
turnkey the way Stripe Billing is — expect to build the renewal loop yourself (saved-token/MOTO
charges plus your own invoice state machine), or start with manual invoicing using `tenants.plan` and
`tenants.status='suspended'` as the enforcement lever.

**Self-serve custom domains** — wildcard certs don't cover them; each needs Vercel Domains API calls
and per-tenant DNS support. Support exactly one, manually (Step 25).

**RLS (P7)** — the right call to skip in phase 1, but schedule it with a date rather than "someday".
It is the only *prevention* mechanism; Step 19 is *detection*. The seam is described in §K and is
cheap here because `ctx.db` is already a single chokepoint.

**Platform admin console and audit-log UI (P7)** — the `tenant_access_audit` table and the
impersonation grant design (§J) land in P1/P2; the console that uses them is later.

**Internationalizing `phone.ts`**, **per-tenant screen/entity registries**, and **cross-tenant SSO /
tenant switcher** — each a project of its own.
