## Funtastic

`Funtastic` is a bilingual business-suite foundation built with `Next.js`, `React`, `Drizzle ORM`, and `tRPC`.

The current system centers on:

- authentication and account management
- branch-aware access
- admin system pages
- reusable data-table and import-review building blocks
- user management flows for employees and customers

This repository is being evolved into a scalable admin platform where new entities, database tables, and management screens can be added with a repeatable pattern.

## Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `tRPC`
- `Drizzle ORM`
- `PostgreSQL`
- `Tailwind CSS 4`
- `Biome`

## Getting Started

Install dependencies, start the database, migrate, seed, and run the app:

```bash
npm install
npm run db:start
npm run db:migrate
npm run seed:all
npm run dev
```

Useful scripts:

```bash
npm run dev
npm run build
npm run lint
npm run typecheck

npm run db:start
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:studio

npm run seed
npm run seed:all
npm run seed:clear
```

## Current App Areas

- `src/app/(auth)` for sign-in, sign-up, password reset, and auth flows
- `src/app/(system-pages)` for protected admin/system pages
- `src/features/core/app-shell` for sidebar, shell layout, and navigation
- `src/features/core/data-table` for reusable table infrastructure
- `src/features/core/import-review` for CSV review and import workflows
- `src/integrations/trpc` for API routers and transport
- `src/drizzle` for schema, migrations, and seed logic

## Documentation

The repository now includes a docs-first scaling pack:

- `docs/scaling-guide.md`
- `docs/entity-blueprint.md`
- `docs/seeding-and-demo-data.md`
- `docs/demo-readiness-checklist.md`
- `docs/implementation-roadmap.md`

Read these before large refactors or before adding new business entities.

## Current Direction

The agreed direction for the next phase is:

- unify the product under the `Funtastic` brand
- present the app as a business-suite product
- keep `customers` and `employees` on the `users` table for now
- standardize future admin entity work around `tRPC`
- introduce a central screen and entity registry
- support full Arabic and English parity
- move toward realistic local demo seed data
- document the full path for adding new entities such as branches, products, and orders

## Notes

- This project uses a newer `Next.js` version with breaking changes compared to older app-router examples. Read the relevant docs under `node_modules/next/dist/docs/` before making framework-level changes.
- Some of the current implementation still reflects starter or in-progress scaffolding. Use the docs in `docs/` as the target direction for cleanup and scaling work.
