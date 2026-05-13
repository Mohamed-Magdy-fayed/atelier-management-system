# Demo Readiness Checklist

## Goal

This checklist defines the safest high-impact cleanup pass for making `Funtastic` feel like a credible working product during a client demo.

The agreed direction is:

- keep cleanup safe
- avoid risky behavioral rewrites unless clearly controlled
- improve product credibility fast
- keep full Arabic and English parity

## Demo Narrative

The system should present itself as:

- a business suite
- branch-aware
- admin-friendly
- decision-maker oriented
- capable of handling customers, employees, products, and orders over time

## P0: Must Fix Before Demo

These are the highest-value credibility issues.

### 1. Unify branding

Replace inconsistent names and assets so the product only appears as `Funtastic`.

Current repo hotspots:

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/features/core/i18n/global/en.ts`
- `src/features/core/i18n/global/ar.ts`
- `public/megz-logo.svg`

Expected result:

- one app name
- one logo direction
- one metadata identity

### 2. Replace starter homepage behavior

The current home page still feels like a scaffold.

Current repo hotspots:

- `src/app/page.tsx`
- `src/app/_providers/client.tsx`
- `src/integrations/trpc/routers/_app.ts`

Expected result:

- branded landing page
- clear business value
- strong entry into the product

Remove or stop showcasing:

- `hello` greeting demo behavior
- generic loading-only greeting UI
- starter-like hero structure

### 3. Rewrite developer-facing live copy

Several live strings explain the implementation instead of the product value.

Current repo hotspots:

- `src/features/core/i18n/global/en.ts`
- `src/features/core/i18n/global/ar.ts`

Priority text areas:

- page leads
- delete confirmations
- import action labels
- sorting helper copy
- any "record(s)" or "user(s)" style text

Expected result:

- business-facing language
- natural pluralization
- no engineering narration

### 4. Make customers and employees page-safe

Customers and employees currently share a generic user dialog that can break context.

Current repo hotspots:

- `src/app/(system-pages)/customers/customers-table-page.tsx`
- `src/app/(system-pages)/employees/employees-table-page.tsx`
- `src/app/(system-pages)/_components/user-form-dialog.tsx`

Expected result:

- page-specific labels
- role-safe defaults
- no accidental cross-role creation from the wrong page

### 5. Upgrade the dashboard from shortcut page to decision surface

The dashboard should feel like a business control center, not a placeholder.

Current repo hotspot:

- `src/app/(system-pages)/dashboard/page.tsx`

Expected result:

- decision-maker oriented information
- meaningful summary cards
- quick actions
- strong operational framing

## P1: Very Important Next

### 6. Improve shell cohesion

The shell should feel like one product from landing page to system pages.

Current repo hotspots:

- `src/features/core/app-shell/components/app-shell-layout.tsx`
- `src/features/core/app-shell/components/app-sidebar.tsx`
- `src/features/core/app-shell/lib/nav.ts`

Expected result:

- breadcrumb model consistent with the system
- cleaner screen labeling
- easier future screen expansion

### 7. Full bilingual parity review

Every visible product-facing string touched in the demo pass must be updated in both languages.

Current repo hotspots:

- `src/features/core/i18n/global/en.ts`
- `src/features/core/i18n/global/ar.ts`
- `src/app/oauth/complete/page.tsx`

Expected result:

- no English-only fallback in active flows
- no one-language polish gap

### 8. Clean safe junk and obvious residue

Current repo hotspots:

- `src/features/core/auth/core/oauth/base.ts`
- `src/integrations/inngest/functions/example.ts`
- `public/vercel.svg`
- `public/window.svg`
- `public/file.svg`
- `README.md`

Expected result:

- no obvious example/debug leftovers
- no misleading template assets
- repo feels intentional

## P2: Structural Improvements That Also Help Demo Quality

These are less about immediate cosmetics and more about keeping the product from feeling fragile.

### 9. Modularize overloaded account and branch components

Current repo hotspots:

- `src/features/core/auth/nextjs/components/auth-manager.tsx`
- `src/features/core/auth/nextjs/components/branch-manager.tsx`

Expected result:

- clearer feature ownership
- easier UI iteration
- easier future dedicated pages

### 10. Move user admin UI out of route-local `_components`

Current repo hotspot:

- `src/app/(system-pages)/_components/*`

Expected result:

- scalable feature ownership
- less duplication when products and orders are added

## Demo Content Standards

Every client-facing screen should meet these rules:

- no placeholder branding
- no engineering descriptions
- no rough pluralization
- no debug output
- no "coming soon" on core flows being demonstrated
- no dead-end or contradictory actions

## Landing Page Standards

Because the agreed homepage direction is a branded landing page with business-value emphasis, the landing page should communicate:

- what the system helps teams manage
- why branches, staff, customers, and future modules matter
- that the product can grow into products and orders
- that it is polished and operational, not experimental

Do not over-focus the landing page on technical architecture. That belongs in docs, not in the sales-facing surface.

## Dashboard Standards

Because the agreed dashboard direction is a fully fledged decision-maker and information-processor surface, the dashboard should eventually communicate:

- high-level operational status
- recent activity
- branch-aware overview
- customer and staff health indicators
- fast access to key administrative actions

For the safe-first pass, even a believable summary-card dashboard is a major improvement over a button list.

## Safe-Only Guardrails

Do not make high-risk changes in the demo pass unless explicitly approved.

Avoid:

- major auth rewrites
- permission model rewrites without tests
- schema changes that are not needed for the demo
- large routing overhauls on the eve of a demo

Prefer:

- branding cleanup
- copy cleanup
- UX tightening
- safer component extraction
- curated demo data improvements

## Done Means

The product is demo-ready when:

- every visible brand surface says `Funtastic`
- the landing page feels intentional
- dashboard looks like a working system
- customer and employee management feel role-aware
- junk/example residue is no longer visible
- Arabic and English both feel supported
