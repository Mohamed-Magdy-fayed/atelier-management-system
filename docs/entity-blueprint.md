# Entity Blueprint

## Goal

This blueprint defines the target implementation pattern for any admin-managed entity added to `Funtastic`.

It exists so that:

- humans can add entities consistently
- AI agents can generate the right structure without guesswork
- the product scales without dumping logic into routes or giant transport files

## Example Entities

The first entity families this blueprint should support well are:

- customers and employees
- branches
- products or services
- orders or bookings

## Core Pattern

Each entity should have four coordinated layers:

1. database schema
2. registry metadata
3. server modules
4. admin UI primitives

## Target Structure

Example for a `products` entity:

```text
src/
  app/
    (system-pages)/
      products/
        page.tsx

  drizzle/
    schemas/
      system/
        products-table.ts

  features/
    system/
      products/
        admin/
          components/
            product-form-dialog.tsx
            product-info-dialog.tsx
            product-row-actions.tsx
            products-filters.tsx
            products-table-columns.tsx
            products-table-page.tsx
          lib/
            export.ts
            filters.ts
          index.ts
        server/
          mutations.ts
          queries.ts
          router.ts
          schemas.ts
          types.ts
        index.ts

  integrations/
    trpc/
      routers/
        products.ts
```

## Responsibilities By Layer

### 1. Database schema

The schema layer defines:

- table structure
- indexes
- enums
- foreign keys
- relations
- shared audit fields

Rules:

- keep tables in domain folders
- export through `src/drizzle/schema.ts`
- include soft-delete fields for admin-managed entities unless there is a strong reason not to

### 2. Registry metadata

The registry is the central source of truth for entity and screen metadata.

It should prevent manual duplication across:

- navigation
- permissions
- dashboard cards
- route labels
- breadcrumbs
- feature discovery

Suggested shape:

```ts
type SystemEntityRegistryItem = {
  slug: string;
  route: string;
  screenKey: string;
  icon: unknown;
  navLabelKey: string;
  breadcrumbLabelKey: string;
  titleKey: string;
  leadKey: string;
  supportsImport: boolean;
  supportsExport: boolean;
  supportsBulkActions: boolean;
  showInDashboard: boolean;
  seedProfiles: string[];
};
```

Suggested location:

```text
src/features/system/registry/
  entities.ts
  screens.ts
```

This can be one registry or two coordinated registries, but it should behave as one source of truth from the app's perspective.

### 3. Server modules

Each entity should have feature-owned server files:

- `schemas.ts` for `zod` input schemas
- `queries.ts` for list/detail/export logic
- `mutations.ts` for create/update/delete/bulk logic
- `router.ts` for the public `tRPC` surface
- `types.ts` for row and DTO types

Rules:

- no giant all-in-one entity router files
- router files should compose smaller functions
- business logic belongs in queries and mutations, not inline in route handlers

### 4. Admin UI primitives

Each entity should have its own UI building blocks.

Expected primitives:

- page component
- table columns
- filter set
- form dialog
- row actions
- details dialog, drawer, or sheet

Optional primitives:

- import adapter
- metrics header
- tabs
- timeline or activity panel

Rules:

- do not place reusable entity UI under `src/app/(system-pages)/_components`
- do not force all entities through one giant generic CRUD component
- do reuse shared table, dialog, import, and layout primitives

## Route Pattern

Each app route should stay thin.

Example:

```tsx
import { HydrateClient, prefetch, trpc } from "@/integrations/trpc/server";
import { ProductsTablePage } from "@/features/system/products/admin";

export default async function ProductsPage() {
  await prefetch(trpc.products.list.queryOptions(defaultInput));

  return (
    <HydrateClient>
      <ProductsTablePage />
    </HydrateClient>
  );
}
```

The route should not own:

- table column definitions
- form schemas
- mutation orchestration
- filter logic

## Shared Admin Primitive Catalog

These are the reusable building blocks the system should converge on.

### Table primitives

- `EntityPageHeader`
- `EntityToolbar`
- `EntityFiltersBar`
- `EntityExportButton`
- `EntityImportButton`
- `EntityBulkActions`
- `EntityEmptyState`

### Dialog primitives

- `EntityFormDialog`
- `EntityDeleteDialog`
- `EntityInfoDialog`

### Support primitives

- translation key helpers
- registry-driven page titles
- audit display blocks
- standardized empty, loading, and error states

## Permission Pattern

Permissions should not be inferred from raw paths.

Instead:

1. define a stable `screenKey`
2. register it once
3. use the registry to map route to permission

That allows:

- clearer access rules
- safer refactors
- easier future feature flags

## Import/Export Pattern

If an entity supports CSV import or export:

- the entity owns its adapter
- the adapter reuses shared import-review infrastructure
- the registry marks the capability

Example:

```text
src/features/system/products/admin/components/products-import-button.tsx
```

The shared import-review feature remains generic.

The entity supplies:

- preview mutation
- commit mutation
- column mapping
- row summary rules

## Form Pattern

Forms should be context-safe.

Example:

- on the customers screen, the create dialog should create a customer
- it should not expose unrelated role or type options unless that page explicitly manages multiple entity variants

Entity forms should follow:

- feature-owned schema
- shared field primitives
- entity-owned labels and placeholders
- bilingual validation feedback where user-facing

## Current Repo Mapping

The current codebase should evolve as follows:

- `src/integrations/trpc/routers/users.ts`
  becomes a feature-owned users server module split into queries, mutations, import, and router

- `src/app/(system-pages)/_components/*`
  becomes `src/features/system/users/admin/components/*`

- `src/features/core/app-shell/lib/nav.ts`
- `src/features/core/auth/core/permissions.ts`
- `src/proxy.ts`
  should become registry-driven instead of manually coordinated

## Blueprint For AI Agents

When asked to add an entity, an AI agent should:

1. Create the schema file in the correct domain.
2. Export it through `src/drizzle/schema.ts`.
3. Add the entity to the central registry.
4. Create `schemas.ts`, `queries.ts`, `mutations.ts`, `router.ts`, and `types.ts`.
5. Create feature-owned admin UI primitives.
6. Add a thin route file in `src/app/(system-pages)`.
7. Add full bilingual copy.
8. Add seed support if the entity is demo-visible.
9. Avoid duplicating patterns that already exist in another entity feature.

## Definition Of Done

An entity is not complete until all of the following are true:

- database table exists
- migrations are generated and applied
- entity is registered
- admin route exists
- permissions work
- nav and breadcrumb labels resolve
- bilingual copy is present
- seed story is defined
- docs remain accurate
