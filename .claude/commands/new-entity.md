# /new-entity

Scaffold a new admin entity following the Gateling entity blueprint.

## Usage

```
/new-entity <entity-name>
```

Example: `/new-entity testimonials`

## What this command does

Before generating any code, confirm the intake questions from `docs/entity-blueprint.md`:

1. What business role does this entity play?
2. Is it global, branch-aware, or future-branch-aware?
3. Does it need import? Export?
4. Does the table need row selection?
5. Is this a definition/reference page or transactional page? (determines client vs server table mode)
6. Does it need bulk actions? Which ones?
7. Which filters should appear?
8. Which row actions are required?
9. Should the info dialog be audit-only? (default: yes)
10. Does it need a public or landing-page presence?
11. Should it be demo-visible and seeded?

Then generate in this order:

### 1. Database schema
`src/drizzle/schemas/portfolio/<entity>-table.ts`
- Include audit fields: `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `deletedAt`, `deletedBy`
- Export through `src/drizzle/schema.ts`
- Run `npm run db:generate` then `npm run db:migrate`

### 2. Registry entry
Add to `src/features/system/registry/entities.ts`:
```ts
{
  slug: "<entity>",
  route: "/<entity>",
  screenKey: "<ENTITY>_SCREEN",
  icon: <LucideIcon>,
  navLabelKey: "nav.<entity>",
  // ... full SystemEntityRegistryItem shape
}
```

### 3. Server modules
`src/features/system/<entity>/server/`:
- `schemas.ts` — Zod input schemas (messages are i18n keys, not English)
- `queries.ts` — list/detail/export logic
- `mutations.ts` — create/update/delete/toggle
- `router.ts` — tRPC procedures (protectedProcedure / adminProcedure)
- `types.ts` — row and DTO types

### 4. tRPC router
`src/integrations/trpc/routers/<entity>.ts` — import entity router
Add to `src/integrations/trpc/routers/root.ts`

### 5. Admin UI
`src/features/system/<entity>/admin/`:
- `<entity>s-table-page.tsx`
- `components/<entity>-form-dialog.tsx` (overlay form pattern)
- `components/<entity>s-grid-filters.tsx`
- `components/<entity>-info-dialog.tsx` (audit-only by default)
- `components/<entity>-row-actions.tsx`
- (if row selection) `components/<entity>s-bulk-actions.tsx`
- `components/<entity>s-table-columns.tsx`
- `index.ts`

### 6. Route
`src/app/(system-pages)/<entity>/page.tsx` — thin route with prefetch

### 7. i18n
Add keys to `src/features/core/i18n/global/en.ts` and `ar.ts`

### 8. Seed (if demo-visible)
Add seed function in `src/drizzle/seed/`

### Verification
`npm run build && npm run typecheck`
