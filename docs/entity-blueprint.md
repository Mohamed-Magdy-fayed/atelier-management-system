# Entity Blueprint

## Goal

This blueprint defines the standard implementation pattern for any admin-managed entity added to `Funtastic`.

It exists so that:

- humans can add entities consistently
- AI agents can add entities without guessing missing feature expectations
- the product scales without pushing business logic into routes or giant transport files

## Product Context

`Funtastic` is not only an internal admin panel. The product direction is:

- a polished company-facing experience for selling products, services, or bookings
- a strong admin workspace behind that experience
- bilingual English and Arabic parity
- registry-driven feature discovery and screen behavior

Any new entity should fit both the admin architecture and this overall product direction.

## Example Entity Families

The blueprint should support these well:

- customers and employees
- branches
- products or services
- orders or bookings

## Mandatory Intake Before Coding

Before a human or AI agent creates a new entity, they must confirm the feature set.

Do not start implementation from only "add entity XYZ".

Required intake questions:

1. What business role does the entity play?
2. Is the entity global, branch-aware, or future branch-aware?
3. Does the entity need import?
4. Does the entity need export?
5. Does the table need row selection?
6. Is this a definitions/reference page or a transactional page?
7. Should the table use client mode or server mode? Default: definition pages use client mode, transactional pages use server mode.
8. Does the entity need bulk actions? If yes, which ones?
9. Which filters should appear on the table? Include any filter that makes sense for the entity's business context.
10. Which row actions are required? Examples: `activate`, `deactivate`, `set active`, `archive`, `restore`, `duplicate`.
11. Should the info dialog be audit-only? Default answer: yes.
12. Does the entity need a public or landing-page presence?
13. Should the entity be demo-visible and seeded?

If the request does not answer these questions, the agent should ask first and wait.

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
            products-grid-filters.tsx
            product-info-dialog.tsx
            product-row-actions.tsx
            products-bulk-actions.tsx
            products-import-button.tsx
            products-table-columns.tsx
          products-table-page.tsx
          index.ts
        server/
          import.ts
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
- table capability decisions

Suggested shape:

```ts
type SystemEntityRegistryItem = {
  slug: string;
  route: `/${string}`;
  screenKey: string;
  icon: unknown;
  navLabelKey: string;
  breadcrumbLabelKey: string;
  titleKey: string;
  leadKey: string;
  branchScope: "global" | "branch-aware" | "future-branch-aware";
  infoView: "audit-only";
  supportsImport: boolean;
  supportsExport: boolean;
  supportsRowSelection: boolean;
  supportsBulkActions: boolean;
  filters: readonly string[];
  rowActions: readonly string[];
  bulkActions: readonly string[];
  showInDashboard: boolean;
  seedProfiles: readonly string[];
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
- `mutations.ts` for create/update/delete/toggle/bulk logic
- `import.ts` when import exists
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
- form dialog
- row actions
- audit info dialog

Conditional primitives:

- select column when row selection is enabled
- action bar when row selection is enabled
- bulk action component when bulk actions are enabled
- import button when import is enabled
- export button when export is enabled
- filters that reflect meaningful business dimensions for the entity
- metrics header when the page needs decision support

Rules:

- do not place reusable entity UI under `src/app/(system-pages)/_components`
- do not force all entities through one giant generic CRUD component
- do reuse shared table, dialog, import, and layout primitives

## Data Table Mode Pattern

Choose the table mode based on the kind of page.

Default rule:

- definition/reference pages use the client version of the data table
- transactional pages use the server version of the data table

Definition/reference pages usually include:

- branches
- products
- services
- categories
- settings-like master data

Why client mode fits definition pages:

- row counts are usually moderate
- local sorting and filtering feel faster
- the page often behaves like a management list for reusable system definitions

Transactional pages usually include:

- orders
- bookings
- invoices
- payments
- activity logs
- audit trails

Why server mode fits transactional pages:

- transaction tables usually grow much larger
- filtering, sorting, and pagination should scale with the database
- export and reporting queries often need the exact current server-side filter state

Override rule:

- if a definition page is known to be very large, server mode is acceptable
- if a transactional page is intentionally tiny, client mode can be used only with explicit justification

## Filter Pattern

Every entity should ship the filters that make sense for its context.

Rules:

- global search is not a replacement for obvious business filters
- if the entity has a meaningful status, add a status filter
- if the entity has a meaningful number such as price, amount, stock, or age, add a range filter
- if the entity has meaningful dates such as created, booked, delivered, or last activity, add date filters
- if the entity belongs to a branch, owner, category, or other business dimension, add that filter when it helps operators narrow the list quickly
- avoid filler filters that do not help real decision-making

Examples:

- customers: verification, age, created date, last sign-in date
- products: status, price range, created date
- orders: status, payment status, branch, order date, total range

A good rule of thumb:

- if an operator would naturally ask "show me only the active ones", "show me high-price items", or "show me this month's records", that filter belongs on the screen

## Action Bar Pattern

The action bar is for selection-scoped actions only.

Use it when:

- the table has row selection
- the selected rows support meaningful bulk actions

Do not use it for:

- page-wide actions such as `add`, `import`, `export all`, or view options
- single-record actions that belong in the row menu
- decorative empty state chrome

Selection rules:

- if row selection is enabled, the action bar should contain real selected-row actions
- if there are no meaningful selected-row actions, remove row selection instead of rendering an empty action bar
- always keep the clear-selection affordance
- action bar actions should usually mirror the entity's `bulkActions` registry entry

Decision guide:

- toolbar: page-level actions
- row menu: one-record actions
- action bar: selected-row actions

Example:

```tsx
<DataTable
  table={table}
  toolbar={
    <DataTableToolbar table={table}>
      <AddProductButton />
      <DataTableExportButton table={table} />
      <ProductsImportButton />
    </DataTableToolbar>
  }
  actionBar={
    <DataTableActionBar table={table}>
      <ProductsBulkActions table={table} />
    </DataTableActionBar>
  }
/>
```

In that example:

- `AddProductButton`, import, and page-level export stay in the toolbar
- `ProductsBulkActions` owns `activate`, `deactivate`, and `archive` for the selected rows
- the action bar appears only when selection exists

## Audit Info Dialog Rule

The default info dialog standard is:

- audit-only

That means the dialog should primarily show:

- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`
- `deletedAt`
- `deletedBy`
- record ID when useful for support/debugging

Business fields such as product name, price, status, owner name, or member count should stay in the table, form, or dedicated detail views. They should not be mixed into the default info dialog unless the request explicitly asks for a richer detail panel.

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
- `EntityActionBar`
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
- export query
- column mapping
- row summary rules

## Action Pattern

Row actions must be intentional, not copied between entities.

Rules:

- do not add copy actions by default
- only ship actions the entity actually needs
- register expected actions in the entity registry
- keep state-changing actions close to the row menu unless they need a full dialog
- if row selection exists, ship the action bar with real selected-row actions so users can act on the selection immediately

Examples:

- branches: `set active`, `edit`, `delete`
- products: `activate`, `deactivate`, `edit`, `archive`

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

### Zod validation messages (translation keys)

User-visible Zod errors must be **i18n keys** (dotted paths such as `forms.validation.required`), not literal English copy in the schema.

- Use **`translationKey()`** from [`src/features/core/i18n/global`](../src/features/core/i18n/global/index.ts) for every Zod `message` argument, including **`superRefine`** / **`ctx.addIssue({ message })`**.
- Define the strings under **`forms.validation`** (or another shared namespace) in both [`en.ts`](../src/features/core/i18n/global/en.ts) and [`ar.ts`](../src/features/core/i18n/global/ar.ts).
- Inline field errors and the invalid-submit toast are translated automatically by **`FormBase`** and **`useAppForm`** via [`src/components/forms/validation-messages.ts`](../src/components/forms/validation-messages.ts).
- If you validate with **`safeParse`** outside the form (e.g. multistep “next” buttons), show issues with **`translateZodIssueMessages`** from the same module so the toast matches the active locale.

### Overlay forms (modals and sheets)

Use this pattern whenever a form lives inside a **dialog** or **sheet**: keep **fields** in a **scrollable** middle region and put **primary actions** (submit, cancel, etc.) in a **fixed footer** outside the scrolling area. That matches system dialogs and admin CRUD modals and avoids submit buttons scrolling away on long forms.

#### Primitives

- **`useAppForm`** — shared TanStack Form hook with field components and invalid-submit toast behavior: [`src/components/forms/hooks.tsx`](../src/components/forms/hooks.tsx).
- **`OverlayFormBody`** — the real `<form>` in the scrollable body. Takes a stable **`formId`** (from `useId()`), **`onSubmit`** (`preventDefault` + `form.handleSubmit()`).
- **`OverlayFormSubmitButton`** — submit control that lives **outside** the `<form>` but stays associated via the native **`form` attribute** (`type="submit"` + `form={formId}`). Required for footer placement.
- **`OverlayFormFooterActions`** — optional flex row/column wrapper for cancel + submit aligned like other admin dialogs.

Source: [`src/components/forms/overlay-form.tsx`](../src/components/forms/overlay-form.tsx).

#### Admin entity form dialog (raw `Dialog`)

Standard layout for entity `*-form-dialog.tsx` files:

1. **`DialogContent`**: `className` includes `gap-0 overflow-hidden p-0` plus width (e.g. `sm:max-w-md`) so header, body, and footer are explicit regions.
2. **`DialogHeader`**: title and description; `shrink-0` + horizontal padding.
3. **`ScrollArea`**: `className="min-h-0 flex-1 px-4 py-4"` with `scrollX={false}` wrapping **`OverlayFormBody`** (fields only inside the form).
4. **`DialogFooter`**: `shrink-0 border-t bg-muted px-4 py-4` with cancel (`type="button"`) and **`OverlayFormSubmitButton`** (`formId={formId}`).

The dialog shell uses a column flex layout from [`src/components/ui/dialog.tsx`](../src/components/ui/dialog.tsx) (`max-h`, `min-h-0`) so the scroll area gets a bounded height.

References: `product-form-dialog.tsx`, `branch-form-dialog.tsx`, `user-form-dialog.tsx` under each entity’s `admin/components/`.

#### System dialog (`SystemDialog`)

[`src/components/general/system-dialog.tsx`](../src/components/general/system-dialog.tsx) already splits **header**, **scrollable body**, and **`actions`** footer.

- Put **`OverlayFormBody`** (and field content) in **`children`** (inside the scroll region).
- Pass footer controls to **`actions`**. For TanStack state such as `isSubmitting`, wrap the dialog content tree from the same component in **`<form.AppForm>`** (from `useAppForm`) so **`form.Subscribe`** in `actions` still sees the form context (React context flows through the dialog portal in React 18+).

Use **`OverlayFormSubmitButton`** with the same **`formId`** as **`OverlayFormBody`** for the primary submit in `actions`.

References: auth profile / email / password / branch-manager flows that embed `SystemDialog` with footer submit.

#### Opening dialogs from menus (nested dialogs)

Base UI suppresses the dialog **backdrop** when the dialog is opened from another floating surface (e.g. dropdown menu) unless the backdrop opts in. The shared **`DialogOverlay`** / **`SheetOverlay`** default **`forceRender={true}`** on the backdrop so modals opened from the Auth Manager (and similar) still show the dimmer and dismiss correctly. Do not remove that default unless you intentionally want nested dialog stacking without a second scrim.

#### Blueprint For AI Agents (forms)

When adding or editing an entity form in a modal:

1. Use **`useAppForm`** + **`form.AppField`** / shared field components as today.
2. Use **`useId()`** for **`formId`**; wire **`OverlayFormBody`** + **`OverlayFormSubmitButton`** (and optional **`OverlayFormFooterActions`**).
3. Keep mutations, `toast.promise`, `FieldSet disabled={pending}`, and **`form.reset`** behavior in the feature; only the **layout and submit wiring** are standardized.
4. For **`SystemDialog`**, prefer footer **`actions`** + **`OverlayFormBody`** in **`children`**; use **`<form.AppForm>`** when the footer needs **`form.Subscribe`**.
5. After substantive form or dialog changes, run **`npm run build`** (project standard sanity check).
6. Follow **Form Pattern → Zod validation messages (translation keys)** for all user-facing Zod messages.

## Blueprint For AI Agents

When asked to add an entity, an AI agent should:

1. Ask the intake questions in this document if the feature set is not already clear.
2. Confirm import/export, filters, row actions, bulk actions, branch scope, audit dialog behavior, and the correct table mode before generating code.
3. Confirm whether row selection also requires an action bar. Default answer: yes.
4. Use client-mode tables for definition pages by default.
5. Use server-mode tables for transactional pages by default.
6. Create the schema file in the correct domain.
7. Export it through `src/drizzle/schema.ts`.
8. Add the entity to the central registry.
9. Create `schemas.ts`, `queries.ts`, `mutations.ts`, `router.ts`, and `types.ts`.
10. Add `import.ts` only when import is required.
11. Create feature-owned admin UI primitives.
12. Add a thin route file in `src/app/(system-pages)`.
13. Add full bilingual copy.
14. Add seed support if the entity is demo-visible.
15. Avoid duplicating patterns that already exist in another entity feature.
16. For **create/edit form modals**, follow **Form Pattern → Overlay forms** (scrollable body, footer actions, `overlay-form` primitives).

## Definition Of Done

An entity is not complete until all of the following are true:

- the requested feature set was explicitly confirmed
- database table exists
- migrations are generated and applied
- entity is registered
- admin route exists
- permissions work
- nav and breadcrumb labels resolve
- audit info dialog follows the agreed mode
- meaningful entity filters are present
- the chosen table mode matches the entity type or has explicit justification
- row actions match the agreed action set
- row selection also includes the action bar when selection is enabled
- import/export is implemented if requested
- bilingual copy is present
- seed story is defined
- create/edit **form dialogs** follow **Form Pattern → Overlay forms** (footer submit via `overlay-form`, scrollable field region)
- docs remain accurate
