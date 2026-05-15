# Atelier Management System — upgrade plan (Dress Rental → Template)

This document is the **single handoff** for porting **`dress-rental-system`** onto the **`atelier-management-system`** codebase (clone of the Funtastic-style Next.js template). Follow it in order unless a phase explicitly allows parallelism.

---

## 1. Repositories and roles

| Path | Role |
|------|------|
| `C:\Users\moham\OneDrive\Desktop\apps\atelier-management-system` | **Working product** — all implementation happens here. |
| `C:\Users\moham\OneDrive\Desktop\apps\funtastic` | **Reference template only** — pull updates if needed; do not treat it as the migration target. |
| `C:\Users\moham\OneDrive\Desktop\apps\dress-rental-system` | **Legacy source of truth** for behavior, routes, and **current** DB shape (table/column names, enums). |

Do **not** rename concepts in the legacy repo. When the new app needs different names/types, resolve that in **this** repo via schema + **data migration scripts**.

---

## 2. Principles (non-negotiable)

### 2.1 Schema migrations

1. Define tables in **Drizzle TypeScript** under `src/drizzle/schemas/` (matching existing layout).
2. Run **`npm run db:generate`** (`drizzle-kit generate`) so SQL lives under `src/drizzle/migrations/` as generated artifacts.
3. Apply with **`npm run db:migrate`** (or project-standard migrate command).

**Do not** hand-write additive migration `.sql` files as the default workflow. Exceptions: rare manual fixes **only** when Drizzle cannot express the change sanely — document why in the PR/commit body.

### 2.2 Data migrations (legacy → new)

Anything that moves **rows** from the old database into the new shape is **not** a Drizzle schema migration. Implement as:

- **`tsx` scripts** under e.g. `scripts/migrations/` (exact folder name optional but keep them isolated), or
- One-shot SQL **run deliberately** after schema migrate,

reading **`dress-rental-system`** tables as-is and writing into **`atelier-management-system`** tables.

Scripts should:

- Accept **`DATABASE_URL`** (new DB) and **`LEGACY_DATABASE_URL`** (old DB), or dump/input paths — choose one pattern and stick to it.
- Run in **dependency order** (e.g. branches → dresses/customers → reservations → payments → users/credentials).
- Be **idempotent** where possible (safe re-run with upserts / existence checks), or clearly documented as single-run.
- **Preserve `branchId` on every branch-scoped row** (dresses, rental customers, reservations, payments). The app filters almost all operational lists by the **active branch** — wrong or missing `branchId` means “empty” screens after migrate even when data exists.

### 2.3 Active branch scoping (legacy and upgraded — same product rule)

Both **dress-rental-system** and **atelier-management-system** are **multi-branch**: users work in one branch at a time, and **list/read queries only show that branch’s data** (unless an admin explicitly views all branches in legacy).

| Layer | Legacy (`dress-rental-system`) | Upgraded (`atelier-management-system`) |
|-------|-------------------------------|----------------------------------------|
| **UI selection** | Branch switcher; cookie `active-branch-id` | Branch manager dropdown; current branch on `getBranches()` → `activeBranch` |
| **Server reads** | `getBranchSelection()` → `eq(table.branchId, selection.branch.id)` when `mode === "single"`; employees: `eq(users.branchId, …)` | tRPC list/export `input.branchId` from client; **employees** via `branch_memberships` join |
| **Client lists** | Server actions load data after branch resolve | `useBranch()` → pass `branchState.activeBranch.id` into `trpc.*.list` / `exportRows` / `formData` |
| **Server writes** | `requireActiveBranch()` / `requireActiveBranchId()` on create | Mutations use `branchId` from form payload (set from active branch in dialogs) |
| **Admin “see all”** | `getBranchSelection().mode === "all"` (no `branchId` filter) | Today: lists still pass **one** `branchId` when a branch is selected; no “all branches” aggregate on domain tables yet |

**Upgraded code paths (when adding features, follow the same pattern):**

1. **Table pages** — `src/features/system/*/admin/*-table-page.tsx`: read `branchId` from `useBranch()` and include it in every list/export query input.
2. **Server filters** — `src/features/system/*/server/filters.ts`: `buildWhere()` must apply `eq(*Table.branchId, input.branchId)` when `input.branchId` is set (dresses, reservations, payments, rental customers).
3. **Forms / dropdown data** — e.g. `reservations.formData`, dress pickers: scoped with the same `branchId`.
4. **Registry** — `src/features/system/registry/entities.ts`: entities marked `branchScope: "branch-aware"` must never query branch-scoped tables without `branchId`.

**Data migration implication:** legacy rows already carry `branchId` (or `users.branchId` for membership). The migrate scripts copy those IDs unchanged (with fallback when legacy `branchId` is invalid). After migrate, **always pick the correct branch in the UI** before expecting dresses/reservations/customers to appear.

**QA:** sign in → select branch A → note counts → switch to branch B → lists and filters must change; create a reservation → it must be stored under the active branch’s `branchId`.

### 2.4 Template vs domain feature work

| Situation | Action |
|-----------|--------|
| Feature exists in template **and** is sufficient | Reuse; add **data migration** from legacy where columns differ. |
| Feature exists in template but is **wrong for the product** (e.g. generic catalog) | **Remove** from nav, registry, permissions, routes, seeds — do not leave dead “Products” UX for an atelier. |
| Feature exists in legacy **only** | Add using **`docs/entity-blueprint.md`** (intake questions, registry, server modules, admin UI layers, i18n parity). |

### 2.5 Framework and docs

- Read `AGENTS.md` at repo root before changing Next.js behavior; for unfamiliar APIs consult `node_modules/next/dist/docs/` in this repo (template may differ from public Next docs).
- New admin entities: **`docs/entity-blueprint.md`** is mandatory.

---

## 3. Phase 0 — Baseline verification

- [x] `npm install` in `atelier-management-system`.
- [x] `npm run typecheck` green; `npm run build` may need optional env (e.g. Cloudinary).
- [ ] `docker-compose` / DB from `docker-compose.yml` documented in your env (`.env` / `.env.local`); never commit secrets.

---

## 4. Phase 1 — Legacy inventory (read-only)

In **`dress-rental-system`**, produce a short internal map (can live in `docs/legacy-inventory.md` **only if the team wants it** — otherwise keep in PR description / issue):

### 4.1 Routes (app directory)

Confirmed system routes (adjust if you find more):

- `(system-pages)/dashboard`
- `(system-pages)/dresses`
- `(system-pages)/reservations`
- `(system-pages)/customers`
- `(system-pages)/users`
- `(system-pages)/branches`
- `(system-pages)/payments`
- `(system-pages)/settings`
- `auth/sign-in`
- `view-dress/[dressId]` (likely catalog-style public/internal view)

### 4.2 Drizzle modules (legacy)

Under `src/drizzle/schemas/`:

- `auth/users-table` — roles `admin`/`user`, inline `password`/`salt`, `screens[]` enum, `branchId`
- `branches/branches-table`
- `dresses/dresses-table`
- `reservations/customers-table`, `reservations/reservations-table`, `reservations/payments-table`
- `core/setteings-table` (typo preserved in legacy — reference exact table name when migrating)

Capture **PostgreSQL table names**, **column names**, **enums**, and **FK order** for Phase 6 scripts.

### 4.3 Behavioral notes

- Reservation statuses: `reserved`, `pickedUp`, `returned`, `cancelled`.
- Payments: types `deposit`, `finalPayment`, `penalty`, `insurance`; methods `instapay`, `mobileWallet`, `visa`, `cash`.
- Legacy IDs are **varchar UUID-shaped** helpers — template uses **uuid** columns in many places; normalization strategy belongs in data migration code.

---

## 5. Phase 2 — Trim template features not needed for core atelier MVP

Remove **Products** as a first-class admin entity unless product explicitly keeps a generic catalog:

- Nav / `SYSTEM_SCREEN_DEFINITIONS` / `SYSTEM_ENTITY_REGISTRY`
- Routes under `(system-pages)/products`
- Server/router modules wired only to products
- Seeds referencing products
- Permission rules mentioning `products` (employees/customers roles)

Replace with **dresses** (or reserve slug/route after Phase 7 schema work). Goal: **no orphan screens** — delete routes and registry entries together.

Repeat for any other demo-only entities that do not exist in legacy.

---

## 6. Phase 3 — Target schema design (`atelier-management-system`)

Implement domain tables **after** comparing legacy columns to template conventions:

**Likely additions** (names illustrative — finalize in Drizzle):

- `dresses` — map from legacy `dresses` (branch-scoped inventory).
- `reservations` — map legacy lifecycle and monetary fields; align enums with Drizzle `pgEnum`.
- `payments` — preserve legacy enums or map with explicit translation tables in migration scripts.
- **CRM customers**: legacy `customers` is **not** the same as template `users` with `role = 'customer'` (legacy customers are operational walk-ins with `(branchId, phone)` uniqueness). **Decision required**:
  - **Option A** — New `customers` (or `rental_customers`) table + full entity per blueprint; template “Customers” screen may need to target this table instead of auth users.
  - **Option B** — Migrate legacy customers into `users` with synthetic emails (`{phone}@migrated.local`) and `role: 'customer'`; only if business accepts login/credentials model.

Document the decision in code comments at the migration script entry point.

**Settings**: if legacy `setteings` holds business config, either a key-value table or typed columns — mirror legacy until product renames.

Then: **`npm run db:generate`** → review generated SQL → **`npm run db:migrate`** on dev DB.

---

## 7. Phase 4 — Feature mapping (legacy screen → implementation approach)

| Legacy screen | Template starting point | Work type |
|---------------|-------------------------|-----------|
| Dashboard | `/dashboard` KPIs/widgets | Adapt widgets to reservations, revenue, returns — likely **custom**, not blueprint-only |
| Dresses | *(removed products)* | **New entity** via blueprint + Drizzle |
| Reservations | — | **New entity** (transactional table → prefer **server mode** per blueprint defaults) |
| Customers | `/customers` today targets auth-shaped users | **Reconcile with Phase 6 decision** — may replace data layer entirely |
| Users | `/employees` pattern | Map legacy admin **`users`** → template **`users`** + **`user_credentials`**; map **`screens[]`** → template RBAC (`permissions.ts`, registry) |
| Branches | `/branches` | Reuse + data migration from legacy branches |
| Payments | — | **New entity** or sub-resource of reservations (follow blueprint intake) |
| Settings | — | **New entity** or dedicated settings module |
| Sign-in | auth stack | Port credential verification from legacy password+salt to template **`user_credentials`** hashing — **migration script + login compatibility** |
| `view-dress/[id]` | — | Public or semi-public route — implement with existing layout/auth patterns |

---

## 8. Phase 5 — Authentication and authorization migration

Legacy:

- `user_roles`: `admin`, `user`
- Per-user `screens[]` enum array

Template:

- `user_role`: `admin`, `employee`, `customer`
- Permission maps in `src/features/core/auth/core/permissions.ts` + registry screen keys

Deliverables:

1. **Data migration**: legacy row → template `users` + `user_credentials` (re-hash only if required; preferred: copy salt/hash **only if** algorithms match — verify both codebases).
2. **Authorization mapping table** (doc or code): each legacy `screens` combination → template role + fine-grained permission if needed.
3. Update **seed** actors / admin bootstrap to match new roles.

---

## 9. Phase 6 — Ordered data migration runbook

Run in **staging** first. Suggested order:

1. Branches  
2. Dresses  
3. Customers (per Phase 6 decision)  
4. Reservations  
5. Payments  
6. Users + credentials (+ optional link from operational customer to `user_id` if Option B)  
7. Settings / misc  

After each step: row counts per table, FK integrity check, spot-check UI.

---

## 10. Phase 7 — Internationalization and registry

- Add EN/AR strings for new entities (follow existing message file layout in the repo).
- Register entities in `src/features/system/registry/entities.ts` and screens in `screens.ts`.
- Dashboard cards: align keys with translation files.

---

## 11. Phase 8 — QA checklist

- [ ] Admin login with migrated admin user  
- [ ] Employee-equivalent role sees correct subset (no branches/products if restricted)  
- [ ] Branch switcher + scoped lists match legacy semantics  
- [ ] CRUD dresses/reservations/customers/payments/settings parity with legacy flows  
- [ ] Reservation overlap rules (if any in legacy) preserved or consciously changed  
- [ ] Public `view-dress` behavior  
- [x] `npm run typecheck` (run `npm run lint` / `npm run build` before release)  
- [ ] Fresh migrate + seed smoke test  

---

## 12. Definition of done

- Template **products** (and similar non-core demo entities) removed or justified.
- **All DDL** applied via Drizzle-generated migrations from TS schema.
- **All legacy row moves** implemented as explicit scripts with env vars and ordering documented above.
- **No renaming inside `dress-rental-system`** — only reads from it.
- New surfaces follow **`docs/entity-blueprint.md`** intake + structure.

---

## 13. Agent prompt snippet (paste into task)

```
Work only in atelier-management-system. Read docs/system-upgrade-plan.md and docs/entity-blueprint.md.
Use dress-rental-system at C:\Users\moham\OneDrive\Desktop\apps\dress-rental-system as read-only legacy reference for routes and Drizzle schemas.
Schema changes: edit Drizzle TS, run npm run db:generate, review migrations, then npm run db:migrate.
Do not hand-write schema migration SQL except documented exceptions.
Legacy data moves: scripts/migrations (or agreed folder) with LEGACY_DATABASE_URL + DATABASE_URL.
Remove template Products and align registry/nav/permissions.
Implement missing legacy screens as blueprint entities.
Before Next APIs: follow AGENTS.md and node_modules/next/dist/docs/.
```

---

---

## 14. Session handoff — what was done & how to repeat

This section captures the **actual upgrade session** (dress-rental → atelier template) so the next migration or environment setup is straightforward.

### 14.1 Tooling

| Item | Value |
|------|--------|
| Package manager | **`npm`** (not pnpm) |
| Target app | `atelier-management-system` |
| Legacy read-only | `dress-rental-system` |
| Template reference | `funtastic` |

### 14.2 Environment (`.env`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Target Postgres (e.g. `postgresql://root:password@localhost:5432/atelier-management-system`) |
| `LEGACY_DATABASE_URL` | Legacy Neon/production read-only URL |
| Auth / Cloudinary / etc. | As required by template; `build` may fail without optional keys |

Create the target database if missing (`scripts/migrations/ensure-db.ts` was used once when the DB did not exist).

### 14.3 Schema & domain (completed)

1. Removed template **Products** (routes, tRPC, Drizzle, seeds).
2. Added Drizzle domain under `src/drizzle/schemas/system/`:
   - `dresses`, `rental_customers` (Option A — not auth users), `reservations`, `payments`, `settings`
3. Applied migration `0003_atelier_domain.sql` via `npm run db:migrate`.
4. Legacy varchar UUIDs → target `uuid` in data scripts.

### 14.4 Legacy data migration (completed on dev)

**Order** (see `scripts/migrations/README.md`):

1. `branches` → `users` → `user_credentials` → `branch_memberships` → `dresses` → `rental_customers` → `reservations` → `payments` → `settings`

**Commands used:**

```bash
npm install
npm run db:migrate

# Optional: wipe seed/demo data before import
npm run seed:clear

# Full import (clears migration state + domain tables when using --fresh)
npm run migrate:legacy -- --fresh

# Dry run (no writes)
npm run migrate:legacy:dry
```

**Credential rule:** legacy `users.password` + `users.salt` → `user_credentials.passwordHash` + `passwordSalt` (same scrypt; no re-hash).  
**Roles:** legacy `admin` → `admin`, legacy `user` → `employee`.

**Sign-in after migrate:** use **migrated legacy user emails**, not `SEED_ADMIN_EMAIL` from `src/drizzle/seed/constants.ts` if seeds were cleared.

#### Active branch and migrated data

This is the most common “migration succeeded but the app looks empty” issue:

1. **Every operational row needs a valid `branchId`** on the target DB (`dresses`, `rental_customers`, `reservations`, `payments`). Scripts copy legacy `branchId`; invalid values (e.g. legacy `"default"`) are mapped to the **first migrated branch** — see `scripts/migrations/lib/steps.ts`.
2. **Users need a current branch** — `branch_memberships` + `branches.ownerId` / `isCurrent` (step `branch_memberships` after `users`). Without a selected branch, list pages do not send `branchId` and branch-aware queries return nothing useful.
3. **After import, use the branch switcher** (top bar) and select the branch that owns the data you expect. Legacy behaved the same way: lists were filtered by `getBranchSelection()` / active branch cookie, not “whole database.”
4. **Do not compare row counts globally** during verify vs a single branch in the UI — verify script counts all branches; the UI counts one branch at a time.

### 14.5 Admin features (completed baseline)

| Screen | Route | Notes |
|--------|-------|--------|
| Dresses | `/dresses` | CRUD, bulk active/archive, dress view modal |
| Reservations | `/reservations` | List + full row actions (info, receipt, edit, status, collect payment, delete) |
| Rental customers | `/rental-customers` | List/export; `/customers` redirects here |
| Payments | `/payments` | List/export |
| Settings | `/settings` | CRUD |
| Branches / Employees | `/branches`, `/employees` | Template + migrated data; **employees list filtered by active branch** (`branch_memberships`) |

Follow **`docs/entity-blueprint.md`** for any new entity.

### 14.6 UX / theme parity (completed in session)

- **Theme:** legacy blue primary, dark black cards, `1.3rem` radius — `src/app/globals.css` + Open Sans in `src/app/layout.tsx`.
- **Reservations table:** financial columns, status badges, dress link → view modal.
- **Reservation form:** sectioned create (dress/dates, customer, payment); edit when `reserved`.
- **Row actions:** match legacy dropdown (info, receipt, status submenu, collect payment, delete).

### 14.7 Filter parity (legacy vs upgraded)

Legacy used **per-column** filters in the data-table toolbar (`variant: text | select | dateRange`). The upgraded app uses **toolbar chips** (`DataTableFacetedFilter`, `DataTableDateRangeFilter`, `DataTableNumberRangeFilter`) + **server-side** `columnFilters` in tRPC list queries.

| Screen | Legacy filters | Upgraded filters (toolbar) | Notes |
|--------|----------------|----------------------------|--------|
| **Reservations** | Status, dress, receiving / occasion / return / created date ranges; text on code, name, phone | Status, dress, receiving, occasion, return, created date | Text search → **global search** (code, name, phone) |
| **Dresses** | Text on code, title, color, size; date on created | Active, price/day range, created date | Text → **global search** (code, title, color, size) |
| **Payments** | (list filters) | Type, method, created date | |
| **Rental customers** | — | Created date | |

**Implementation files:**

- UI: `src/features/system/*/admin/components/*-grid-filters.tsx`
- Server: `src/features/system/*/server/filters.ts`
- Registry catalog: `src/features/system/registry/entities.ts` → `filters` array per entity

When adding a filter: (1) add column with matching `accessorKey` / `id`, (2) add chip in `*-grid-filters.tsx`, (3) handle `columnFilters` in `filters.ts` `buildWhere`, (4) update registry `filters` list.

### 14.8 Still open (optional next passes)

- [ ] Reservation **3-step wizard** with live receipt preview (legacy `reservations-form.tsx`)
- [ ] Dress **availability calendar** on booking (`getDressReservationsDates`)
- [ ] **WhatsApp** receipt send on create
- [ ] Public **`/view-dress/[id]`** route
- [ ] Dashboard KPI parity with legacy
- [ ] Legacy `screens[]` → template RBAC fine-grained mapping (beyond role migrate)
- [ ] Per-column **text** filters (if product wants them instead of global search only)
- [ ] Column **sum** footer on money columns (legacy `meta.sum`)

### 14.9 QA quick checklist

```bash
npm run typecheck
npm run dev
```

1. Sign in with migrated admin.  
2. **Select the active branch** that has migrated data (branch switcher) — confirm dress/reservation counts match that branch only.  
3. Switch to another branch and confirm lists change (or empty if no rows).  
4. Open Reservations — filters + actions + dress modal.  
5. Create reservation (deposit ≥ 100 EGP) — must appear only under that branch.  
6. Collect payment on a row with balance.  
7. Export CSV from dresses / reservations / payments (export respects active `branchId` too).

### 14.10 Agent prompt (updated)

```
Work only in atelier-management-system. Read docs/system-upgrade-plan.md (§14 handoff) and docs/entity-blueprint.md.
Legacy reference: dress-rental-system (read-only).
Use npm (not pnpm): npm run db:generate, npm run db:migrate, npm run migrate:legacy.
Data: scripts/migrations/ with LEGACY_DATABASE_URL + DATABASE_URL; preserve branchId on all branch-scoped rows.
Branch scoping: active branch filters all list/export queries (legacy getBranchSelection — same rule); pass branchId from useBranch() on every branch-aware tRPC list.
New admin UI: server-side tables + *-grid-filters.tsx + server/filters.ts.
```

---

_Last updated: includes session handoff (schema, migration, UX parity, filters) after dress-rental → atelier upgrade._
