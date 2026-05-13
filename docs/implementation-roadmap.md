# Implementation Roadmap

## Purpose

This roadmap turns the agreed direction into a phased delivery plan.

The current priority order is:

1. docs first
2. safe high-impact cleanup
3. structural modularization
4. entity expansion

## Phase 0: Documentation Baseline

Status: active

Deliverables:

- project-specific `README.md`
- `docs/scaling-guide.md`
- `docs/entity-blueprint.md`
- `docs/seeding-and-demo-data.md`
- `docs/demo-readiness-checklist.md`
- this roadmap

Outcome:

- one documented direction for humans and AI agents
- less ambiguity before refactors

## Phase 1: Safe Demo Cleanup

Goal:

Make the product feel credible tomorrow without high-risk rewrites.

### Workstream 1. Brand unification

Update:

- metadata
- app name strings
- logo assets
- landing page brand usage

Target files:

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/features/core/i18n/global/en.ts`
- `src/features/core/i18n/global/ar.ts`
- `public/*`

### Workstream 2. Landing page replacement

Replace starter behavior with a business-facing landing page for `Funtastic`.

Target files:

- `src/app/page.tsx`
- `src/app/_providers/client.tsx`
- `src/integrations/trpc/routers/_app.ts`

### Workstream 3. Dashboard improvement

Turn the dashboard into a decision-maker surface.

Target file:

- `src/app/(system-pages)/dashboard/page.tsx`

### Workstream 4. Copy cleanup

Rewrite live UX copy to sound product-ready in both languages.

Target files:

- `src/features/core/i18n/global/en.ts`
- `src/features/core/i18n/global/ar.ts`
- `src/app/oauth/complete/page.tsx`

### Workstream 5. Safe junk cleanup

Remove example/debug/template residue where safe.

Target files:

- `src/features/core/auth/core/oauth/base.ts`
- `src/integrations/inngest/functions/example.ts`
- unused public starter assets

## Phase 2: System Modularization

Goal:

Prepare the codebase for repeatable entity growth.

### Workstream 1. Central registry

Introduce a screen and entity registry that can drive:

- nav
- permissions
- route metadata
- dashboard discovery
- import/export capabilities

Likely areas affected:

- `src/features/core/app-shell/lib/nav.ts`
- `src/features/core/auth/core/permissions.ts`
- `src/proxy.ts`

### Workstream 2. Users feature extraction

Move route-local users admin code into a feature-owned module.

Current source:

- `src/app/(system-pages)/_components/*`

Target direction:

- `src/features/system/users/admin/*`

### Workstream 3. Split users server logic

Refactor:

- `src/integrations/trpc/routers/users.ts`

Into:

- feature-owned queries
- mutations
- import logic
- schemas
- thin router

## Phase 3: Seed Modernization

Goal:

Support believable demo data and scalable developer workflows.

### Workstream 1. Profile-based seed structure

Introduce:

- `baseline`
- `demo`
- `performance`

### Workstream 2. Entity-level seed tasks

Extract current monolithic seed logic into task-based modules.

### Workstream 3. Safety improvements

Add:

- stronger local-environment guards
- clearer CLI help
- more intentional destructive behavior

## Phase 4: First New Entity Wave

Goal:

Prove the blueprint with concrete business entities.

Priority example entities:

- branches
- products or services
- orders or bookings

Definition of success:

- each follows the registry pattern
- each has admin UI primitives
- each can be demo-seeded
- each is documented

## Phase 5: Account And Branch Featureization

Goal:

Reduce pressure in overloaded auth-adjacent components while improving UX quality.

Current targets:

- `src/features/core/auth/nextjs/components/auth-manager.tsx`
- `src/features/core/auth/nextjs/components/branch-manager.tsx`

Direction:

- split into smaller feature units
- preserve behavior while improving maintainability
- prepare for dedicated account or settings screens later

## Recommended Execution Order

If work starts immediately after the docs pack, use this order:

1. unify branding
2. replace homepage
3. rewrite dashboard
4. clean visible copy and junk
5. introduce central registry
6. extract users feature
7. split users server router
8. modernize seeds
9. add products and orders blueprint implementation

## Risk Notes

Highest risk items:

- permission and route-guard changes
- large refactors inside `users.ts`
- seed cleanup changes in non-local databases

Lower risk but high value:

- branding cleanup
- landing page rewrite
- dashboard rewrite
- copy cleanup
- removing debug and example residue

## Definition Of Success

The roadmap succeeds when:

- the demo looks intentional and polished
- the codebase has one documented expansion path
- adding a new entity is no longer a manual scavenger hunt
- the product can grow into products, orders, and richer business workflows
