# Multi-tenant conversion — progress tracker

Work top to bottom. Full prompts live in [PLAN.md](./PLAN.md) under the matching step heading.

**Per step:** tick `Started` when you paste the prompt into a new session → tick `PR` when the PR is
open → tick `Merged` only after the step's Acceptance and Review focus in PLAN.md are satisfied.
A step is safe to begin only when everything in its `After` column is **Merged**.

Never re-paste a prompt whose `Started` box is ticked — check here first.

---

## P0 — Verification and free wins · *reversible, no schema change*

| ✅ | Step | Title | After | Started | PR | Merged |
|---|---|---|---|---|---|---|
| ☐ | 01 | Migration safety gate and backup | — | ☐ | ☐ | ☐ |
| ☐ | 02 | Close the unauthenticated upload hole | — | ☐ | ☐ | ☐ |
| ☐ | 03 | Rename `funtastic` → `gateling-atelier` | — | ☐ | ☐ | ☐ |
| ☐ | 04 | Break the `auth/` barrel import cycle | — | ☐ | ☐ | ☐ |
| ☐ | 05 | Two-tenant seed profile skeleton | — | ☐ | ☐ | ☐ |

01–05 are independent and may run in parallel.

**Gate before P1:** Step 01's report must show `db:generate` clean, a reconciled introspect diff, and
a green from-zero `db:migrate`. Do not start Step 06 otherwise.

---

## P1 — Schema and backfill

| ✅ | Step | Title | After | Started | PR | Merged |
|---|---|---|---|---|---|---|
| ☐ | 06 | Tenancy tables, additive and nullable *(0014)* | 01, 04 | ☐ | ☐ | ☐ |
| ☐ | 07 | Backfill tenant #1 *(0015)* ⚠️ | 06 | ☐ | ☐ | ☐ |
| ☐ | 08 | Tighten and swap constraints *(0016)* 🛑 | 07 | ☐ | ☐ | ☐ |
| ☐ | 09 | Tenant-aware seeds | 08, 05 | ☐ | ☐ | ☐ |

⚠️ Step 07 needs a human answer: **which email owns tenant #1.** Have it ready before you start.
🛑 **Step 08 is the point of no return.** Confirm a restored-and-tested backup exists before merging.

---

## P2 — Tenant resolution and context · *additive, still one tenant*

| ✅ | Step | Title | After | Started | PR | Merged |
|---|---|---|---|---|---|---|
| ☐ | 10 | Host parsing and reserved slugs | 08 | ☐ | ☐ | ☐ |
| ☐ | 11 | Tenant resolver with Redis cache | 10 | ☐ | ☐ | ☐ |
| ☐ | 12 | Tenant in the tRPC context | 11 | ☐ | ☐ | ☐ |
| ☐ | 13 | The procedure ladder | 12 | ☐ | ☐ | ☐ |
| ☐ | 14 | TenantProvider and tenant-aware shell | 12 | ☐ | ☐ | ☐ |

13 and 14 may run in parallel after 12.

---

## P3 — Authorization refactor · *the risky phase*

**Decide before starting Step 15:** red CI on `main` until Step 19, or a long-lived integration
branch that 15–19 merge into. Write the choice here: `__________`

| ✅ | Step | Title | After | Started | PR | Merged |
|---|---|---|---|---|---|---|
| ☐ | 15 | Compiler sweep: required `tenantId` filter param | 13 | ☐ | ☐ | ☐ |
| ☐ | 16 | Rewrite `staff-access.ts` | 15 | ☐ | ☐ | ☐ |
| ☐ | 17 | Rewrite `branch.ts` active-branch machinery | 16 | ☐ | ☐ | ☐ |

### Step 18 — one PR per domain *(after 16; order within the group is free)*

| ✅ | Domain | Started | PR | Merged | Errors left |
|---|---|---|---|---|---|
| ☐ | branches | ☐ | ☐ | ☐ | |
| ☐ | dashboard | ☐ | ☐ | ☐ | |
| ☐ | dresses | ☐ | ☐ | ☐ | |
| ☐ | expenses | ☐ | ☐ | ☐ | |
| ☐ | payments | ☐ | ☐ | ☐ | |
| ☐ | rental-customers | ☐ | ☐ | ☐ | |
| ☐ | reservations | ☐ | ☐ | ☐ | |
| ☐ | settings | ☐ | ☐ | ☐ | |
| ☐ | users | ☐ | ☐ | ☐ | |
| ☐ | customer-portal | ☐ | ☐ | ☐ | |

Substitute the domain name into the Step 18 prompt. Log the remaining Step-15 error count each time —
it must trend to zero. **Do not batch domains into one PR.**

| ✅ | Step | Title | After | Started | PR | Merged |
|---|---|---|---|---|---|---|
| ☐ | 19 | Cross-tenant isolation test 🚦 | all 18, 17, 09 | ☐ | ☐ | ☐ |

🚦 **P3 exit criterion.** Step 19 does not count as merged until the suite has been shown to *fail*
when a tenant predicate is deliberately removed. `typecheck` must be fully green here.

---

## P4 — Route move and subdomain fallout

| ✅ | Step | Title | After | Started | PR | Merged |
|---|---|---|---|---|---|---|
| ☐ | 20 | Move routes under `app/s/[subdomain]/` | 19 | ☐ | ☐ | ☐ |
| ☐ | 21 | Proxy: subdomain detection and rewrite | 20 | ☐ | ☐ | ☐ |
| ☐ | 22 | OAuth cross-host handoff | 21 | ☐ | ☐ | ☐ |
| ☐ | 23 | Cookie scoping and WebAuthn RP ID | 21 | ☐ | ☐ | ☐ |
| ☐ | 24 | Cache-tag tenant audit | 21 | ☐ | ☐ | ☐ |
| ☐ | 25 | Vercel wildcard domain setup | 21 | ☐ | ☐ | ☐ |

22–25 may run in parallel after 21. Step 22 needs a Google Cloud console change (the new redirect
URI) — schedule it as a deploy step, not a code step.

---

## P5 — Integrations and branding

| ✅ | Step | Title | After | Started | PR | Merged |
|---|---|---|---|---|---|---|
| ☐ | 26 | Firebase tenant path scheme + overwrite confirm | 19, 02 | ☐ | ☐ | ☐ |
| ☐ | 27 | WhatsApp config into settings, write-once secrets | 19 | ☐ | ☐ | ☐ |
| ☐ | 28 | Inngest, email identity, format, registry | 19 | ☐ | ☐ | ☐ |

26–28 are independent.

---

## P6 — Onboarding and the real test

| ✅ | Step | Title | After | Started | PR | Merged |
|---|---|---|---|---|---|---|
| ☐ | 29 | Apex marketing surface and tenant signup | 25, 22 | ☐ | ☐ | ☐ |
| ☐ | 30 | Tenant-scoped member signup and invites | 29 | ☐ | ☐ | ☐ |
| ☐ | 31 | Second-tenant acceptance ✅ | 30, 19 | ☐ | ☐ | ☐ |

✅ Step 31 is the acceptance test for the entire project. Do not close it with known leakage.

---

## P7 — Deferred, scheduled separately

| ✅ | Item | Notes |
|---|---|---|
| ☐ | Postgres RLS | The only *prevention* mechanism; Step 19 is only detection. Seam is in PLAN.md §K. Give it a date. |
| ☐ | Platform admin console + audit-log UI | Tables and grant design land in P1/P2; the console is later. |
| ☐ | Paymob billing | Namespace away from the existing `payments` domain. See PLAN.md "Deferred". |
| ☐ | Self-serve custom domains | Wildcard certs don't cover them. One manual domain only, from Step 25. |

---

## Log

Append a line per merged PR: `NN · <date> · <PR link> · <anything that surprised you>`

```
```
