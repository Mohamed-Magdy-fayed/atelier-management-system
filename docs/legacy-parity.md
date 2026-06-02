# Legacy parity (dress-rental-system)

When porting behavior or UI, treat **`dress-rental-system`** (sibling repo on the same machine) as the reference for **what operators expect**. The upgraded app lives only in **`atelier-management-system`**.

Schema and naming changes belong in this repo (Drizzle + data migration scripts), not in the legacy repo.

See also [`system-upgrade-plan.md`](system-upgrade-plan.md) for migration phases and active-branch rules.

---

## Active branch (must match legacy semantics)

| Concern | Rule |
|---------|------|
| Operational lists | Dresses, reservations, payments, rental customers, and dashboard metrics are scoped to the **active branch** (`branchId` on every list/export/formData input). |
| UI | Branch manager dropdown; `useBranch()` → `activeBranch.id` on all table pages under `src/features/system/*/admin/*-table-page.tsx`. |
| Server | `buildWhere()` in each entity’s `server/filters.ts` applies `eq(table.branchId, input.branchId)` when set. |
| Employees | Cannot use “all branches”; must pass assigned branch. Admins may omit `branchId` on some admin lists. |
| Writes | Create/update dialogs set `branchId` from the active branch. |
| QA | Switch branch A → B: counts and rows must change; new reservation must store active branch’s `branchId`. |

Helpers: `src/features/system/shared/staff-access.ts` (`assertOperationalStaff`, `resolveListBranchId`, `assertUserCanAccessBranch`).

---

## Admin tables

| Rule | Detail |
|------|--------|
| Column pinning | Select column **inline-start**, actions **inline-end**; use `getEntityColumnPinning()` from `src/features/core/data-table/lib/entity-column-pinning.ts` on every entity table. |
| Pinned backgrounds | Pinned cells need **opaque** backgrounds so content does not bleed through on scroll/hover (match legacy tables). |
| Faceted filters | Long option lists: cap popover height and use **`ScrollArea`**. |
| Filter “Clear” | Draft filter selections should reset without requiring **Apply** first (public browse and grid filters). |

---

## Branches

- **Short code** on the branch record is used when generating reservation/dress codes (not name initials).
- Branch form: **`MobileField`** for phone; working hours stored as DB timestamps (locale formats display); map link as URL when applicable.
- Row actions: `setActive`, `edit`, `delete` (registry).

---

## Dresses

- Admin **dress code** field opens the dress detail modal; **generate code** button like legacy (`generate-dress-code.ts`).
- Image upload via Cloudinary field pattern (`dress-images-field.tsx`).
- Availability conflicts surfaced in UI (`dress-availability-checker.tsx` uses shadcn `Alert`).
- When submit is disabled (e.g. no active branch), show **why** in an `Alert`.

---

## Reservations

- Create/edit: **multistep** flow aligned with legacy (customer → dress/dates → payment notes).
- Dress picker: searchable select + **input-group addon** opening dress modal.
- **Occasion date**: date only; **receive/return**: date **and** time with legacy-style defaults.
- Customer step: **phone** input; notes as **textarea**.
- Row actions (registry): `info`, `receipt`, `edit`, `updateStatus`, `collectPayment`, `delete` (delete **admin-only**).
- Bulk: `updateStatus`, `delete` (delete admin-only).
- **Receipt**: printer-optimized layout in `src/features/system/reservations/components/receipt/` — do not degrade for screen-only preview; full receipt not always visible inside create modal.
- Reservation **search** on server lists where legacy had search.

---

## Payments

- Transactional **server-mode** table; registry row actions `info` only; bulk `export` when selection enabled.

---

## Employees / users

- Employees table: **branches** column; multiselect branch filter = **OR** across selected branches; badges stack (max 2 visible + overflow).
- Edit employee: **multiselect branch assignment**; must show existing assignments when opening edit.
- Import via `UsersImportButton` (`src/features/core/import-review`).

---

## Dashboard

- Period summary and KPI layout should follow legacy dashboard intent (single-month calendar, filter set, dress performance criteria).
- Featured/public “best feedback” sort should use the **same performance criteria** as dashboard where applicable.

---

## Settings

- Row: `info`, `edit`; bulk: `enable`, `disable` from action bar.
- Copy: professional tone (e.g. “configure your system settings here”), not casual filler.

---

## Theme

- Preserve **legacy color theme** intent via `src/features/core/color-theme` when changing global styles.
- Light theme: improve **input border visibility** only — do not regress overall input styling.
- Customer-facing scrollbars should match system-pages styling.

---

## Data migration

- Scripts: `scripts/migrations/` (e.g. `migrate-legacy.ts`); `LEGACY_DATABASE_URL` + `DATABASE_URL`.
- Order: branches → dresses/customers → reservations → payments → users/credentials.
- Preserve **`branchId`** on every branch-scoped row.
- Production-like envs: prefer **settings-only** or minimal seed, not full demo seed (`docs/seeding-and-demo-data.md`).
