# Seeding And Demo Data

## Purpose

This document defines how seeding should evolve in `Funtastic`.

The current repository already has a working seed pipeline, but it is too monolithic for a scaling business suite. The next version must support multiple seed profiles, safer local resets, and more believable data for demos.

## Current Problems

The current seed flow is centered on:

- `src/drizzle/seed/base.ts`
- `src/drizzle/seed/index.ts`
- `src/drizzle/seed/clear-db.ts`
- `src/drizzle/seed/cli.ts`

The main issues are:

- one monolithic base seed
- clear-and-seed behavior is too blunt
- no profile separation between demo data and performance data
- developer help text is drifting from real commands
- audit actors are inconsistent

## Agreed Direction

The agreed seed direction is:

- multi-profile seeds
- realistic local business data
- safe cleanup only
- support for future entities such as branches, products, and orders

## Seed Profiles

The seed system should support at least these profiles.

### 1. `baseline`

Purpose:

- smallest viable local bootstrap
- suitable for developers who just want the app running

Should include:

- one admin
- a handful of branches
- minimal supporting records

Should not include:

- heavy performance datasets
- large volumes of fake customers or orders

### 2. `demo`

Purpose:

- curated client-facing experience
- believable records for walkthroughs and screenshots

Should include:

- admin and a few staff users
- realistic branch distribution
- curated customers
- believable products or services
- sample orders or bookings
- mixed statuses and recent activity

This is the profile that should make the product feel sale-ready.

### 3. `performance`

Purpose:

- stress-testing table pagination, filtering, and bulk operations

Should include:

- large customer volume
- large order volume if relevant
- diverse timestamps and optional fields

This replaces the current pattern where heavy seed volume is bundled into the default base seed.

## Recommended Directory Structure

Target structure:

```text
src/drizzle/seed/
  cli.ts
  clear-db.ts
  registry.ts
  profiles/
    baseline.ts
    demo.ts
    performance.ts
  entities/
    auth.ts
    branches.ts
    users.ts
    products.ts
    orders.ts
```

## Seed Registry

The registry should define:

- profile names
- execution order
- entity dependencies
- human-readable descriptions

Example concept:

```ts
type SeedProfile = "baseline" | "demo" | "performance";

type SeedTask = {
  id: string;
  dependsOn?: string[];
  profiles: SeedProfile[];
  run: () => Promise<void>;
};
```

This makes seeds modular instead of forcing all data into one file.

## Safety Rules

Seed cleanup must be safe by default.

### Required safeguards

- only allow destructive cleanup in approved local or explicitly marked environments
- print the target database host and database name before destructive actions
- require confirmation flags for dangerous non-local environments
- keep `clear` and `seed` logic separate in code even if the CLI combines them

### What "safe-only" means here

Because the agreed cleanup scope is safe-only, seed improvements should avoid risky behavior changes unless they are clearly guarded and locally scoped.

## Data Quality Rules

Demo data should look credible.

### Users

- realistic Arabic and English-compatible names
- believable phone numbers
- mixed active and inactive behavior
- varied verification and sign-in history

### Branches

- meaningful local branch names
- sensible branch assignment for staff

### Products or services

- clear names
- categories
- prices
- active/inactive mix

### Orders or bookings

- believable statuses
- realistic timestamps
- relationships to customers, branches, and products

## Audit Actor Policy

Seed code must use stable system actors, not mixed formats.

Recommended constants:

- `system:seed`
- `system:import`
- `system:self-signup`
- `system:oauth`

Do not mix:

- user IDs
- email addresses
- freeform text

inside the same audit field strategy.

## CLI Direction

The current CLI is a good base, but the next version should expose profile-based commands clearly.

Target examples:

```bash
npm run seed -- baseline
npm run seed -- demo
npm run seed -- performance
npm run seed:clear
```

If wrappers are added later, they should map cleanly to those profiles.

## Seeding New Entities

Whenever a new demo-visible entity is added:

1. add the table and migrations
2. add the entity seed task
3. register the entity in the appropriate profiles
4. define its dependency order
5. ensure its sample data is believable

Example:

- `products` depends on branches only if products are branch-scoped
- `orders` depends on customers, branches, and products

## Migration From Current Seed State

The existing seed logic should evolve in phases.

### Phase 1

- keep current seed working
- extract current admin, branches, employees, and customers into entity-level seed helpers

### Phase 2

- introduce `baseline`, `demo`, and `performance`
- move the large customer volume out of default demo flows

### Phase 3

- add products and orders demo seeds
- use curated realistic records for client walkthroughs

## Definition Of Done

The seed system is in good shape when:

- developers can choose a profile intentionally
- demo seed data feels believable
- performance seed exists separately
- destructive cleanup is safer
- new entities can register themselves without editing one giant seed file
