# Public experience & customer portal

Rules for **`(public)`**, **`view-dress`**, **`collection`**, and **`(customer-portal)`** routes — distinct from the admin workspace in **`(system-pages)`**.

---

## Product intent

- **Atelier-branded** landing: browse dresses, branches, prices (when allowed), **availability check** by date — **no online checkout** (in-store follow-up).
- Home/landing **is** the dress browser; do not duplicate a separate `/dresses` public nav route for the same content.
- User-facing copy only on public pages — no backend/system jargon on landing.

---

## Navigation

### Desktop

- Visible primary navigation on public layouts.
- When signed in: **My account**, **Dashboard**, or **Workspace** links where role allows (`canViewAdminDashboard`, permissions).

### Mobile (public + system)

- **Five-tab** bottom bar pattern; tabs **evenly spaced** when fewer than five items (e.g. employees see fewer admin tabs).
- **Auth Manager** lives under **More**, not duplicated in the header on mobile.
- Public mobile: **route-based tabs** with slide transitions — not hash-scroll on one long page.
- Bottom bar is part of **flex layout** (does not overlap main scroll or hide scrollbars).

### Branch pickers on public pages

- Use shadcn **`Select`**, not native `<select>`.

---

## Browse & dress detail

- Filters: **Clear** resets draft selections without requiring Apply first (`public-catalog-filters.tsx`).
- Dress cards: image **fallback** when missing.
- Dress modals: use app **`ScrollArea`** pattern (same as admin overlay forms).
- **Availability checker** component for date-based checks before visit.

### Price visibility (admin setting)

When admin hides prices:

- Hide price UI, disclaimers, and **price sort** on public catalog.
- Omit empty size labels where applicable.

### Sorting

- “Best feedback” / featured home dresses: same performance criteria as **dashboard** (`public-dress-sort.ts` + dashboard server logic).

---

## Branch public pages

- Primary CTA: **WhatsApp** (not generic “call” only).
- Drop empty contact sections.

---

## Customer portal (`/my-account`)

- Rental **customers** may sign in (e.g. Google OAuth) and view past reservations/stats.
- Must work for OAuth users even when `rental_customers.userId` link is pending (phone-based linking graceful path in `customer-portal` server).
- Link to admin dashboard from profile/menus only when `canViewAdminDashboard` is true.

---

## Related code

| Area | Path |
|------|------|
| Public catalog | `src/features/public-catalog/` |
| Customer portal | `src/features/customer-portal/` |
| Public routes | `src/app/(public)/`, `src/app/view-dress/`, `src/app/collection/` |
| Account destination helper | `src/features/public-catalog/lib/public-account-destination.ts` |
