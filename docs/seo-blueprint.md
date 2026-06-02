# SEO Blueprint

SEO requirements for every public page on gateling.com.

## Metadata Rules

Every public page (`(landing-pages)`) must export either:
- `export const metadata: Metadata = { ... }` (static pages)
- `export async function generateMetadata(): Promise<Metadata>` (dynamic routes)

Always use the title template in root layout: `%s | Gateling Solutions`
Never hardcode ` | Gateling Solutions` in a per-page title.

## Per-Page SEO Targets

### Homepage `/`
- **Title:** `Custom Software Development & Business Automation | Gateling Solutions`
- **Description:** `We find the most painful points in your business and resolve them with custom software and AI. Serving cafes, schools, retail & events across Egypt and MENA.`
- **Primary keyword:** `custom software development Egypt`
- **Secondary:** `business automation MENA`, `software for cafes schools retail`
- **H1:** `Custom Software That Works the Way Your Business Works`

### Services `/services`
- **Title:** `Custom Software & Business Automation Services | Gateling Solutions`
- **Description:** `Custom software development, process automation, and AI integration for restaurants, schools, retail, and events. Free 30-min consultation. Egypt & MENA.`
- **Primary keyword:** `business process automation`
- **Secondary:** `custom ERP Egypt`, `AI integration for business`, `workflow automation software`
- **H1:** `Full-Stack Business Solutions — From Custom Apps to AI Automation`

### Work (case studies) `/work`
- **Title:** `Case Studies — Real Results for Real Businesses | Gateling Solutions`
- **Description:** `See how we helped a cafe automate callouts, a school digitize enrollment, and an atelier manage multi-branch rentals. Real impact, measurable results.`
- **Primary keyword:** `custom software case studies`
- **Secondary:** `cafe management automation`, `school ERP Egypt`
- **H1:** `Work We've Built — Real Results for Real Businesses`

### Case Study Detail `/work/[slug]`
- **Title:** `[client]: [key result] | Gateling Solutions`
- **Description:** First 155 chars of `problemStatement`
- **OG image:** `coverImageUrl`

### Blog `/blog`
- **Title:** `Blog — Business Automation & Custom Software Insights | Gateling Solutions`
- **Description:** `Insights on automating your business, building custom software, and integrating AI. For growing businesses in Egypt and MENA.`
- **Primary keyword:** `business automation guide`
- **H1:** `Insights on Building Software That Actually Matters`

### Blog Post `/blog/[slug]`
- **Title:** Post title (uses template: `[post title] | Gateling Solutions`)
- **Description:** Post `excerpt`
- **OG image:** Post `coverImageUrl`

### About `/about`
- **Title:** `About Gateling Solutions — Custom Software Specialists, Egypt & MENA`
- **Description:** `Custom software specialists helping businesses across Egypt and MENA automate operations, integrate AI, and scale with purpose-built technology systems.`
- **Primary keyword:** `software development company MENA`
- **H1:** `We Build Software That Solves Real Business Problems`

### Contact `/contact`
- **Title:** `Get a Free Consultation — Custom Software & Automation | Gateling Solutions`
- **Description:** `Tell us your biggest business problem. We'll design a custom solution and give you a free 30-minute consultation. Egypt, MENA & worldwide.`
- **H1:** `Let's Build Your Next Competitive Advantage`

### ROI Calculator `/tools/roi-calculator`
- **Title:** `Business Automation ROI Calculator — How Much Is Manual Work Costing You?`
- **Description:** `Calculate how much time and money your team loses to manual processes. See your potential savings with business automation. Free calculator.`
- **H1:** `How Much Is Manual Work Costing Your Business?`

## JSON-LD Schemas

### Root Layout (all pages)

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Gateling Solutions",
  "url": "https://gateling.com",
  "logo": "https://gateling.com/logo.png",
  "email": "info@gateling.com",
  "sameAs": [
    "https://linkedin.com/company/gateling",
    "https://github.com/gateling"
  ]
}
```

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Gateling Solutions",
  "url": "https://gateling.com"
}
```

### Case Study Detail Page

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "[case study title]",
  "description": "[problemStatement]",
  "image": "[coverImageUrl]",
  "datePublished": "[publishedAt]",
  "publisher": {
    "@type": "Organization",
    "name": "Gateling Solutions",
    "url": "https://gateling.com"
  }
}
```

### Blog Post Detail Page

Same `Article` schema as case study.

## Sitemap (`src/app/sitemap.ts`)

Static routes: `/`, `/services`, `/work`, `/blog`, `/about`, `/contact`, `/tools/roi-calculator`

Dynamic routes:
- All published case studies: `/work/[slug]` with `lastModified: updatedAt`
- All published blog posts: `/blog/[slug]` with `lastModified: updatedAt`

Do NOT include admin routes, auth routes, or customer portal.

## robots.ts

```
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /leads
Disallow: /subscribers
Disallow: /blog-posts
Disallow: /work-mgmt
Disallow: /services-mgmt
Disallow: /testimonials
Disallow: /users
Disallow: /branches
Disallow: /settings
Disallow: /api/
Sitemap: https://gateling.com/sitemap.xml
```

## Canonical URLs

Use `src/app/layout.tsx` `metadataBase` to resolve relative OG images:
```ts
metadataBase: new URL(process.env.BASE_URL ?? "https://gateling.com")
```

## Arabic SEO

Arabic meta descriptions for key pages use these keywords:
- `تطوير برمجيات مخصصة` (custom software development)
- `أتمتة الأعمال` (business automation)
- `حلول تقنية للمطاعم والمدارس` (tech solutions for restaurants and schools)
- `استشارات ذكاء اصطناعي` (AI consulting)

When Arabic locale is active, serve Arabic metadata from the i18n system.

## Case Study Headline Pattern

Case study H1 must follow this pattern for maximum SEO impact:
`[Client Name]: [Key Result in 5-7 Words]`

Examples:
- "Atelier Alaa El-Kasry: 70% Less Admin Time Across 2 Branches"
- "Gateling Cafe: Zero Missed Callouts With AI Announcements"
- "Megz Courses: Full Lead-to-Student Pipeline Digitized"
