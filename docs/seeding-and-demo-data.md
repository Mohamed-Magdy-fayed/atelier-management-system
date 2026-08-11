# Seeding And Demo Data

How the seed CLI actually behaves today. Where an earlier version of this
document described a target design, this one describes the code.

## Layout

```text
src/drizzle/seed/
  cli.ts            # command parsing, env precedence, target printout, safety refusals
  clear-db.ts       # TRUNCATE everything + the shared destructive-write guard
  constants.ts      # profile names, admin identity, system actor
  core.ts           # seedScenario() — volume generator, currently unused
  index.ts          # profileRunners map + runSeedProfile()
  settings.ts       # seedDefaultSettings() — upsert + legacy code migration
  profiles/
    settings.ts     # default settings rows only
    admin.ts        # one admin account only
    baseline.ts     # stub → settings
    demo.ts         # → demo/run.ts
    performance.ts  # stub → settings
  demo/             # the demo dataset (see below)
```

## Commands

```bash
npm run seed demo
```

| Command | Effect |
|---|---|
| `npm run seed` / `npm run seed:all` | Settings rows only. Clears nothing. |
| `npm run seed -- settings` | Same as above, named explicitly. |
| `npm run seed:admin` | Creates or restores the admin account only. Never rotates an existing password unless `SEED_ADMIN_RESET_PASSWORD=1`. |
| `npm run seed demo` | The curated demo atelier. Replaces only its own rows. |
| `npm run seed -- baseline` | **Stub** — currently seeds settings only. |
| `npm run seed -- performance` | **Stub** — currently seeds settings only. |
| `npm run seed:clear` | TRUNCATEs every table in the schema. |

`baseline` and `performance` are honest stubs, not implemented profiles. The
volume generator they will eventually use, `seedScenario()` in `core.ts`, is
written but not wired to anything.

## Profile: `demo`

The profile behind screen recordings and live sales demos. It produces a full
year of trading across three branches, and every dashboard panel is non-empty on
**each** branch — not merely in aggregate.

### What it writes

| Table | Rows | Notes |
|---|---|---|
| `branches` | 3 | `ZML` / `NCR` / `HLP`, with addresses, phones, opening hours |
| `users` (employees) | 8 | Two cover more than one branch |
| `branch_memberships` | 13 | Includes the admin on all three branches |
| `dresses` | 153 | 75 / 48 / 30 |
| `rental_customers` | ~1 500 | Tenant-wide; branch attribution comes off their reservations |
| `reservations` | ~1 600 | 800 / 500 / 300 a year, plus the curated set |
| `payments` | ~3 500 | All four methods, all four types |
| `expenses` | 156 | All five types, twelve months per branch |

It also runs the `settings` and `admin` profiles first, so a fresh database is
usable immediately after the one command.

### Calibration

The magnitudes are taken from the atelier's own imported history rather than
invented, because a demo shown to other ateliers is judged by people who know
what these numbers should look like. An earlier draft seeded six dresses per
branch at 1 150–4 900 EGP/day, which read as a toy priced at roughly five times
the market.

| | Imported history | This profile |
|---|---|---|
| Reservations per dress per year | ~10 | ~10 |
| `pricePerDay` median | 800 (max 4 000) | 900 (max 4 000) |
| Contract value median | 900 | 1 050 |
| Rental length median | 1.8 days | 2 days |
| Busiest dress | 56 rentals | 54 rentals |
| Customers booking exactly once | 93% | 92% |
| Payment mix | cash-dominant | cash-dominant |

Two things deviate on purpose. The imported history has exactly one expense row,
no insurance or penalty payments and no `visa` at all — those are gaps in the
legacy export, not facts about the business, and they are all live product
features the walkthrough has to demonstrate. So the profile seeds them anyway.

### Branch sizing

Three deliberately unequal branches — 800, 500 and 300 bookings a year — so the
branch switcher shows a real spread instead of three clones, and every per-branch
figure visibly changes when the active branch changes. Portfolio sizes follow the
booking volume at the real ~10-reservations-per-dress ratio; inventing a
portfolio that could not physically service the bookings is exactly the detail an
atelier owner notices.

### Curated versus generated reservations

**51 curated** bookings (17 per branch) are placed by hand. They produce the
*states* the walkthrough script depends on, which are too specific to leave to a
distribution: returns due today, overdue returns, outstanding balances on both
arms of `balanceDueDateSql`, a cancellation, and a populated previous comparison
window.

**The rest are generated** across the last 365 days, skewed toward the recent end
so the business reads as growing, and distributed over each portfolio by a
geometric popularity curve. That curve is why `dresses.timesRented` spreads from
0 to 54 rather than sitting flat.

`timesRented` is never written directly. `refreshDressReservationStats`
recomputes it as a `COUNT` of countable reservations on every reservation write,
so an invented number would snap back to the truth the first time a dress was
booked on camera. The history that justifies the number is seeded instead.

Booking status follows physics rather than a quota: a rental whose return date
has passed is `returned`, one whose pickup is still ahead is `reserved`, and
anything spanning today is `pickedUp`. A slice of recent returns stay
uncollected, which is where the overdue figure gets its volume.

Settlement ages too. A booking closed more than 45 days ago is settled 97% of the
time, because a real atelier chases its receivables — applying the recent rate
across the whole year left 210 open balances on one branch, which reads as a
business that never collects.

### Money consistency (the invariant)

The dashboard reads the same business three ways:

- revenue = `SUM(payments.amount)` where `type <> 'insurance'`, on a countable reservation, windowed on `payments.createdAt`
- outstanding = `(reservations.totalPrice - discount) - reservations.totalPaid`
- top-dress revenue = `SUM(reservations.totalPaid)`

These must agree on screen. So `reservations.totalPaid` is never assigned:
`buildPaymentSchedule()` in `demo/payments.ts` emits a reservation's payment rows
and *returns* `totalPaid` as the sum of its own non-insurance rows. The
reservation is built from that return value. Nothing else in the profile may
produce either number.

Two consequences worth knowing:

- Insurance payments exist but never count as revenue.
- A penalty **is** revenue, so any late fee is also folded into that
  reservation's `totalPrice` — otherwise the booking renders as overpaid.
- `payments.createdAt` is set explicitly on every row, because revenue is
  windowed on it.

### Determinism

Everything derives from `DEMO_SEED` and a single `now` captured once per run.
There is no `Math.random()` and no repeated `Date.now()`. Re-running on the same
day reproduces the database exactly, which is what lets a walkthrough be
re-recorded across several takes.

Timestamps are offsets from **today's local midnight**, so the dataset rolls
forward with the calendar. That is deliberate: pinning it to a fixed date would
leave "upcoming pickups" and "due today" empty by the second recording session.

One time-of-day caveat: the curated returns-due-today booking is due at 23:00, so
between 23:00 and midnight it reads as overdue rather than due today. Every state
stays non-empty either way.

### Publication safety

This data is filmed and shown to competing businesses.

- **Phones** are always `010000` + a five-digit block, in three disjoint ranges:
  `01000000001` upward for customers, `01000090001` upward for employees,
  `01000099001` upward for branch landlines. They are inside the Egyptian mobile
  *format* and outside any assigned range, so nothing here can dial a real
  person. `core.ts`'s `pickPhone()` generates realistic mobiles and must never be
  used from this profile.
- **Names** are composed from the shared synthetic lists in `core.ts` — a female
  given name plus two patronymics, matching how the real records read, with no
  overlap onto any actual customer.
- **Emails** are `@example.com`.
- **Notes** are deliberately dull and carry nothing that reads as private.
- Uniqueness (`users.phone` globally, `rental_customers.phone` globally) holds by
  construction: the blocks are disjoint and the sequences are ordinals, so there
  is no retry loop and no chance of a collision as the profile grows.

> **Before recording, check what else is on the database.** The `demo` profile
> only replaces its own rows. If the target database also holds imported legacy
> data, those customers and reservations remain visible on `/rental-customers`,
> `/reservations` and the branch switcher. For a clean recording run
> `npm run seed:clear` first, then `npm run seed demo`.

### Idempotency

Every row's id is derived from the fixture it belongs to (`demo/ids.ts`, UUID v5
over a fixed namespace). Each run first deletes the three demo branches — which
cascades their reservations, payments, expenses, dresses and memberships — then
the demo customers and employees, then re-inserts. Running the command twice in a
row produces the same database, not a doubled one. Nothing outside the demo
fixture ids is touched.

The customer sweep deletes past the current run's count, so a previous, larger
run cannot leave orphans behind; deleting an id that was never inserted is a
no-op. Inserts are chunked at 500 rows, which keeps every statement well inside
Postgres's 65 535 bound-parameter ceiling however large the profile grows.

## Safety rails

Do not weaken these.

- **Destructive writes are host-gated.** `assertSafeToDestroyData()` in
  `clear-db.ts` refuses to run under `NODE_ENV=production`, and refuses any
  non-local database host unless `SEED_ALLOW_REMOTE=1`. Both `seed:clear` and
  the `demo` profile go through it.
- **The built-in admin password never reaches a remote database.** `cli.ts`
  refuses unless `SEED_ADMIN_PASSWORD` is supplied.
- **Env precedence is `.env.local` ahead of `.env`**, with `DOTENV_CONFIG_PATH`
  to override. This exists because a "local" seed once silently hit production.
- **The resolved target host is printed before anything runs**, and the demo
  profile prints per-table row counts and the host when it finishes.

Seeding a remote database is an explicit act:

```bash
DOTENV_CONFIG_PATH=.env.prod SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='<strong>' npm run seed:admin
```

## Verifying a demo seed

```bash
npm run smoke:dashboard
```

Read-only. It runs every query `getDashboardData` issues, once per branch, and
asserts that the dress buckets sum to `activeDresses`, that the payment-method
breakdown sums back to revenue, and that overdue outstanding never exceeds total
outstanding.

## Audit actor

Seed-written rows use `system:seed` (`SEED_SYSTEM_ACTOR`), which
`EntityAuditInfoDialog` renders as a system actor rather than trying to resolve
it to a user. Demo reservations and payments instead carry the seeded
**employee's user id** in `createdBy`, matching what the app writes at runtime so
the audit dialog resolves them to a name.

## Adding a demo-visible entity

1. Add the table and its migration.
2. Add fixtures under `src/drizzle/seed/demo/` and build its rows in `build.ts`.
3. Insert it in `run.ts` in dependency order, and add it to the cleanup step if
   it is not cascaded by deleting a demo branch.
4. Add its row count to the summary printout.
5. Keep it deterministic and publication-safe — no `Math.random()`, no dialable
   phone number, no real name.
