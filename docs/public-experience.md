# Public Experience

Guidelines for public-facing pages on gateling.com: the landing pages, case study detail, blog, and the lightweight customer portal.

## Principles

- **User-facing copy only** — no internal jargon ("tRPC", "mutation", table names, status codes).
- **Purpose-first navigation** — each route has one job; avoid duplicate routes for the same content.
- **Quality bar equals admin** — responsive layout, loading/empty/error states, accessible controls.
- **Design system consistency** — same `Alert`, `ScrollArea`, `Button`, typography tokens as admin.

## Copy Tone

The portfolio speaks to business owners and operations managers, not developers.

- ✅ "We eliminate the manual work slowing your team down"
- ✅ "Built for the way your business actually runs"
- ❌ "Our tRPC-based API with Drizzle ORM..."
- ❌ "Leveraging cutting-edge microservice architecture..."

Lead with outcomes. Mention technology only when it adds credibility ("AI-powered", "real-time").

## Layout

### Desktop
- Sticky header with logo + navigation links + CTA button ("Get Free Consultation")
- Footer with links: Services, Work, Blog, About, Contact, Privacy, Terms

### Mobile
- Hamburger menu in header (not bottom tab bar — this is a portfolio, not an app)
- Large touch targets for CTA buttons
- Single-column layouts for all sections

## Hero Section

Every page must have a clear hero:
- H1: clear outcome-focused headline (see `docs/seo-blueprint.md` for per-page copy)
- Subheading: 1-2 sentences expanding on the H1
- Primary CTA: clear action button ("Get Free Consultation", "See Our Work", etc.)
- Optional: secondary CTA or trust indicator (client logos, metric callout)

## Success Story Cards

Case study cards on the `/work` grid show:
- Cover image (with fallback if missing)
- Industry badge
- Client name
- Key result metric (e.g. "70% less admin time") — required, never empty
- Short problem statement (1 line)
- "Read Case Study" link

## Contact Form

The contact form at `/contact` is the primary conversion point.

Fields:
- Name (required)
- Email (required)
- Company name (optional — helps qualify)
- Phone / WhatsApp (optional)
- Message: "Tell us about your biggest challenge" (required)

On submit:
1. Client-side Zod validation (i18n error messages)
2. tRPC `leads.submit` public procedure — saves to `leads` table
3. Fires `lead/submitted` Inngest event (email + auto-reply happen async)
4. Shows success state: "We'll be in touch within 24 hours"

Rate limiting: 3 submissions per IP per 10 minutes (Upstash Redis).

## Newsletter Subscription

Email-only form. On submit:
1. Zod validate email
2. tRPC `subscribers.create` — checks for duplicate, saves with `status: active`
3. Fires `subscriber/created` Inngest event (confirmation email async)
4. Shows success: "Check your inbox for a confirmation email"

## WhatsApp Button

Floating button rendered in the public shell layout.
Uses `src/lib/phone.ts` `generateWhatsAppUrl(phone, message)`.
Phone number comes from `settings` table (admin-configurable).

## ROI Calculator

Fully client-side component (`"use client"`). No API calls.

Inputs:
- Team size (number of people doing manual work)
- Manual hours per person per week
- Average hourly cost (EGP or USD, user chooses currency)

Outputs (computed in real-time):
- Weekly cost of manual work
- Monthly cost
- Annual cost
- Estimated savings with 70% automation (conservative)

CTA below results: "Want to automate this? Let's talk." → `/contact?source=roi-calculator`

## Customer Portal (`/my-account`)

Visible only to signed-in users with `customer` role.

Shows:
- Greeting with customer name
- Table of submitted leads: date, status (new/contacted/qualified/closed), message preview
- "Submit a new inquiry" button → `/contact`

No editing of lead data — read-only view.

## SEO Rules for Public Pages

Every public page must have `metadata` export. See `docs/seo-blueprint.md` for required titles, descriptions, and keywords per page.

## Definition of Done (Public Page)

- [ ] Responsive at mobile, tablet, and desktop
- [ ] No broken states on slow network (skeleton or error fallback)
- [ ] All strings localized in both `en` and `ar` translation files
- [ ] `metadata` exported with title, description, and OG image
- [ ] Build passes; no console errors
- [ ] WhatsApp floating button visible
- [ ] Primary CTA links to `/contact`
