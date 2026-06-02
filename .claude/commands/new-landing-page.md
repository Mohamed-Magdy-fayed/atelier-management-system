# /new-landing-page

Scaffold a new public landing page with SEO best practices.

## Usage

```
/new-landing-page <page-name>
```

Example: `/new-landing-page services`

## What this command does

### 1. Page directory
Create `src/app/(landing-pages)/<page-name>/`

### 2. SEO metadata
`src/app/(landing-pages)/<page-name>/layout.tsx`:
```ts
export const metadata: Metadata = {
  title: "<Page Title>",          // no " | Gateling Solutions" — template handles it
  description: "<155 char desc>", // include primary keyword
  openGraph: {
    title: "<OG Title>",
    description: "<OG description>",
    images: [{ url: "/og-<page>.png", width: 1200, height: 630 }],
  },
};
```

Check `docs/seo-blueprint.md` for the required copy for common pages.

### 3. Page component
`src/app/(landing-pages)/<page-name>/page.tsx`:
- Server component by default (`async function`)
- Prefetch any tRPC data needed
- Compose `_components/` sections
- H1 matches the SEO blueprint copy

### 4. Section components
`src/app/(landing-pages)/<page-name>/_components/`:
- `hero-section.tsx` — H1, subheading, CTA buttons
- Additional sections as needed
- Each section is a separate server or client component

### 5. i18n translations
`src/app/(landing-pages)/<page-name>/_translations/<page>-en.ts`
`src/app/(landing-pages)/<page-name>/_translations/<page>-ar.ts`

Every visible string goes through `t('key')`.

### 6. Add to sitemap
In `src/app/sitemap.ts` — add static route entry:
```ts
{ url: `${base}/<page-name>`, lastModified: new Date() }
```

### Public UX checklist
See `docs/public-experience.md` for definition of done.

### Verification
`npm run build && npm run typecheck`
