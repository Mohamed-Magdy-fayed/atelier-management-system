# Portfolio Blueprint

Patterns specific to the Gateling Solutions portfolio public content.

## Slug Generation

All publicly-routed content (case studies, blog posts, services) has a `slug` field.

Rules:
- Auto-generate slug from title on create: lowercase, spaces → hyphens, strip special chars
- Validate uniqueness in the `router.ts` before insert
- Slug is never auto-updated when title changes (breaking URL is worse than stale slug)
- Expose a manual override in the form dialog

Helper: `src/lib/slug.ts` → `generateSlug(title: string): string`

## Publish Flow

Entities with a publish flow (case studies, blog posts) follow this state machine:
```
draft → published → archived
         ↓
      (back to draft via "unpublish")
```

Rules:
- `status` enum: `draft | published | archived`
- `publishedAt` is set once when first published; never overwritten on re-publish
- Only `published` records appear in public tRPC queries (`publicProcedure`)
- Publishing fires an Inngest event (`case-study/published` or `blog-post/published`)
- Admin sees all statuses; public sees only `published`

## Success Story (Case Study) Structure

Each case study must contain these structured sections in the DB:

```ts
type CaseStudyResults = {
  metrics: Array<{ label: string; value: string }>  // e.g. { label: "Admin time saved", value: "70%" }
  summary: string  // 1-2 sentence outcome
}
```

The `results` column is `jsonb` storing this shape.

Public detail page sections (in order):
1. Hero: client name, industry badge, cover image, key result metric callout
2. Challenge: `problemStatement` — what was broken before Gateling
3. Solution: `solution` — what was built and how it works
4. Results: `results.metrics` as stat cards + `results.summary`
5. Testimonial: linked `testimonials` record if any
6. Related work: 2 other published case studies (excluding current)
7. CTA: "Have a similar problem? Let's talk."

SEO for case study detail:
- Title: `[client]: [key result] | Gateling Solutions`
- Description: `[problemStatement truncated to 155 chars]`
- OG image: `coverImageUrl`

## Blog Post Structure

`content` field: Markdown string. Rendered with a Markdown renderer on the public page.

Public blog post sections:
1. Hero: title, cover image, author, publishedAt
2. Content: rendered Markdown
3. Sidebar CTA: "Working on a similar challenge?" → contact form
4. Subscribe nudge: newsletter inline form
5. Related posts: 2 other published posts

SEO for blog post detail:
- Title: `[post title] | Gateling Solutions`
- Description: `excerpt` (keep under 155 chars)
- OG image: `coverImageUrl`

## Service Card Structure

Each service on the public `/services` page shows:
- Icon (lucide icon name, rendered client-side)
- Title
- Short description
- Feature list (from `features` jsonb: `string[]`)
- CTA button → `/contact`

## OG Image Strategy

| Page | OG image source |
|------|----------------|
| Homepage | `/public/og-default.png` (1200×630, Gateling brand) |
| `/services` | `/public/og-services.png` |
| `/work` | `/public/og-work.png` |
| `/work/[slug]` | `case_studies.coverImageUrl` |
| `/blog` | `/public/og-blog.png` |
| `/blog/[slug]` | `blog_posts.coverImageUrl` |
| All others | `/public/og-default.png` |

All OG images must be 1200×630px.
