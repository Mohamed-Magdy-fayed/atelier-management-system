# Per-client demo deployments — plan

Goal: one message — `/atelier-demo <customer name>` — produces a private, branded demo of the
system for a prospect from the gateling.com sales pipeline:

- the prospect's **name (EN + AR) and logo**,
- their **top 6 dresses** from social media at the front of the catalogue and dashboard,
- a year of believable demo data built around those dresses,
- its **own database**, at **`<slug>-atelier.gateling.com`**,
- an admin login **`<slug>@admin.demo`** with a generated password.

## Decisions (2026-11-01)

| # | Decision |
|---|---|
| Q1 | A client branch carries **no code** — branding, colour and data live in the client's DB. |
| Q2 | Password is shown once and saved in the lead's note in gateling.com. |
| Q3 | `gateling-sales` is a **global** connector — callable from this repo. |
| Q4 | **One Neon project per client** (not a branch of a shared project). Provisioned through the Neon MCP. |
| Q5 | Portfolio size is **not** shrunk: the 6 client dresses lead, the rest keep the placeholder image. |
| Q6 | Demos live **7 days**, then teardown. |
| Q7 | URL pattern `<slug>-atelier.gateling.com`. |
| — | **Brand colour is sampled from the logo** and stored as a branding setting, so each demo wears the client's colour. |

Sections below are updated to match; where they disagree with this table, this table wins.

---

## 1. What already exists (and changes the design)

| Finding | Where | Consequence |
|---|---|---|
| Branding is **data, not code**: name EN/AR + logo URL are `settings` rows, read by `getBranding()` | `src/features/system/settings/server/branding.ts` | No per-client code is needed for the brand. A per-client git branch holds **zero code changes**. |
| A curated, publication-safe `demo` seed profile exists (3 branches, ~150 dresses, a year of reservations/payments/expenses, money invariants, deterministic ids, idempotent re-runs) | `src/drizzle/seed/demo/`, `docs/seeding-and-demo-data.md` | The client demo is a **parameterised variant** of this profile, not a new generator. |
| Every demo dress uses one placeholder image | `seed/demo/fixtures.ts` (`images: [...]`) | The 6 client dresses replace the top-ranked dresses; the rest need an image decision (§7, Q5). |
| Seeding a remote DB is guarded (`SEED_ALLOW_REMOTE=1`, refuses `NODE_ENV=production`, refuses the built-in admin password remotely) | `seed/cli.ts`, `seed/clear-db.ts` | Keep the guards; add a stricter **demo-target allowlist** (§5). |
| `vercel-build` runs `drizzle-kit migrate` before `next build` | `package.json` | Every demo deploy migrates its own DB automatically. |
| gateling.com DNS is on Vercel nameservers (`ns1/ns2.vercel-dns.com`) | Vercel domain `gateling.com` | `<slug>-atelier.gateling.com` needs no manual DNS — adding it to a project is enough. |
| Redis keys are **not namespaced**: `session:<id>`, screen-permission cache keyed by `userId` | `features/core/auth/core/session.ts`, `screen-permission-cache.ts` | Demos share one Upstash DB, and seed ids are deterministic (`SEED_ADMIN_ID = …0001` in every demo). Demo A's cached permissions would be served to demo B. **Must add a key prefix.** |
| `gateling-sales` MCP is configured **only for the `G:/apps/gateling.com` project** | `~/.claude.json` | Not callable from this repo today (§7, Q3). |
| `research-business` skill lives in the gateling.com repo and runs in **Claude in Chrome**, read-only, saving to the lead | `G:/apps/gateling.com/.claude/skills/research-business/` | Reuse it for step 2; extend with "collect top 6 dress posts". |
| Multi-tenant conversion is planned (31 steps) but not started | `docs/multi-tenant/` | Demos must not wait on it. This plan is the stop-gap; once tenants exist a demo becomes a tenant row and this infra is retired. |

---

## 2. Architecture

### Recommendation: one demo Vercel project, one git branch per client with no code in it

```
main ──merge──▶ demo (base for all demos)
                 ├── demo/nour-bridal      → nour-bridal-atelier.gateling.com  → Neon branch nour-bridal
                 ├── demo/layali-atelier   → layali-atelier-atelier...          → Neon branch layali-atelier
                 └── …
```

- **Vercel project `atelier-demos`** (new, same repo, same team). Separate from the in-house and the
  Alaa El-Kasry projects so demo env vars and deploys can never touch them.
  - Production branch: `demo` (never assigned a client domain).
  - Each client = git branch `demo/<slug>`, built as a Preview deployment.
  - Vercel supports **Preview env vars scoped to one git branch** and **a domain assigned to one git
    branch** — that is what makes a branch the unit of a client, as you asked.
  - **Deployment Protection off** for this project, otherwise the prospect hits a Vercel login wall
    on a preview URL.
- **One Neon project per client**, named `atelier-demo-<slug>`, created through the Neon MCP. The
  first deploy's `vercel-build` migrates it from empty; the seed then fills it. Teardown deletes the
  whole project, so nothing of one prospect survives in another's database.
- **Branch `demo/<slug>` carries no code** — it is created at the tip of `demo`. Why not
  customise code per client: every bug fix would need rebasing onto N branches, and branches drift.
  Branding, colours and data all live in the client's DB. If one prospect ever needs real code
  changes, that is the moment it becomes a client project, not a demo.
- **Keeping demos current**: `npm run demo:sync` fast-forwards every `demo/*` branch to `demo` and
  pushes; each redeploys and migrates its own Neon branch.

### Per-branch env vars (Preview, scoped to `demo/<slug>`)

| Var | Value |
|---|---|
| `DATABASE_URL` | the client's Neon branch (pooled) |
| `BASE_URL`, `OAUTH_REDIRECT_URL_BASE` | `https://<slug>-atelier.gateling.com` |
| `REDIS_KEY_PREFIX` *(new)* | `demo:<slug>:` |

Shared across all demos (project-level Preview): Redis, Firebase, JWT secret, `DEMO_MODE=1` *(new)*,
`BRANDING_EDITABLE=1`. **Unset on purpose:** `WAPILOT_*`, `SMTP_*`, `INNGEST_*` — a demo must never
message a real phone or inbox.

### Alternatives considered

| Option | Why not |
|---|---|
| One Vercel project per client | Slower to create, more to tear down, team project limits, N sets of settings to keep aligned. |
| Code changes per client branch | Drift; see above. |
| Wait for multi-tenancy | Weeks of high-risk work; demos are needed now. |
| One shared demo DB, switch brand per host | That *is* multi-tenancy, done badly. |

---

## 3. Code changes (one PR to `main`, then merged into `demo`)

1. **`DEMO_MODE=1`** (server env, default off):
   - `robots: noindex, nofollow` on every page; no sitemap.
   - Outbound channels hard-off regardless of settings (WhatsApp, email, Inngest sends) — a check at
     the send boundary, not just missing keys.
   - Hide Google sign-in (each demo host would need its own OAuth redirect URI registered in Google
     Cloud — not automatable, and not needed for a demo).
   - Small, translated "Demo" badge in the shell (`en` + `ar`), RTL-safe.
2. **`REDIS_KEY_PREFIX`** (optional, default `""`) applied in one place in the Redis client wrapper,
   so sessions, screen-permission cache and any future key are namespaced. Default empty keeps the
   two live projects' existing sessions valid.
3. **Seed profile `client-demo`** reading a manifest (§4):
   - writes the 3 branding settings rows;
   - admin = manifest email + password (existing `SEED_ADMIN_EMAIL/PASSWORD` path, `role: admin`);
   - branches: count and area names from the manifest (default 1–2 rather than the generic 3 —
     a one-shop atelier seeing three branches breaks the illusion); booking volume scaled to match;
   - the 6 client dresses become **rank 0–5 of the main branch** (most-booked), with their images,
     titles, colours and a price tier; they then naturally lead "top dresses", the catalogue, curated
     reservations and the public dress/QR pages;
   - everything else stays synthetic exactly as the `demo` profile is today (names, `@example.com`,
     reserved phone block).
   - Implemented by factoring today's `DEMO_BRANCHES` / `DEMO_DRESSES` constants into a
     `buildDemoFixtures(options)` call; `demo` passes the current defaults, so its output is
     unchanged (assert by comparing row counts + money totals before/after).
4. **Brand colour:** a fourth branding setting (`00012`, hex `#RRGGBB`) injected as `--primary`
   (plus sidebar/ring) in the root layout, with a lighter variant for dark mode and a foreground
   chosen for contrast. Unset keeps today's wine palette. Sampled from the logo by
   `npm run demo:logo-color -- <logo file or URL>` (most-saturated dominant colour, neutrals skipped).

All under the usual gates: `/ui-scan` on touched UI, `typecheck && build`, generated migrations
only (none expected — branding already uses `settings`).

---

## 4. The demo manifest

One JSON per client, the single input to provisioning — reviewed by you before anything is created.

```jsonc
{
  "slug": "nour-bridal",                 // [a-z0-9-], ≤ 40 chars, unique
  "leadId": "…",                         // gateling-sales lead
  "nameEn": "Nour Bridal Atelier",
  "nameAr": "أتيليه نور للعرائس",
  "logoUrl": "https://storage.googleapis.com/<bucket>/demos/nour-bridal/logo.png",
  "branches": [{ "nameEn": "Tanta", "nameAr": "طنطا" }],
  "dresses": [                            // exactly 6, in rank order
    {
      "title": "Ivory lace mermaid gown",
      "color": "Ivory",
      "tier": "bridal",                   // bridal | evening | engagement | soiree
      "imageUrl": "https://storage.googleapis.com/<bucket>/demos/nour-bridal/dress-1.jpg",
      "sourcePost": "https://instagram.com/p/…",
      "engagement": { "likes": 1240, "comments": 88 }
    }
  ],
  "brandColor": "#7A1F3D",               // sampled from the logo, you can override
  "adminEmail": "nour-bridal@admin.demo",
  "expiresAt": "2026-11-08"              // created + 7 days
}
```

Stored at `demos/<slug>/manifest.json` in Firebase Storage next to the images (so a demo can be
re-seeded from anywhere), and the path is noted on the lead. Not committed to git.

---

## 5. Safety rails (this repo has been bitten before)

- **Target allowlist.** The `client-demo` seed only writes to a `DATABASE_URL` whose Neon endpoint
  id matches `DEMO_NEON_ENDPOINT_ID`, which the skill sets from the project it created in the same
  run (or reads back from the manifest). It refuses known endpoints of the in-house and Alaa El-Kasry DBs by name, and never
  reads `.env`, `.env.local`, `.env.prod` or `.env.preview` — the connection string comes from the
  Neon API response only. The resolved host + branch are printed and **you confirm** before the
  first write.
- **Password**: 20+ chars from `crypto.randomBytes`, passed via env to the seed, never written to a
  file or a commit, never put in a URL. Shown to you once at the end.
- **No real people's data in the DB**: only the business's public name, logo, area and its own
  dress photos. Customers, staff and phones stay synthetic (existing publication-safety rules).
- **Images are copied, not hot-linked**: Instagram/Facebook CDN URLs are signed and expire within
  days. Each image is fetched once and uploaded to `demos/<slug>/` in Firebase; `next.config.ts`
  already allows `storage.googleapis.com/<bucket>`.
- **Social research stays read-only** (the existing skill's rules: no likes, follows, messages; stop
  at login walls/CAPTCHAs).
- **Expiry**: every demo has `expiresAt`. `npm run demo:list` shows age; `demo:teardown <slug>`
  removes the Vercel domain + branch env vars, the git branch, the Neon branch and the Firebase
  folder — after printing exactly what it will delete and waiting for a yes.

---

## 6. The `/atelier-demo <customer name>` skill — order of work

Lives at `.claude/skills/atelier-demo/SKILL.md` in this repo.

1. **Find the lead** — `gateling-sales` `list_leads` (search) → `get_lead`. Several matches → ask.
2. **Research if needed** — if Instagram/Facebook are not `found` on the lead, run
   `research-business` for that lead (Claude in Chrome, existing workstation tabs).
3. **Collect assets** (Chrome, read-only):
   - Logo: Instagram/Facebook profile picture at its largest size.
   - Arabic + English names as the business writes them; area/branches from the Maps listing.
   - **Top 6 dresses**: scan the last ~60 Instagram posts (fall back to Facebook photos), keep posts
     whose main subject is a single dress, rank by likes + comments (pinned posts count first),
     skip duplicates of the same dress. For each: image URL, caption → title/colour/tier.
4. **Review gate** — show you: slug, URL, names, logo, the 6 images with titles and tiers. You can
   swap any dress or edit any field. Nothing is created before your yes.
5. **Upload** logo + 6 images to Firebase `demos/<slug>/`, write the manifest.
6. **Provision** (`npm run demo:provision -- <slug>`):
   1. Neon (MCP): create project `atelier-demo-<slug>` → connection string.
   2. Git: create `demo/<slug>` at `demo`, push.
   3. Vercel (MCP): add branch-scoped Preview env vars; add domain `<slug>-atelier.gateling.com`
      assigned to git branch `demo/<slug>`.
   4. Trigger the deploy (empty commit on the branch if the env vars landed after the first build);
      wait for `READY` — this also runs migrations.
   5. Seed: `client-demo` profile against the Neon branch (after the §5 confirmation).
7. **Verify** in the browser pane: the URL loads, shows the client's name + logo in EN and AR, the
   admin can sign in, the 6 dresses lead the catalogue and dashboard, no Alaa El-Kasry data or wine
   placeholder name anywhere.
8. **Report & record** — URL, email, password to you; `add_note` on the lead with URL, admin email
   and expiry (password only if you say so — Q2).

Expected wall time: ~10 min research + ~5 min provisioning/build per client.

---

## 7. Decisions needed from you

| # | Question | Recommendation |
|---|---|---|
| Q1 | Branch per client with **no code** in it (branding/data only) — OK? | Yes |
| Q2 | Where does the generated password live after the demo is made? | Shown to you once + saved in the lead note in gateling.com (it's a throwaway demo account). |
| Q3 | Make `gateling-sales` available in this repo (add to project `.mcp.json` or user scope)? | User scope, so the skill runs from either repo. |
| Q4 | Neon: branches inside one `atelier-demos` project (check your plan's branch limit) vs one Neon project per demo | Branches; teardown keeps the count low. |
| Q5 | The ~140 non-hero dresses: keep a neutral placeholder image, or shrink the portfolio to ~30 dresses for a small atelier | Shrink per client size; placeholder for the rest. |
| Q6 | Demo lifetime before teardown | 30 days, extendable. |
| Q7 | URL pattern: `<slug>-atelier.gateling.com` (your example) vs `atelier-<slug>.gateling.com` (matches `atelier-alkasry`) | Your pattern is fine; pick one and keep it. |

---

## 8. Build order

| Step | Work | Output |
|---|---|---|
| 1 | Code PR: `DEMO_MODE`, `REDIS_KEY_PREFIX`, `buildDemoFixtures(options)` refactor, `client-demo` profile | PR to `main`, `demo` profile output unchanged |
| 2 | One-time infra: Vercel project `atelier-demos` (protection off, prod branch `demo`), Neon project + `template` branch, `NEON_API_KEY` locally | Infra ready |
| 3 | `scripts/demo/` — `provision`, `teardown`, `list`, `sync` with the §5 rails | npm scripts |
| 4 | `.claude/skills/atelier-demo/SKILL.md` + extend research with "top 6 dresses"; `gateling-sales` in scope | `/atelier-demo` |
| 5 | Dry run on one real lead end-to-end, then teardown and recreate to prove both directions | First real demo |

Steps 1 and 2 are independent and can run in parallel; 3 needs both; 4 needs 3.
