# Atelier Alaa El-Kasry — Project Instructions

This file is project-level. Global rules are in `C:\Users\moham\.claude\CLAUDE.md` and take effect alongside these.

## Skills

| Skill | Command | When to use |
|-------|---------|-------------|
| New entity | `/new-entity` | Scaffolding any new admin entity end-to-end |

## Project-specific notes

- Schema barrel: `src/drizzle/schema.ts` (re-exports from `src/drizzle/schemas/system/index.ts`)
- tRPC root router: `src/integrations/trpc/routers/_app.ts`
- Registry: `src/features/system/registry/` (entities.ts + screens.ts)
- i18n: flat `systemPages.*` keys in `src/features/core/i18n/global/en.ts` + `ar.ts`
- Staff access guard: `src/features/system/shared/staff-access.ts`
- Reference implementation for new features: `src/features/system/payments/`
