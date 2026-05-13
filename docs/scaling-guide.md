# Funtastic Scaling Guide

## Purpose

This guide defines how `Funtastic` should scale from the current user-management-focused system into a broader business suite with richer admin UX, clearer feature boundaries, and a repeatable process for adding new entities.

It is written for both:

- human developers
- AI agents working inside the repository

## Product Direction

The agreed direction for the system is:

- single brand: `Funtastic`
- product identity: business suite with a polished company-facing experience for products, services, and bookings
- full Arabic and English parity
- realistic local demo data
- `tRPC` as the standard transport for admin entity work
- a central screen and entity registry
- shared admin primitives, not one giant generic CRUD page
- `customers` and `employees` remain roles on `users` for now

## Current State

The repository already has strong reusable core modules:

- `src/features/core/app-shell`
- `src/features/core/data-table`
- `src/features/core/import-review`
- `src/features/core/auth`
- `src/features/core/i18n`

The current scaling problems are mostly in the business layer:

- `src/integrations/trpc/routers/users.ts` is too large and mixed-responsibility
- route-local admin components live under `src/app/(system-pages)/_components`
- the database exports are still centered on auth tables in `src/drizzle/schema.ts`
- adding a new entity requires manual edits across schema, router, app routes, nav, permissions, translations, and seed logic
- seeding is monolithic and not profile-based yet

## Target Architecture Principles

Every new business entity should follow the same core principles.

### 1. Thin routes, feature-owned logic

Pages under `src/app` should be thin entry points.

They should mainly do:

- auth-aware route composition
- SSR prefetch when needed
- mounting a feature-level screen component

They should not become the main home for entity logic.

### 2. Feature-first business modules

Business/admin logic should live under feature folders, not inside route groups.

Target direction:

```text
src/
  features/
    system/
      users/
      branches/
      products/
      orders/
```

Each entity feature should own:

- server schemas and validators
- `tRPC` router modules
- admin UI primitives
- table columns, filters, dialogs, and row actions
- entity-specific translations or translation key contracts

### 3. Shared primitives over copy-paste

Future admin screens should be built from shared primitives such as:

- page headers
- data grid wrappers
- selection action bars
- filter bars
- export/import buttons
- form dialogs
- info panels
- row action menus

The goal is not one giant generic screen component. The goal is a consistent toolbox that makes feature-specific pages easy to build.

### 4. Central registry for screens and entities

The system needs one central source of truth for metadata that is currently scattered.

The registry should drive:

- route path
- navigation label key
- permission key
- icon
- dashboard visibility
- breadcrumb label key
- seed profile ownership
- feature flags such as import/export support
- row-action definitions
- bulk-action definitions
- whether row selection is enabled
- whether info dialogs are audit-only

This prevents "remember to edit five files" development.

### 5. Consistent admin data flow

For admin entities, use `tRPC` as the standard for:

- list queries
- detail queries
- create
- update
- soft delete
- bulk actions
- import preview/commit
- export

Server actions can remain for session, auth, and highly UI-bound workflows, but entity CRUD should have one primary pattern.

### 6. Bilingual UI by default

Any new screen, field, toast, dialog, or action must ship with both:

- English copy
- Arabic copy

No new entity is complete if it only works in one language.

### 7. Demo data must be believable

Demo data is a product surface, not just a developer convenience.

Seeded data should look like a real system:

- realistic names
- believable branches
- meaningful product names
- sensible order states
- a mix of recent and older activity

## Target Folder Convention

### App routes

Use `src/app` only for route entry points.

Example:

```text
src/app/(system-pages)/products/page.tsx
src/app/(system-pages)/orders/page.tsx
```

### Feature modules

Business features should live under `src/features/system`.

Example:

```text
src/features/system/products/
  admin/
    components/
    hooks/
    lib/
  server/
    router.ts
    queries.ts
    mutations.ts
    schemas.ts
  index.ts
```

### Database schema

Move away from an auth-only schema export model.

Target direction:

```text
src/drizzle/schemas/
  auth/
  system/
    products-table.ts
    orders-table.ts
    order-items-table.ts
  shared/
```

Then export through:

- domain barrels
- `src/drizzle/schema.ts`

## How To Add A New Entity

This is the standard process for both humans and AI agents.

### Step 0. Confirm the feature set

Do not build a new entity from the name alone.

Before coding, confirm:

- is the entity global or branch-aware?
- do we need import?
- do we need export?
- do we need row selection?
- do we need bulk actions? which ones?
- which row actions are needed?
- should the info dialog be audit-only? default: yes
- should it appear on the customer-facing landing experience?
- should it be seeded for demo profiles?

If these answers are missing, the AI agent must ask first.

### Step 1. Define the database table

Create the table in the appropriate schema domain, for example:

```text
src/drizzle/schemas/system/products-table.ts
```

Include:

- primary key
- user-facing fields
- audit fields
- indexes
- foreign keys if needed
- soft delete fields if the entity is admin-managed

### Step 2. Export the schema

Update:

- the domain barrel
- `src/drizzle/schema.ts`

If a table is not exported there, it should be treated as incomplete.

### Step 3. Generate and apply migrations

Use the existing scripts:

```bash
npm run db:generate
npm run db:migrate
```

### Step 4. Register the entity

Add the entity to the central registry.

The registry record should include:

- slug
- route
- nav label key
- breadcrumb label key
- permission key
- icon
- table capabilities
- import/export support
- row selection support
- row actions
- bulk actions
- audit info mode
- dashboard visibility
- seed ownership

### Step 5. Create server modules

Create feature-owned `tRPC` modules:

- `schemas.ts`
- `queries.ts`
- `mutations.ts`
- `router.ts`

The router should stay small and compose the other modules.

### Step 6. Create admin UI primitives

Each entity should get its own admin primitives, usually:

- `<Entity>TableColumns`
- `<Entity>Filters`
- `<Entity>FormDialog`
- `<Entity>RowActions`
- `<Entity>InfoPanel` or `<Entity>InfoDialog`

These should live in the feature folder, not under `src/app/(system-pages)/_components`.

If row selection is enabled, add:

- a select column
- an action bar
- selection-aware export behavior
- bulk actions if they were part of the confirmed feature set

### Step 7. Create the route entry page

The app route should:

- prefetch if needed
- render the feature screen
- stay as thin as possible

### Step 8. Add translations

Add bilingual keys for:

- page title and lead
- field labels
- dialog titles
- button labels
- toasts
- empty states
- import/export strings if relevant

### Step 9. Add seed support

Every entity should declare its seed support in the seed registry and profile system.

### Step 10. Add documentation

Any new major entity should update:

- this guide if the process changes
- the entity blueprint if the standard evolves
- seed docs if a new profile or dependency is introduced

## Rules For AI Agents

When an AI agent adds a new entity, it must:

1. Ask the entity intake questions first if the feature set is not explicit.
2. Follow the folder conventions in this guide.
3. Use the central registry instead of hardcoding nav or permissions in multiple places.
4. Use `tRPC` for admin entity operations unless the task explicitly says otherwise.
5. Add bilingual labels and messages.
6. Add seed support if the entity is demo-visible.
7. Avoid route-local duplication under `src/app/(system-pages)`.
8. Keep app route files thin.
9. Prefer extending shared admin primitives over inventing a new pattern.
10. Default info dialogs to audit-only unless the request explicitly asks for a richer detail view.

## Audit Field Policy

The current repository uses inconsistent actor values in audit fields. That must be normalized.

Target policy:

- use user IDs when a human user performs the action
- use stable system actor constants for automated flows
- never mix email values and user IDs in the same audit field policy

Suggested constants:

- `system:seed`
- `system:oauth`
- `system:self-signup`
- `system:import`

## UX Rules For New Admin Screens

Every new admin screen should feel like part of one product.

Required UX expectations:

- clear page title and business-facing subtitle
- useful empty state
- predictable table actions
- intentional row selection only when the entity needs it
- role-safe forms
- non-technical copy
- clean loading and mutation feedback
- no developer narration on live screens
- audit-only info dialogs by default

Avoid copy like:

- "server-side pagination over real customer users"
- "commit valid rows"
- "record(s)"

Prefer product language such as:

- "Manage customer records across all branches."
- "Review and apply import changes."
- "Delete 3 customers?"

## Landing Experience Rule

The landing page should represent the company using `Funtastic`, not only the admin team using it.

That means:

- the public-facing copy should speak to selling products, services, or bookings
- the admin workspace should still be clearly available to staff
- new entities that affect the company-facing experience should be considered in landing-page planning, not only admin tables

## Recommended Near-Term Refactors

Before major entity expansion, prioritize:

1. Split `src/integrations/trpc/routers/users.ts` into feature-owned server modules.
2. Move `src/app/(system-pages)/_components/*` into a feature-owned users module.
3. Introduce the central registry for screens and entity metadata.
4. Replace monolithic seed logic with profile-based seeding.
5. Rewrite dashboard and landing page content so the product feels sale-ready.

## Success Criteria

The scaling effort is successful when:

- a new entity can be added through a documented repeatable process
- nav, permissions, and labels come from one registry
- admin screens share common UX patterns without becoming rigid
- demo data looks real
- the system feels cohesive in both Arabic and English
- the codebase is easier for both humans and AI agents to extend
