# AGENTS.md — AI replication guide (Funtastic / atelier-management-system)

This file is the **entry point** for any AI agent working in this repository. Read it fully before changing code. It links every convention doc and captures **product rules** agreed in development sessions (including user corrections from prior chats).

**Honest scope:** With this file + linked docs + the existing codebase, an agent can **extend and repair** the system reliably. **Blind greenfield replication** of every line without the repo is not realistic (thousands of files, env secrets, Cloudinary assets). For replication, clone this repo and follow the checklist below.

---

## Quick replication checklist

1. Read **Next.js** note below; check `node_modules/next/dist/docs/` for APIs used here.
2. `npm install` (use **npm**, not pnpm/yarn).
3. Configure env (see [Environment](#environment)); start DB: `npm run db:start`.
4. Schema: `npm run db:migrate` (after `db:generate` when changing Drizzle).
5. Seed: `npm run seed` or `npm run seed:all` — see [`docs/seeding-and-demo-data.md`](docs/seeding-and-demo-data.md).
6. `npm run dev` for local app; **`npm run build`** after substantive changes (required gate).
7. New admin entities: complete intake in [`docs/entity-blueprint.md`](docs/entity-blueprint.md) first.
8. Port legacy behavior: [`docs/legacy-parity.md`](docs/legacy-parity.md) + [`docs/system-upgrade-plan.md`](docs/system-upgrade-plan.md).
9. Always follow [`.cursor/rules/agent-workflow.mdc`](.cursor/rules/agent-workflow.mdc) (forms, alerts, verification, branch rules).

---

## Documentation index (read as needed)

| Document | Purpose |
|----------|---------|
| **This file** | Master map, permissions, entities, session-agreed rules |
| [`.cursor/rules/agent-workflow.mdc`](.cursor/rules/agent-workflow.mdc) | Mandatory workflow: build, forms, alerts, admin screens |
| [`docs/entity-blueprint.md`](docs/entity-blueprint.md) | Adding admin entities (intake, registry, tables, overlay forms, i18n) |
| [`docs/legacy-parity.md`](docs/legacy-parity.md) | Parity with `dress-rental-system` (reservations, receipts, tables, branch) |
| [`docs/public-experience.md`](docs/public-experience.md) | Landing, mobile tabs, catalog, customer portal |
| [`docs/system-upgrade-plan.md`](docs/system-upgrade-plan.md) | Migration from legacy DB, schema phases, trim template |
| [`docs/scaling-guide.md`](docs/scaling-guide.md) | Target architecture, feature folders, scaling principles |
| [`docs/seeding-and-demo-data.md`](docs/seeding-and-demo-data.md) | Seed profiles: `baseline`, `demo`, `performance` |
| [`docs/implementation-roadmap.md`](docs/implementation-roadmap.md) | Planned work (may lag code) |
| [`docs/demo-readiness-checklist.md`](docs/demo-readiness-checklist.md) | Demo QA |
| [`src/features/core/import-review/README.md`](src/features/core/import-review/README.md) | CSV import-review feature |
| [`src/features/core/import-review/AGENTS.md`](src/features/core/import-review/AGENTS.md) | Import-review agent rules |

When you learn a **repeatable** convention, update `agent-workflow.mdc` and, if product-wide, this file or the relevant doc.

---

## Product identity

- **Brand:** Funtastic (package name `funtastic`; repo folder `atelier-management-system`).
- **Domain:** Multi-branch **dress rental atelier** — inventory, reservations, payments, rental customers, employees, branches, settings.
- **Languages:** Full **English + Arabic** parity (`src/features/core/i18n/global/en.ts`, `ar.ts`).
- **Roles on `users`:** `admin`, `employee`, `customer` (customers also linked via `rental_customers`).
- **Not in scope for MVP:** Generic e-commerce checkout on the public site; template “Products” catalog was removed in favor of dresses.

**Reference repos** (read-only; paths from upgrade plan):

| Path | Role |
|------|------|
| `dress-rental-system` | Legacy behavior & old DB shape |
| `funtastic` | Original template reference (optional updates) |
| **This repo** | All implementation |

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js **16** (App Router) — **not** the Next.js from training data |
| UI | React 19, Tailwind 4, shadcn/ui, Base UI / Radix |
| API | tRPC 11 + TanStack Query |
| DB | PostgreSQL, Drizzle ORM, drizzle-kit migrations |
| Auth | Custom Next.js auth (`src/features/core/auth`) — sessions, OAuth, passkeys, email verify |
| Jobs | Inngest (`src/integrations/inngest`) |
| Lint/format | Biome |
| Forms | TanStack Form via `useAppForm` (`src/components/forms`) |
| Tables | TanStack Table via `src/features/core/data-table` |

---

## Environment

Server env is validated in `src/env/server.ts` and `src/env/client.ts` (T3 `createEnv`). Typical needs:

- `DATABASE_URL` (or split `DB_*` vars)
- `BASE_URL`, `JWT_SECRET_KEY`, Redis (`REDIS_URL`, `REDIS_TOKEN`)
- Google OAuth, optional SMTP, Wapilot, Cloudinary (for dress images)

Use `.env.local` locally; never commit secrets. Optional services may block `npm run build` until configured (e.g. Cloudinary).

---

## Commands (npm)

| Script | Use |
|--------|-----|
| `npm run dev` | Local development |
| `npm run build` | **Required** verification after substantive changes |
| `npm run typecheck` | TypeScript only |
| `npm run lint` / `npm run check` | Biome |
| `npm run db:generate` | Drizzle migration SQL from schema changes |
| `npm run db:migrate` | Apply migrations |
| `npm run db:push` | Push schema (dev only; prefer generate+migrate) |
| `npm run seed` / `seed:all` / `seed:clear` | Seed CLI (`src/drizzle/seed/cli.ts`) |
| `npm run migrate:legacy` | Legacy DB → new DB data script |

On **Windows PowerShell**, chain with **`;`**, not `&&`.

**Agent etiquette:** Prefer file edits over ad-hoc Node/sed one-liners to patch source. Do not run exploratory shell unless needed. User expects **`npm run build`** as the completion signal.

---

## Repository map

```text
src/
  app/
    (auth)/              # sign-in, sign-up, verify-email, reset-password
    (system-pages)/      # admin: dashboard, entities (thin route files)
    (public)/            # landing, browse, locations
    (customer-portal)/   # my-account
    api/trpc/            # tRPC handler
    view-dress/, collection/  # public dress views
  components/
    forms/               # useAppForm, fields, overlay-form
    ui/                  # shadcn primitives
    general/             # system-dialog, etc.
  drizzle/
    schemas/             # auth/, system/ tables
    migrations/          # generated SQL
    seed/                # profiles + cli
  features/
    core/                # app-shell, auth, data-table, i18n, import-review, color-theme
    system/              # business entities + registry + dashboard + shared/staff-access
    public-catalog/      # public browse UX
    customer-portal/     # signed-in customer reservations
  integrations/
    trpc/                # init, routers, client, server
    inngest/
  env/
scripts/migrations/      # legacy data migration (not drizzle-kit)
docs/                    # all architecture & product docs (index above)
.cursor/rules/agent-workflow.mdc
```

**Thin routes:** `src/app/(system-pages)/*/page.tsx` only prefetch + mount feature pages from `src/features/system/*/admin/`.

---

## Architecture rules

1. **Feature-owned logic** — schemas, queries, mutations, routers, admin UI live under `src/features/system/<entity>/`, not in `app/`.
2. **Registry-driven UI** — `src/features/system/registry/entities.ts` and `screens.ts` drive nav, capabilities, labels (do not duplicate capability flags in UI only).
3. **tRPC** — one router file per domain under `src/integrations/trpc/routers/`, composing `src/features/system/<entity>/server/router.ts`.
4. **No giant generic CRUD page** — each entity owns columns, filters, dialogs, row actions.
5. **Schema changes** — edit Drizzle TS → `npm run db:generate` → `npm run db:migrate`. Row moves from legacy DB use `scripts/migrations/`, not hand-written additive SQL as default.

Details: [`docs/entity-blueprint.md`](docs/entity-blueprint.md), [`docs/scaling-guide.md`](docs/scaling-guide.md).

---

## Implemented admin entities (registry)

Source of truth: `src/features/system/registry/entities.ts`.

| Slug | Route | Table mode | Branch scope | Import | Export | Row selection | Notes |
|------|-------|------------|--------------|--------|--------|---------------|-------|
| `customers` | `/rental-customers` | Server | branch-aware | no | yes | no | Rental customers, not auth users |
| `employees` | `/employees` | **Client** | branch-aware | yes | yes | yes | Users with employee role; bulk verify/delete |
| `branches` | `/branches` | Client + URL state | global | no | no | no | Admin-only screen |
| `dresses` | `/dresses` | Server | branch-aware | no | yes | yes | Bulk activate/deactivate/archive |
| `reservations` | `/reservations` | Server | branch-aware | no | yes | yes | Receipt, collect payment; delete admin-only |
| `payments` | `/payments` | Server | branch-aware | no | yes | yes | Mostly read-only row actions |
| `settings` | `/settings` | Server | global | no | no | yes | Admin-only; bulk enable/disable |

**Screens** (nav + permissions): `src/features/system/registry/screens.ts` — includes `dashboard`, `my-account` (customer portal, not in main nav).

**Page headers:** `EntityPageHeader` with entity `slug`. **Info dialogs:** audit-only via `EntityAuditInfoDialog` unless intake says otherwise.

**Page leads:** Avoid vague marketing leads on entity screens; use short instructive copy or none.

---

## Permissions & roles

Defined in `src/features/core/auth/core/permissions.ts`.

| Role | Admin workspace | Notes |
|------|-----------------|-------|
| `admin` | Full screens | Dashboard, branches, employees, settings |
| `employee` | Operational screens only | **Blocked:** `dashboard`, `branches`, `employee` (employees admin), `settings` |
| `customer` | `my-account` only | Public OAuth customers |

**Employee default landing:** **Reservations** (`/reservations`), not customers.

**Server enforcement:**

- Admin-only mutations: settings, branches admin, employees admin, reservation **delete** / bulk delete.
- Operational entities: `assertOperationalStaff` + `resolveListBranchId` / `assertUserCanAccessBranch` in `src/features/system/shared/staff-access.ts`.
- Employees **must** pass `branchId` on lists/mutations; cannot access other branches’ rows.
- Admins may omit `branchId` on some lists; UI still usually sends active branch.

**Branch switcher:** Users without all-branch access must **not** see “all branches” mode. When branches exist, show **select active branch**; “add branch” only when none exist.

---

## Branch-scoped data flow

Every `branchScope: "branch-aware"` entity:

1. Table page: `useBranch()` → include `branchId` in `trpc.*.list` / export / `formData`.
2. Server: `server/filters.ts` → `eq(table.branchId, input.branchId)` when provided.
3. Forms: set `branchId` from active branch on create.

Full tables: [`docs/legacy-parity.md`](docs/legacy-parity.md) § Active branch.

---

## Auth (summary)

Location: `src/features/core/auth/`.

- Sign-in / sign-up / forgot-password / verify-email / reset-password under `src/app/(auth)/`.
- **Sign-in email step:** validate format **client-side only** (no DB lookup on email step); Zod + `translationKey()` + form-level `validators.onSubmit`.
- Multistep sign-in: show validation when **proceeding to next step**, not only on blur of untouched fields.
- **TanStack form fields** (`EmailField`, `PasswordField`, `FormBase`): only `useFieldContext()` — **`useFormContext()` throws** (see agent-workflow). Invalid submit: touch fields via `onSubmitInvalid` + `setFieldMeta`.
- Branch manager, profile, passkeys, OAuth: `src/features/core/auth/nextjs/components/`.
- Profile avatar must show user image when available.

---

## Forms & validation

- User-facing Zod messages: **`translationKey()`** only — never literal English in schemas.
- Inline errors: `FormBase` + `validation-messages.ts` translate keys for active locale.
- Entity modals: **`OverlayFormBody`** + footer **`OverlayFormSubmitButton`** ([`docs/entity-blueprint.md`](docs/entity-blueprint.md) § Overlay forms).
- **`SystemDialog`:** fields in scrollable `children`, actions in `actions`; wrap with `<form.AppForm>` if footer needs `form.Subscribe`.
- Nested dialogs from menus: shared `DialogOverlay` keeps backdrop (`forceRender` default).
- Inline notices: shadcn **`Alert`** (`default` / `destructive`) + icon — not hand-rolled dashed boxes.

---

## Data tables

Shared: `src/features/core/data-table/`.

| Mode | Used by |
|------|---------|
| **Client** (`useDataTable`, full dataset in memory) | `employees` |
| **Server** (`DataTableControlledState`, URL/pagination on server) | dresses, reservations, payments, rental-customers, settings, branches (with URL state) |

- Pinning: `getEntityColumnPinning()` — select start, actions end; opaque pinned cell backgrounds.
- Toolbar = page actions (add, import, export all); row menu = single row; **action bar** = bulk on selection (only if registry enables selection + bulk).
- If `supportsRowSelection: false`, do **not** add select column or action bar (controlled state may still pass empty selection for typing).

Import: [`src/features/core/import-review`](src/features/core/import-review) — `UsersImportButton` for employees.

---

## Public site & customer portal

See [`docs/public-experience.md`](docs/public-experience.md).

---

## Legacy parity & migration

See [`docs/legacy-parity.md`](docs/legacy-parity.md) and [`docs/system-upgrade-plan.md`](docs/system-upgrade-plan.md).

---

## i18n

- Global strings: `src/features/core/i18n/global/en.ts`, `ar.ts`.
- Entity titles/leads/nav: keys referenced from registry (`titleKey`, `leadKey`, etc.).
- System entity copy namespace: `src/features/core/i18n/global` (and entity-specific modules where present).
- Arabic copy must be reviewed for domain terms (e.g. deposit labels use agreed business wording).

---

## Session-agreed instructions (user corrections)

These were requested across development sessions and are **not** optional preferences:

### Agent workflow

- Run **`npm run build`** after substantive changes; fix all errors before done.
- Use normal **file edits**; no ad-hoc Node/sed patch scripts unless user requests a migration script.
- Document new repeatable lessons in **`agent-workflow.mdc`** (and here or blueprint when product-wide).
- **Never** use Framer Motion / `motion.div` for layout — only `div` / `span`.
- Align new/changed system screens with **entity blueprint** and **registry**.

### UI/UX

- shadcn **Alert** for inline notices (see agent-workflow).
- Disabled submit must explain **why** (e.g. missing active branch).
- Faceted filter popovers: max height + **ScrollArea** for long lists.
- Mobile bottom bar: in document flow; main content scrolls above it.
- Public + system mobile: **5-tab** pattern; Auth in **More** on mobile.
- Data table pinning and receipt styling: match **legacy** intent ([`docs/legacy-parity.md`](docs/legacy-parity.md)).

### Permissions & branches

- Employees: no dashboard/settings; default route **reservations**.
- Hide “all branches” for users without global branch access.
- Branch **short code** in generated codes; employee **multiselect** branches on edit.

### Reservations & dresses

- Multistep reservation form, dress modal picker, receipt print layout — see legacy parity doc.
- Dress code field + generate button; admin delete reservation admin-only.

### Public catalog

- No checkout; availability check; hide prices when setting off — see public experience doc.

### Copy

- Bilingual parity; fix wrong Arabic when reported.
- Settings description: professional tone.
- Trim useless entity **lead** paragraphs.

---

## Adding a new admin entity (short)

1. Answer intake questions in [`docs/entity-blueprint.md`](docs/entity-blueprint.md).
2. Drizzle schema → generate → migrate.
3. Add registry entry + screen if needed + permissions.
4. `server/{schemas,queries,mutations,router,types}.ts` + tRPC router wire-up.
5. `admin/` page, columns, filters, form dialog (overlay pattern), row actions, optional import/bulk.
6. Thin `app/(system-pages)/.../page.tsx` with prefetch.
7. EN + AR strings; seed profile if demo-visible.
8. `npm run build`.

---

## Next.js (required notice)

<!-- BEGIN:nextjs-agent-rules -->

This is **not** the Next.js you know. APIs, conventions, and file structure may differ from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next code. Heed deprecation notices. Do not use route segment `revalidate` patterns incompatible with `cacheComponents` if that config is enabled.

<!-- END:nextjs-agent-rules -->

---

## Definition of done (agent task)

- [ ] Request scoped; registry/blueprint followed for entity work
- [ ] Branch and permission rules respected
- [ ] i18n keys for user-facing validation and new UI strings (EN + AR)
- [ ] Overlay forms / alerts / table capabilities match registry
- [ ] **`npm run build`** passes
- [ ] Repeatable lesson added to `agent-workflow.mdc` if discovered

---

## What this documentation does not replace

- **Secrets and production infra** — you must supply env and external services.
- **Exact visual parity** without comparing to running app or `dress-rental-system`.
- **Every file path** — use search and registry; features folder is the catalog of implemented behavior.
- **Stale roadmap items** — prefer code + registry over `implementation-roadmap.md` when they conflict.

For a new agent with **this repo checked out**, following this file and linked docs is sufficient to **continue development in the same style** and to **re-implement missing pieces** entity-by-entity using the blueprint and legacy parity guides.
