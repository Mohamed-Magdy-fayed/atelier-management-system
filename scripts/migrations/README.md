# Legacy data migration

Moves row data from **dress-rental-system** (legacy) into **atelier-management-system** (target).

For the **full upgrade runbook** (schema, UX parity, filters, QA), see **`docs/system-upgrade-plan.md` §14**.

## Environment

| Variable | Description |
|----------|-------------|
| `LEGACY_DATABASE_URL` | Source DB (read-only user recommended) |
| `DATABASE_URL` | Target DB after `npm run db:migrate` |

## Active branch (read this before debugging “missing data”)

The product is **branch-scoped**, same as legacy dress-rental:

- **Legacy:** lists and actions used `getBranchSelection()` / active branch cookie → `WHERE branch_id = <active>`.
- **Upgraded:** admin tables pass `branchId: activeBranch.id` into tRPC; server `buildWhere()` filters on that column.

**Migration must preserve `branchId`** on dresses, rental customers, reservations, and payments. Invalid legacy branch IDs are remapped to the first migrated branch.

After `npm run migrate:legacy`, sign in, **pick the branch in the UI**, then open Dresses/Reservations/**Employees** — not the other way around. Employees are matched via `branch_memberships` (from legacy `users.branchId`). Global verify counts ≠ what you see with one branch selected.

Details: **`docs/system-upgrade-plan.md` §2.3** and **§14.4** (subsection *Active branch and migrated data*).

## Order

1. `branches` — legacy `code` → `shortCode`; bilingual names; placeholder address, phone, and opening hours (`10:00`–`22:00`) for columns not in legacy
2. `users` (no password columns on target)
3. `user_credentials` — copies legacy `users.password` + `users.salt` → `passwordHash` + `passwordSalt` (same scrypt hex; logins keep working)
4. `branch_memberships` — from `users.branchId`
5. `dresses`
6. `rental_customers` — from legacy `customers`
7. `reservations` — `recievingDateTime` → `receivingDateTime`
8. `payments`
9. `settings`

Progress is stored in `_legacy_migration_state` on the target DB (safe to re-run; completed steps are skipped).

## Commands

```bash
# 1. Apply target schema (includes drop products + atelier tables)
npm run db:migrate

# 2. Dry run (no writes)
npm run migrate:legacy:dry

# 3. Migrate data
npm run migrate:legacy

# Full reset of domain tables on target, then migrate
npm run migrate:legacy -- --fresh
```

## Production / staging notes

- Run on staging first; use `npm run migrate:legacy:dry` to validate connectivity and counts.
- Legacy DB is never modified (read-only).
- Target never had `password`/`salt` on `users`; credentials live only in `user_credentials`.
- Invalid legacy `branchId` values (e.g. `"default"`) map to the first migrated branch.
- Re-run the `branches` step (reset state + migrate) to backfill `shortCode` and contact placeholders on rows migrated before those columns existed.
- Legacy role `user` → `employee`; `admin` → `admin`.
- Resolve duplicate emails in legacy before migrate if inserts fail on `users_email_unique`.

## Verify

After migrate, the script compares legacy vs target row counts (use `--no-verify` to skip).
