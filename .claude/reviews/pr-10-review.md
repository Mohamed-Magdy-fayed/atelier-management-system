# PR Review: #10 — Add CSV import to every admin grid

**Reviewed**: 2026-08-09
**Author**: Mohamed-Magdy-fayed
**Branch**: `feat/import-in-all-tables` → `main`
**Decision**: REQUEST CHANGES

## Summary

The job model is well designed — inline `rawCsv` as the source of truth, a server-owned cursor, and re-validating from the file at commit time rather than trusting the reviewed rows are all the right calls, and they're documented at the point where the reasoning matters. The CSV state machine correctly handles quoted line breaks, which the existing data-table parser does not.

The problem is authorization. The import handlers write to the same tables as the normal tRPC mutations but do **not** reproduce those mutations' role and branch checks, so import is a strictly weaker path to the same writes. One case bypasses an admin-only gate outright. This is the same class of bug the PR fixes for expenses in `expenses/server/mutations.ts` (`assertLinksBelongToBranch`, added precisely because "the branch is a client-supplied input") — the fix just wasn't carried into the import handlers.

## Findings

### CRITICAL

**1. Branch import bypasses the admin-only gate — any employee can create and modify branches**

- `src/features/system/branches/server/mutations.ts:53,92,129` — every branch mutation calls `assertAdminRole`.
- `src/features/system/import/server/mutations.ts:62` — `createImportJob` calls only `assertOperationalStaff`, which admits `admin` **and** `employee` (`shared/staff-access.ts:14-21`).
- `src/features/system/import/server/handlers/branches.ts:96-130` — `commit` performs no role check of its own.

An `employee` can therefore POST a branches CSV and create new branches, or rename / re-address / re-phone **any existing branch**, including branches they hold no membership in. Branch rows resolve by `shortCode` globally with no access filter (`branches.ts:64-73`).

Fix: gate the branches spec on `admin`. The cleanest place is a per-spec `requiredRole` on `ImportEntitySpec`, asserted in `createImportJob` and again in `loadJobForActor` so a job created before a role change can't be driven forward.

### HIGH

**2. Dress import bypasses both branch-access checks**

`src/features/system/dresses/server/mutations.ts:83-98` guards `updateDress` on **both** sides:

```ts
await assertUserCanAccessBranch(ctx, session, dress.branchId);   // existing branch
await assertUserCanAccessBranch(ctx, session, input.branchId);   // target branch
```

The import path checks neither:

- `createImportJob` only validates `input.branchId`, the *fallback* branch (`import/server/mutations.ts:73-75`).
- `handlers/utils.ts:58-74` — `loadBranchIdsByShortCode` resolves any `branchShortCode` in the file against the whole `branches` table, unfiltered.
- `handlers/dresses.ts:130-136` — the existing-row lookup matches `DressesTable.code` globally, deliberately ("regardless of which branch the row claims").

So an employee scoped to Branch A can (a) create dresses in Branch B by naming its short code in the CSV, and (b) overwrite `title`, `pricePerDay`, `depositAmount`, `insurance`, `size`, `color`, `isActive` and `currentStatus` on **any dress in any branch** by naming its code.

Fix: in the dresses handler's `prepare`, fail the row when the resolved branch — and, for updates, the *existing* dress's branch — is outside the actor's memberships. Resolve the actor's branch ids once per batch rather than per row.

### MEDIUM

**3. Row outcomes are written outside the commit transaction, one UPDATE at a time**

`import/server/mutations.ts:365` calls `markBatchRowOutcomes` *after* the transaction at :356-361 closes. If it throws, the batch's writes are already durable but the cursor never advances (:370), so a resumed job re-commits the same batch. Inside `markBatchRowOutcomes` (:396-418) each row is a separate sequential `UPDATE` — 500 round-trips per batch at `DEFAULT_IMPORT_BATCH_SIZE = 500`. Move it inside the transaction and collapse it to a single statement.

**4. The cursor guard is not concurrency-safe**

`assertCursorMatches` (:184-191) reads `job.processedRows` and the write at :370 happens later, with no transaction, row lock, or `WHERE processedRows = cursor` predicate. Two concurrent `commitBatch` calls at the same cursor both pass. The schema comment ("makes a replayed batch request a no-op") holds for sequential replays but not concurrent ones — unique constraints will reject most duplicate inserts, but the batch then fails with a 500 and `committedRows` can double-count. Make the update conditional on the cursor and treat a zero row count as the conflict.

**5. `sliceBatch` re-parses the entire CSV on every batch**

`:163-182`, documented as an intentional trade for statelessness. At the stated ceilings that is 100,000 / 500 = 200 batches, each parsing the full 4 MB file, and the file is walked twice (validate then commit) — ~400 full parses. Fine for the hundreds-of-rows case, quite slow at the limit the docs advertise. Worth either lowering `MAX_IMPORT_ROWS` to what's actually been tested or parsing once per request into a slice.

**6. Employee import silently resurrects soft-deleted accounts**

`handlers/employees.ts:152-156` clears `deletedAt` / `deletedBy` on every update. The comment frames this as a re-hire, which is reasonable, but the review table shows it as an ordinary `update` — an admin re-importing an old export would reactivate every departed employee in the file with no distinct signal. Surface it as its own action or reason so it's visible before commit.

### LOW

**7. `translateReasons` casts through `as unknown as`** (`import/server/mutations.ts:28-33`). Documented, and the fallback is a raw key rather than a crash, but it defeats the key-union checking everywhere else in the i18n layer.

**8. CSV parser drops a row consisting of a single quoted empty cell.** `lib/csv.ts:41` — `record.length > 1 || record[0] !== ""` treats a lone `""` cell as a trailing newline. Harmless for the current specs (every entity requires ≥1 non-empty column) but wrong as a general parser, and this file is written to be one.

## Validation Results

| Check | Result |
|---|---|
| Type check (`npx tsc --noEmit`) | Pass |
| Build (`npm run build`) | Pass |
| Lint | Not run — no `lint` script |
| Tests | Not run — no `test` script |

## Files Reviewed

Read in full: `import/lib/csv.ts`, `import/server/{mutations,queries,router,schemas,shared}.ts`, `import/server/handlers/{branches,dresses,employees,utils,types}.ts`, `import/specs/{master,types}.ts`, `drizzle/schemas/system/import-jobs-table.ts`, `expenses/server/mutations.ts`, `shared/staff-access.ts`, `branches/server/mutations.ts`, `dresses/server/mutations.ts`, `users/server/{mutations,shared,branch-memberships}.ts`, `registry/entities.ts`, `docs/import-contract.md`.

Not individually reviewed: the admin UI components, i18n additions, migration snapshot, and the two `scripts/` additions.
