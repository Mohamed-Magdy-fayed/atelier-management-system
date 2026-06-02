# Gateling Solutions Portfolio — CLAUDE.md

AI agent documentation for working on this codebase. Read fully before making changes.

## Quick Start

```powershell
npm install
npm run db:start        # start PostgreSQL via Docker
npm run db:migrate      # apply Drizzle migrations
npm run seed:all        # seed admin user, main branch, portfolio content
npm run dev             # start dev server
npm run typecheck       # TypeScript check
npm run build           # production build (must pass before any PR)
```

## Product

**Gateling Solutions** is a B2B technology consulting startup that finds the most painful points in a business and resolves them using technology and AI. Clients include any businesses across Egypt and MENA with a struggle in operations.

This repository is the public portfolio + admin system at `gateling.com`.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| Styling | Tailwind CSS 4, shadcn/ui (Base UI) |
| API | tRPC 11 (type-safe RPC) |
| ORM | Drizzle + PostgreSQL |
| Auth | Custom (sessions + OAuth Google + WebAuthn biometric) |
| Storage | Firebase Storage (images/assets) |
| Forms | TanStack Form + Zod |
| Tables | TanStack Table (client + server modes) |
| Jobs | Inngest (background job queue — heavy use) |
| Email | Nodemailer (SMTP) |
| i18n | Custom provider, EN + AR (RTL) |
| Cache | Upstash Redis |
| Linter | Biome (replaces ESLint + Prettier) |

## Repository Map

```
src/
  app/
    _providers/           # holds any custom providers that should wrap the code exporting a single Providers component to use inside root layout
    (auth)/               # Sign-in, sign-up, password-reset, forgot-password, verify-email, unautorized
    (landing-pages)/      # Public site (here we add all pages that are customer facing (needs no auth and SEO optimized))
      _components/        # any reusable components that will be used across multible pages ex. Header + Footer and pages sections
      layout.tsx          # this is a unified layout for all public pages
    (system-pages)/       # Protected admin only pages (uses permissions system to validate user access in proxy.ts file)
      _components/        # any reusable components that will be used across multible pages ex. Header extras sections
      layout.tsx          # this is a unified layout for all protected routes that holds the app-shell as well
    (customer-portal)/    # holds any pages that are only available to authed customers where they can view information about thier own account
      _components/        # any reusable components that will be used across multible pages ex. Header other sections
      layout.tsx          # this is a unified layout for all customer protected routes that should look more eye catching and easy to use
    api/
      inngest/            # Inngest webhook handler
      oauth/[provider]/   # the custom auth callback handler
      trpc/[trpc]/        # the TRPC hadnler
    sitemap.ts            # Dynamic sitemap (all routes + published work + blog)
    robots.ts             # robots.txt
    layout.tsx            # Root layout — metadata, JSON-LD, providers
  components/
    ui/                   # shadcn/ui primitives
    general/              # App-specific shared components
    forms/                # TanStack Form field components + hooks
  features/
    core/                 # Auth, shell, i18n, data-table, import-review, color-theme
    portfolio/            # Public-facing portfolio data access
    customer-portal/      # Signed-in customer lead history
    system/               # Admin entities (registry-driven)
      registry/           # entities.ts + screens.ts (source of truth) the main example is users table
      case-studies/       # Admin case studies management
      blog-posts/         # Admin blog post management
      services/           # Admin services management
      testimonials/       # Admin testimonials management
      leads/              # Admin leads inbox
      subscribers/        # Admin subscribers list
      users/              # Admin user management (employees + admin roles)
      dashboard/          # Portfolio KPI dashboard
      branches/           # Branch management (admin-only)
      settings/           # System settings
  integrations/
    trpc/routers/         # Per-entity tRPC routers
    firebase/             # Firebase Storage integration
    inngest/              # Inngest client, event types, functions/
    email/                # Nodemailer + React Email templates
  lib/                    # Utilities (cn, phone, slug, format)
  env/
    server.ts             # Server-side env (DB, JWT, SMTP, Firebase Admin)
    client.ts             # Client-side env (Firebase public keys)
  drizzle/
    schemas/
      auth/               # users, credentials, oauth, biometric, branches, branch-memberships (all auth related tables)
      system/             # all system related tables
    migrations/
      we don't edit them manually at all, instead we run npm run db:generate
    seed/
      this holds the seeding logic for testing it seeds a main admin user and a basic data set in all tables that shows how the entire system would work in real life for a past year or so, prefarable using faker but main focus is that data feels egypt related
```

## Key Entities

| Entity | Table | Admin Route | Public Route |
|--------|-------|-------------|-------------|
| Case Studies | `case_studies` | `/work` | `/work`, `/work/[slug]` |
| Blog Posts | `blog_posts` | `/blog-posts` | `/blog`, `/blog/[slug]` |
| Services | `services` | `/services-mgmt` | `/services` |
| Testimonials | `testimonials` | `/testimonials` | Homepage section |
| Leads | `leads` | `/leads` | `/contact` form |
| Subscribers | `subscribers` | `/subscribers` | Homepage + blog forms |
| Users | `users` | `/users` | — |
| Branches | `branches` | `/branches` | — |

## User Roles

| Role | Access |
|------|--------|
| `admin` | Everything. Seeded as `root@gateling.com`. Cannot be deleted. |
| `employee` | Branch-scoped access (users, leads) |
| `customer` | `/my-account` — view own submitted leads |

## Architecture Rules

1. **Thin routes** — `page.tsx` composes the feature page only; business logic in features or server modules.
2. **tRPC for all data** — never fetch from DB in page components; use `api.*` from `@/integrations/trpc/server` or client hooks.
3. **i18n required** — every user-visible string must use `t('key')` with entries in both `*-en.ts` and `*-ar.ts` files.
4. **Server components first** — only add `"use client"` when hooks (state, effects) are needed.
5. **Bilingual EN + AR** — RTL via `dir` on `<html>`. Use `ms-*`/`me-*` (logical) not `ml-*`/`mr-*`.
6. **No `any`** — use `unknown` + narrowing, or inferred types from Zod/Drizzle.
7. **Build must pass** — run `npm run typecheck && npm run build` after any substantive change.
8. **Inngest for async** — any operation that does not require an immediate user response is offloaded to Inngest. See `docs/inngest-offload-policy.md`.
9. **Firebase for storage** — all image/asset uploads use `src/integrations/firebase/storage.ts`. No Cloudinary.

## Forms Pattern (TanStack Form)

- `useAppForm()` from `src/components/forms/hooks.tsx` — shared hook with Zod validation
- Field components: `EmailField`, `PasswordField`, `StringField`, `NumberField`, `DateField`, `SelectField`, `ImageField`
- Field components only support `useFieldContext()` — **never** `useFormContext()` inside leaf fields
- Zod error messages: i18n keys (e.g. `"forms.validation.required"`), not literal English strings
- Overlay forms: scrollable `OverlayFormBody` + fixed footer `OverlayFormSubmitButton` (see entity blueprint)

## Admin Entity Pattern

Follow `docs/entity-blueprint.md` for every admin entity. Required structure per entity:
best example is users table
```
features/system/<entity>/
  admin/
    components/
      <entity>-form-dialog.tsx
      <entity>s-grid-filters.tsx
      <entity>-info-dialog.tsx
      <entity>-row-actions.tsx
      <entity>s-bulk-actions.tsx
      <entity>s-table-columns.tsx
    <entity>s-table-page.tsx
    index.ts
  server/
    schemas.ts
    queries.ts
    mutations.ts
    router.ts
    types.ts
  index.ts
```

Registry at `src/features/system/registry/entities.ts` is the single source of truth for capabilities.

## SEO Pattern

Every public page must have:
- Per-page `metadata` export (or `generateMetadata()` for dynamic routes) meta data should be available in both languages
- Title follows the site template: `%s | Gateling Solutions`
- OG image: `coverImageUrl` for dynamic content, `/og-default.png` for static pages
- JSON-LD on homepage: `Organization` + `WebSite`
- JSON-LD on case studies: `Article` schema
- See `docs/seo-blueprint.md` for full keyword targets and copy templates

## Inngest Background Jobs

See `docs/inngest-offload-policy.md` for the full policy.

Events fired:
- `lead/submitted` → email to `info@gateling.com` + auto-reply to visitor
- `subscriber/created` → confirmation email with unsubscribe link
- `case-study/published` → ping Google IndexNow
- `blog-post/published` → ping Google IndexNow + newsletter digest
- `user/registered` → welcome email (customer role gets Gateling intro)
- `lead/status-changed` → notify admin when lead becomes `qualified`

## Firebase Storage

Upload helper: `src/integrations/firebase/storage.ts` → `uploadImage(file, path): Promise<string>`

Used for: case study cover images, blog post covers, testimonial avatars, service icons.

## i18n Structure

Translation files co-located with the feature or page:
```
src/app/(landing-pages)/<page>/_translations/<page>-en.ts
src/app/(landing-pages)/<page>/_translations/<page>-ar.ts
src/features/core/i18n/global/en.ts   # shared keys (header, footer, common, forms)
src/features/core/i18n/global/ar.ts
src/features/<entity>/i18n/<entity>-en.ts
src/features/<entity>/i18n/<entity>-ar.ts
```
Every new user-visible string must appear in **both** `en` and `ar` files in the same change.

## Environment Variables

Server (`src/env/server.ts`):
```
# Database (one of these two forms)
DATABASE_URL                    # full postgres URL
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME  # split config

# Auth
BASE_URL                        # e.g. https://gateling.com
JWT_SECRET_KEY                  # min 32 chars
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
OAUTH_REDIRECT_URL_BASE

# Cache
REDIS_URL
REDIS_TOKEN

# Email
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
SMTP_SECURE, SMTP_FROM_EMAIL, SMTP_FROM_NAME

# Inngest
INNGEST_SIGNING_KEY
INNGEST_EVENT_KEY

# Firebase Admin (server)
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
FIREBASE_STORAGE_BUCKET

# WhatsApp
WAPILOT_INSTANCE_ID
WAPILOT_API_TOKEN
```

Client (`src/env/client.ts`):
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

## Reference Projects (Success Stories)

These are Gateling's real client projects — reference them for seeding and content:

| Project | Path | public URL |
|---------|------|---------------|
| Atelier Alaa El-Kasry | `C:\Users\moham\OneDrive\Desktop\apps\atelier-management-system` | https://atelier.gateling.com/ |
| Gateling Cafe | `C:\Users\moham\OneDrive\Desktop\apps\gateling-cafe` | https://cafe.gateling.com/ |
| Megz Courses | `C:\Users\moham\OneDrive\Desktop\apps\megz-courses` | https://tms.gateling.com/ |

## Agent Workflow

- Read `docs/entity-blueprint.md` before adding any admin entity
- Read `docs/seo-blueprint.md` before adding any public page
- Read `docs/inngest-offload-policy.md` before adding any server mutation that involves email or external calls
- Quality gate: `npm run typecheck && npm run build` must pass after every substantive change
- Biome enforces sorted imports — run `npm run check:write` to auto-fix
- No `any`, no `@ts-ignore`, no hardcoded English user-visible strings
- RTL-safe: use logical CSS properties (`ms-`, `me-`, `ps-`, `pe-`) not directional (`ml-`, `mr-`)
