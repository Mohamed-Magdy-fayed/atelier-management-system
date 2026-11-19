# Self-serve Gateling Atelier: free tier, signup lead capture, interactive sandbox

Status: **planning only, nothing built.** Written 2026-11-18. Builds on
[`docs/multi-tenant/PLAN.md`](../multi-tenant/PLAN.md) (31 steps, P0-P7) and
[`docs/client-demos/PLAN.md`](../client-demos/PLAN.md) (one Neon project per prospect). Public brand is
**Gateling** only; the only public contact is WhatsApp **01271741743** (`https://wa.me/201271741743`).

---

## 0. What this document decides, and what it needs from Megz

Three workstreams, one sequencing call:

| # | Workstream | Needs multi-tenant? |
|---|---|---|
| W1 | **Interactive sandbox**: the real app UI in a phone frame, seeded demo owner, all data in the browser, guided tasks | **No** |
| W2 | **Signup questionnaire to lead**: answers POSTed to gateling.com, recorded as a lead/discovery contact | **No** |
| W3 | **Self-serve free account + paid plan** (500 EGP/branch/month, manual InstaPay/Vodafone Cash) | **Yes** (or per-client Neon, see 1) |

### The tension (not dropped, just sequenced)

The earlier rule was *"multi-tenant only after 3 shops pay; managed installs until then."* (This came
from the coordinator; it is not written in this repo's docs or memory files, so I could not re-read the
original wording.) Self-serve signup contradicts it, because self-serve means anyone can create a tenant
with no human in the loop, and `docs/multi-tenant/PLAN.md` itself says P3 is "where a mistake becomes a
data breach rather than a bug".

**Recommended sequence (A, then B, then C):**

1. **Phase A, now, no tenancy.** Ship W1 (sandbox) and W2 (questionnaire to lead). The signup button
   produces a *qualified lead + a WhatsApp conversation*, and Megz provisions a **managed install**
   with the existing `/atelier-demo`-style per-client Neon + Vercel flow. This is self-serve *discovery*
   and still manual *provisioning*. It tests the only thing that matters first: do ateliers pay 500 EGP?
2. **Phase B, gate: 3 paying managed shops, or Megz overrides.** Run multi-tenant P0-P3 (steps 01-19).
   Invisible to users.
3. **Phase C, after step 19 (isolation test green) and 31.** Turn on true self-serve: apex signup,
   free-tier limits, manual-payment upgrade flow (§5).

If Megz prefers multi-tenant first regardless, Phase A is still worth doing first: it is cheap, reuses
nothing from tenancy, and gives the signup page something to talk to. The decision is recorded in §9.

---

## 1. Findings that shape the design

| Finding | Source | Consequence |
|---|---|---|
| The UI talks to the server only through tRPC: one `httpBatchLink` to `/api/trpc`, SuperJSON | `src/integrations/trpc/client.tsx` | The sandbox can swap the **link**, not the UI. Every screen is real. |
| ~80 procedures across 10 routers (dresses 12, reservations 14, users 14, import 10, expenses 7, settings 6, branches 5, rental-customers 4, payments 3, dashboard 2) | `src/features/system/*/server/router.ts` | A hand-written fake backend is feasible but is a maintenance tax; see §3.2 options. |
| Public site and system screens are separate route groups; screens defined in a registry | `src/app/*`, `src/features/system/registry/screens.ts` | Sandbox is a new route group, not a fork. |
| Server context depends on session cookie, Redis, Firebase, Neon | `src/integrations/trpc/init.ts` | Real routers cannot run unchanged in a browser; they need driver aliasing (§3.2 option B). |
| Landing worktree `G:\apps\atelier-landing-preview`, branch `landing-glossgenius`: `/preview`, `gg-page.tsx` (~300 lines), `gg.css`; hero has a phone frame crossfading 3 screenshots; hero gets replaced later by the live sandbox | worktree | Keep the screenshot hero for now; sandbox goes in as a separate `/try` page and later a hero CTA. |
| Stack: Next 16.2.4, React 19.2, Tailwind 4 | `package.json` | Container queries, `:has()`, anchor positioning all available. |
| Customer data identity helpers already exist: `src/lib/phone.ts`, SQL `rental_customer_phone_key()` | multi-tenant plan §E | Reuse for duplicate-account detection (§6). |

---

## 2. Product scope (what the user sees)

### 2.1 Pricing and tiers

| | Free | Paid |
|---|---|---|
| Price | 0 | **500 EGP per branch per month** (shown as "about $10"; EGP is the source of truth, USD is an approximate label and must be reviewed when the rate moves) |
| Branches | 1 | n (billed per branch) |
| Dresses | 30 | unlimited |
| Reservations | 20 per calendar month | unlimited |
| Data on over-limit | **never deleted**; creating new dresses/reservations is blocked with an upgrade prompt, existing data stays readable and editable | n/a |

Open details are in §9 (annual discount, trial of paid, what "branch" counts when archived).

### 2.2 Funnel

```
gateling.com landing  ->  /try (sandbox, anonymous, browser-only)
        |                      |  finishes tasks / clicks "Start free"
        v                      v
   WhatsApp 01271741743    Signup questionnaire (6-8 questions, Arabic first)
                               |  POST to gateling.com lead API  (W2)
                               v
              Phase A: lead lands in Gateling pipeline, Megz replies on WhatsApp,
                       provisions managed install
              Phase C: tenant is created automatically, owner lands in own workspace
```

---

## 3. W1: Interactive sandbox

### 3.1 Requirements restated

- Real app UI, inside a **phone frame**, seeded with one demo owner and **1-2 branches**.
- **All data in browser storage only.** Nothing is sent to a server, no cookies of ours, no account.
- Step-by-step **guided tasks** (e.g. "add an address"), where a step can drive the app (navigate, open
  the modal) and the visitor then sees their own entry in the list.
- **Different layouts for desktop, tablet, mobile**, per Megz's description (§3.4).
- Latest widely supported CSS; Tailwind where it supports the thing, pure CSS otherwise.

### 3.2 How the real UI gets data (the one big technical choice)

| Option | What it is | Pros | Cons |
|---|---|---|---|
| **A. Fake tRPC link over IndexedDB** | New `TRPCLink` that dispatches to a hand-written in-browser handler per procedure, backed by IndexedDB | No server code in bundle; small; fully controlled seed | Must re-implement ~60 procedures the screens call; drifts from the real app unless tested against it |
| **B. PGlite + real routers (recommended to spike)** | Postgres compiled to WASM (PGlite) persisted to IndexedDB, Drizzle pointed at it, the **real routers** invoked via `createCaller` with a fake owner context | Zero logic drift: every future feature appears in the sandbox for free; seed reuses `src/drizzle/seed/demo` | Bundle weight (WASM, several MB, lazy-loaded only on `/try`); needs build-time aliases for Neon driver, Redis, Firebase, `server-only`; routers that touch email/WhatsApp/Inngest need no-op shims; real risk that some router imports a server-only module deep in its chain |
| C. Screenshots / scripted fakes | Static images with hotspots | Trivial | Not the real UI; fails the brief |

**Plan:** a **1-2 day spike on B** with a hard exit: it must render dashboard, dresses list and one
create-dress mutation in a browser tab using only the real router modules. If any of the three need more
than shims (alias + stub) to work, fall back to **A**, scoped to the procedures used by the guided
tasks only (dashboard, dresses, rental-customers, reservations, payments, branches, settings read,
expenses create), roughly 25-30 procedures. Decision recorded in §9.

Either way, the **UI components are untouched**; only the provider differs:

```
src/app/(sandbox)/sandbox/app/[[...path]]   // renders the real system layout + pages
  layout.tsx -> <SandboxProviders>          // fake session (owner), sandbox trpc link, no Redis/Firebase
```

Images: dresses use bundled sample photos from `public/sandbox/`; uploads in the sandbox read the file
into an object URL / IndexedDB blob and never hit Firebase.

### 3.3 Frame: use an iframe, not a styled div

The app is responsive by **viewport** breakpoints. A `div` shaped like a phone on a 1440px screen would
still render the desktop layout inside it. An **`<iframe>` of fixed 390x844** gets a real 390px viewport,
so the genuine mobile layout (five-tab bottom bar, etc.) appears with no code changes.

- Host page `/try` renders `<DeviceFrame>` + `<GuidePanel>`; the iframe loads `/sandbox/app`.
- Same origin, so both share one IndexedDB; the host and iframe talk through `postMessage` / a
  `BroadcastChannel` (events: `route`, `mutation-success`, `element-rect`).
- The sandbox route group sets `X-Robots-Tag: noindex` and has a "Demo data, saved only in this browser"
  banner and a **Reset demo** button (drops the IndexedDB, reseeds).

### 3.4 Layouts by device (from Megz's own description, 2026-11-18)

| Viewport | Layout |
|---|---|
| **Desktop (>= 1024px)** | Numbered steps (1, 2, 3, 4...) on one side; the **phone frame on the left** with the app running inside it, sticky while the steps scroll. Choosing a step **drives the app**: e.g. step "add an address" navigates the iframe to the addresses page and **opens the modal for the visitor**; they fill it in and see their address in the list. |
| **Tablet (640-1023px)** | **Steps on top**, then a cue ("try it below" with a scroll-down affordance, `scroll-margin` + smooth scroll to the frame), then the phone below. |
| **Mobile (< 640px)** | Phone is **as large as possible** (full width, `100dvh` minus a slim step bar, safe-area insets) so it is usable, not tiny. Steps become a compact bar/bottom sheet over the frame. |

Where the viewport is small enough, the frame chrome is dropped so the real app fills the screen. The
"Start free" call to action follows the last step on every size.

Implementation: a single `@container` on the page shell decides frame vs full-bleed; the frame size comes
from CSS custom properties; scaling uses `min()`/`clamp()` and `aspect-ratio` so the frame always fits
without scroll (`dvh`, not `vh`). RTL: the guide column flips with logical properties (`ms-`, `ps-`,
`inset-inline-*`); the **phone frame itself is not mirrored**, but its content is (the app handles that).

### 3.5 Guided tasks engine

Declarative, data-driven, bilingual:

```ts
type Step = {
  id: string;
  target: string;                 // [data-tour="add-dress-button"]; added to real components as an attribute only
  title: { en: string; ar: string };
  body:  { en: string; ar: string };
  complete: // any of:
    | { route: string }           // iframe navigated to it
    | { mutation: string }        // trpc path succeeded, e.g. "dresses.create"
    | { dom: string }             // selector appeared
    | { manual: true };           // "Next" button
  skippable?: boolean;
};
```

- **Spotlight and popover**: CSS **anchor positioning** (`anchor-name` / `position-anchor` /
  `position-try-fallbacks`) with the Popover API, over a `clip-path` / `mask` overlay cut-out. Anchor
  positioning is recent; **verify Baseline status at build time** and keep a measured-rect fallback
  (host reads the target's `getBoundingClientRect()` from the iframe and positions with `inset-*`).
- Tasks (each 3-6 steps, each ends with a visible win):
  1. **Add your location**: set the branch address (the "add an address" example).
  2. **Add a dress**: name, price, photo, category.
  3. **Add a customer**.
  4. **Create a reservation** (dress + customer + dates; shows availability conflict handling).
  5. **Take a deposit payment** (shows the balance update).
  6. **Read the dashboard** (what today's pickups/returns look like).
  7. **Switch branch** (second demo branch).
- Progress stored in `localStorage` (`sandbox:progress:v1`), wrapped in try/catch. Finishing 3+ tasks
  shows the **Start free** CTA and a WhatsApp button. Always-visible "Talk to Gateling" link.
- Instrumentation (anonymous, no PII, aggregate only): task started/completed, drop-off step, device
  class. Via existing analytics; no third-party session replay.

### 3.6 CSS and Tailwind policy

Use where widely available and degrade gracefully: container queries (`@container`, Tailwind 4 `@sm:`),
`:has()`, logical properties, `dvh/svh`, `aspect-ratio`, `clamp()`, `color-mix()`, `light-dark()`,
`@starting-style` and `view-transition` for step transitions (progressive enhancement only), `text-wrap:
balance`, `prefers-reduced-motion` honoured on every animation. Pure CSS (not Tailwind classes) for the
device frame, the cut-out overlay and anchor positioning, in a colocated `sandbox.css`. Components use
semantic tokens and shadcn barrels per the project rules; no hardcoded palette colours.

### 3.7 Sandbox risks

| Risk | Mitigation |
|---|---|
| PGlite bundle size hurts first load | Only on `/try`, dynamic import after a "Start the demo" tap; show a skeleton; measure on a mid-range Android on 4G |
| IndexedDB blocked (private mode, Safari ITP) | Detect, fall back to in-memory with a notice that progress is not saved |
| Schema changes break stored demo data | Version the seed (`sandbox:db:v3`); on mismatch drop and reseed |
| Real UI changes break tour selectors | `data-tour` attributes + a Playwright test that walks every task end to end in CI |
| Visitors treat demo data as real | Banner + reset + no ability to send WhatsApp/email from sandbox (all shimmed) |

---

## 4. W2: Signup questionnaire to Gateling lead

Source of questions: the **Gateling discovery guide** (problem first, last incident, current
workaround, cost, never "would you use...") and the **sales guide** (lead fields, Egyptian Arabic,
social profiles, branch/city context). Wording is mine; **Megz must approve the final Arabic copy**.

### 4.1 Questions (Arabic first, one per screen, 6-8 total, all but the last two skippable)

| # | Question | Answer type | Maps to |
|---|---|---|---|
| 1 | اسم الأتيليه | text | lead `name` |
| 2 | رقم الواتساب | phone (normalised by `phone.ts`) | lead `phone` / `whatsappPhone` |
| 3 | المدينة والمنطقة | select + text | lead `city`, `area` |
| 4 | كام فرع عندك، وكام فستان تقريباً؟ | numbers | lead notes; sizes the free-tier fit |
| 5 | بتسجّلي الحجوزات دلوقتي إزاي؟ (كشكول / إكسل / واتساب / برنامج) | multi-select + other | discovery evidence `workaround_tool` |
| 6 | احكيلي عن آخر مرة حصلت مشكلة في حجز أو فستان (تعارض، نسيان، فلوس ضاعت) | free text, optional | discovery evidence `incident` / `cost_loss` (**the single most valuable field**) |
| 7 | لينك صفحة الإنستجرام أو الفيسبوك | url, optional | `set_social_profile`; also seeds a branded demo later |
| 8 | تفضّلي نكلمك واتساب ولا مكالمة؟ وأنهي وقت؟ | choice + time | consent to contact, calling hours (sales guide: ateliers open ~12:00-22:00) |

Rules carried from the guides: no "would you use...?" opinion questions; quote people verbatim, never
paraphrase; compliments carry no weight; never ask for payment details here. Price is shown on the page
("free for 1 branch, 500 EGP/branch/month after") and a price-reaction tap ("مناسب / غالي / محتاج أفكر")
is recorded as a signal, **not** as a commitment (commitments need a paid deposit per the guide).

### 4.2 API contract (on gateling.com)

`POST https://gateling.com/api/public/atelier-signup` (name is a proposal). I did **not** inspect the
gateling.com repo, so its existing lead model, auth and rate-limit helpers must be checked first; the
shape below is a requirement, not a claim about what exists.

```jsonc
{
  "idempotencyKey": "uuid",           // client-generated, dedupes double submits
  "source": "atelier-sandbox",        // or "atelier-landing", "atelier-signup"
  "locale": "ar",
  "consent": { "contact": true, "storage": true, "at": "2026-11-18T14:20:00+02:00" },
  "business": { "name": "...", "phone": "01...", "city": "...", "area": "...", "branches": 2, "dresses": 120 },
  "answers": {
    "workaround": ["notebook", "whatsapp"],
    "lastIncident": "verbatim Arabic text",
    "priceReaction": "fair",
    "contactPreference": { "channel": "whatsapp", "window": "afternoon" }
  },
  "social": { "instagram": "https://...", "facebook": null },
  "sandbox": { "tasksCompleted": ["location", "dress"], "device": "mobile" }
}
```

Server behaviour (gateling.com side):
- Validate with Zod; normalise phone to the same key as `phone.ts`; reject non-Egyptian-looking numbers
  softly (flag, do not block).
- Create or update a **lead** (sales pipeline status `new`), attach the answers as a note, and create a
  **discovery contact** with `incident` / `workaround_tool` / `cost_loss` evidence only when the user
  actually typed it (verbatim).
- Dedupe by phone key and by `idempotencyKey`; an existing lead gets a note, not a second lead.
- **Never sends a message.** Lead appears in `get_today`; Megz replies from his own WhatsApp, in line
  with the sales guide's two-unanswered-message limit.
- Response `202 { leadId?: omitted }`, no internal ids leaked to the browser.

Abuse and security: CORS allowlist (apex + staging), per-IP and per-phone rate limit (hashed IP, short
TTL), honeypot field, optional Cloudflare Turnstile or similar if spam appears, body size cap, no
secrets in the client, HTTPS only, errors that reveal nothing about existing leads.

### 4.3 Privacy and legal (Egypt)

Egypt's Personal Data Protection Law (No. 151 of 2020) requires a lawful basis, clear purpose and
explicit consent for collecting personal data. Practical minimum: Arabic consent line next to the submit
button, link to a short privacy page, a stored consent timestamp, and a way to ask for deletion over
WhatsApp. This is my reading, **not legal advice**; Megz should confirm with someone qualified, especially
before the free-tier fraud checks in §6 and before storing Instagram profile data.

---

## 5. W3: Self-serve account, limits, manual payment

Depends on multi-tenant steps up to 31, plus the following **new** pieces. Namespace billing away from
the existing `payments` domain (multi-tenant plan "Deferred" section).

### 5.1 Data model additions

- `tenants.plan` (`free|paid`), `tenants.planBranches`, `tenants.paidUntil`, `tenants.status` already
  planned (`trial|active|suspended|cancelled`).
- `subscriptions`, `invoices`, `billing_events` tables (hand-built via Drizzle, **generated** migrations
  only; no `db:push`).
- `plan_limits` as code constants, not rows: `FREE = { branches: 1, dresses: 30, reservationsPerMonth: 20 }`.

### 5.2 Enforcement

One server helper `assertWithinPlan(ctx, "dress" | "reservation" | "branch")` called from the create
mutations (dresses, reservations, branches). Counts are tenant-scoped (relies on the tenant predicate
from multi-tenant P3). Reservation count is **per calendar month in the tenant's timezone**
(`Africa/Cairo`). Errors use a dedicated tRPC code so the UI shows the upgrade sheet, not a generic 403.
Never delete or lock existing data when over limit; allow reads and edits, block creates.

### 5.3 Manual payment flow (InstaPay / Vodafone Cash)

1. Owner taps **Upgrade**, chooses branch count, sees total (500 x branches) and Gateling's InstaPay
   address / Vodafone Cash number (config, not hardcoded in components) plus a **reference code**
   (e.g. `GL-4F2A9`).
2. Owner transfers, then uploads a screenshot and/or types the transfer reference; an `invoices` row goes
   to `pending_review`.
3. Megz sees pending invoices in the platform console (multi-tenant P7 item, so a minimal version is
   needed here) or in a WhatsApp/Notion queue first, confirms the money arrived, taps **Mark paid**;
   `paidUntil` extends by one month per branch-month purchased; a `billing_events` row records who did it.
4. 7 days before expiry: reminder in app and (manual, by Megz) on WhatsApp. After expiry: 7-day grace,
   then plan reverts to free limits (data kept, creates blocked).

Security: payment screenshots are private objects (not public URLs like dress images), the console is
`platformProcedure` only, and nothing in the browser can set `paidUntil`. Card-based self-billing (Paymob)
stays deferred as already decided.

---

## 6. Duplicate free-account detection (lower priority)

Goal: stop one atelier collecting unlimited free tenants, **without** surveillance. Free-tier limits are
small, so abuse is low-value; do the cheap, transparent things only.

| Signal | Use | Privacy / legal stance |
|---|---|---|
| **Normalised phone** (`phone.ts` key) | One free tenant per phone; hard rule | Phone is already collected, with consent, for contact |
| **Verified email** (normalise Gmail dots/`+tag`) | One free tenant per verified email | Same |
| **WhatsApp reachability** | Megz's own first message acts as a verification; no paid OTP at first | No extra data |
| Business name + city similarity, same Instagram/Facebook URL | **Flag for human review**, never auto-block | Public business info the user supplied |
| Hashed IP + time window | Rate limiting only, 24h TTL, never stored with the account | Short retention, stated in privacy page |
| Browser fingerprinting, device IDs, cross-site tracking | **Not used** | Intrusive, weak legal footing under the PDP Law, easy to defeat |

Outcome of a hit is a **review flag + a friendly "you already have an account, sign in or message us"
screen**, not a silent ban. Appeals go through WhatsApp.

---

## 7. Workstream sequencing and rough effort

Efforts are single-developer rough guesses, not commitments.

| Step | What | Depends on | Rough size |
|---|---|---|---|
| S0 | Spike: PGlite + real routers in `/try` (decides option A vs B) | none | 1-2 days |
| S1 | Sandbox shell: `(sandbox)` route group, device frame iframe, three layouts, reset, banner | S0 | 3-4 days |
| S2 | Seed: 1 demo owner, 2 branches, ~15 dresses with bundled photos, a few customers/reservations | S0 | 2 days |
| S3 | Tour engine + 7 tasks + `data-tour` attributes + bilingual copy | S1, S2 | 4-5 days |
| S4 | Playwright walkthrough of every task in CI (desktop, tablet, mobile viewports, EN + AR) | S3 | 2 days |
| S5 | Questionnaire UI + consent + API call (this repo) | none | 2 days |
| S6 | Lead endpoint on gateling.com (separate repo; includes dedupe, rate limit, discovery mapping) | none | 2-3 days |
| S7 | Landing integration in `landing-glossgenius`: CTA to `/try`, later swap the hero phone | S3 | 1-2 days |
| **Gate** | **3 paying managed shops, or Megz overrides** | - | - |
| M | Multi-tenant steps 01-19, then 20-31 | gate | per existing plan; the largest item by far |
| S8 | Plan limits + upgrade sheet + invoices + minimal platform console | M | 5-7 days |
| S9 | Self-serve apex signup wired to tenant creation (multi-tenant step 29) | M, S5 | in M |
| S10 | Duplicate-account checks | S9 | 2 days |

UI work follows the project UI gate: `/ui-scan --plan` before, `/ui-scan` after on each touched file,
RTL designed in (flip icons that imply direction; phone, email, URL are LTR islands; no fixed pixel
widths in the guide; step cards slide in from the logical start edge).

No commits, no pushes, no schema pushes and nothing against any live database in this planning step.

---

## 8. Risks overall

1. **Building self-serve before anyone pays** (the original tension). Mitigated by Phase A and the gate.
2. **Tenant isolation mistakes** on a free, public signup: a breach hits strangers, not one friendly
   client. Hence the isolation suite (step 19) is a hard prerequisite for Phase C.
3. **Sandbox drift** from the real app. Mitigated by option B, or by the CI walkthrough if A.
4. **Free tier support load** on a one-person business. Cap with limits, WhatsApp-only support, and a
   public "free tier is self-serve, no onboarding calls" line.
5. **Pricing in USD vs EGP**: the "about $10" label will go stale as the pound moves. Keep EGP canonical,
   review the label on a schedule.
6. **Legal**: PDP Law consent and any retention of payment screenshots need review.

---

## 9. Decisions Megz needs to make

1. **Sequence**: approve A then B then C, or go multi-tenant first? (Recommended: A first, gate = 3
   paying managed shops.)
2. **Gate wording**: is the gate "3 paid managed installs", or something softer like "N qualified signup
   leads asking for self-serve"?
3. **Sandbox data layer**: accept the 1-2 day spike on PGlite + real routers, with fallback to a fake tRPC
   link (A)? Or pick A now for a smaller bundle?
4. **Layouts**: §3.4 now follows Megz's own description (desktop: steps beside a left phone; tablet:
   steps above, scroll to phone; mobile: phone as big as possible). Steps that drive the app (navigate,
   open the modal) are assumed; confirm.
4b. **Account model**: one owner account owns many branches; more branches mean a higher plan (500 EGP per
   branch per month). Matches the multi-tenant plan (tenant = the owner's account, branches inside it);
   confirm that "organization" in the UI means the tenant, not a branch.
5. **Lead API host and name**: confirm `gateling.com` (not "gatelink.com") and the endpoint path; and
   whether writing a discovery contact automatically is wanted or only a sales lead.
6. **Questionnaire**: approve the 8 questions and final Arabic wording; keep the price-reaction tap?
7. **Free tier counting rules**: does an archived branch count? Do cancelled/deleted reservations count
   towards the 20/month? Are dresses counted if hidden?
8. **Paid plan details**: annual discount? a trial of paid features? minimum billing period?
9. **Payment handling**: InstaPay address and Vodafone Cash number to publish; who confirms payments and
   how fast (SLA to state in the UI)?
10. **Duplicates**: OK to rely on phone + verified email + human review only, with no fingerprinting?
11. **Legal check**: who reviews the consent text and privacy page for the PDP Law?
