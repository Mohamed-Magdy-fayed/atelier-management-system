# Step 01 report — migration safety gate

Run 2026-11-18 against `main` at 304c7ab. No schema change, no migration, no snapshot added or edited.

| # | Check | Result |
|---|---|---|
| 1 | `drizzle-kit generate` on a clean tree | **Clean.** "No schema changes, nothing to migrate." Head snapshot (0019) matches `schema.ts`. |
| 2 | Introspect production and diff against `schema.ts` | **Not done.** Needs production credentials, which this environment does not have. Someone with `.env.prod` should run `DOTENV_CONFIG_PATH=.env.prod npx drizzle-kit introspect --out /tmp/prod-introspect` (never into `src/drizzle/migrations`) and diff it against `src/drizzle/schema.ts`. This is the check that catches a hand-edit in 0003-0008 that never reached `schema.ts`. **Gate for Step 06 is open until it is done.** |
| 3 | `drizzle-kit migrate` on an empty Postgres 16 | **Green.** 20 migrations (0000-0019) applied; `rental_customer_phone_key()` exists. |
| 4 | `db:push` tripwire | **Added and tested.** `scripts/guard-db-push.mjs`, wired into `npm run db:push`. |

## Tripwire behaviour
Resolves the target with the same env precedence as `drizzle.config.ts`, then:
- non-local host: refuses, unless `ALLOW_REMOTE_DB_PUSH=1`
- host listed in `PRODUCTION_DB_HOSTS` (comma separated): always refuses, override or not
- localhost / 127.0.0.1 / ::1: allowed

Tested: remote host refused (exits before drizzle-kit starts), remote host with override but listed as production refused, local host allowed.

I did not hard-code the production host (it is not in the repo). Setting `PRODUCTION_DB_HOSTS` in the maintainer's shell adds a refusal that survives the override.

## Notes
- Snapshots for 0003-0008 are still absent, as expected. Not fabricated.
- Step 02 (unauthenticated upload) was already fixed on main in e2b6f1e: `uploadImage` is on `protectedProcedure`, rate limited, and `deleteImage` is confined to the caller's own folder. The only remaining `baseProcedure` procedures are the two locale-cookie ones in `_app.ts`; neither writes data.
