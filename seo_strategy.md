# SEO Strategy

## In scope
- Public marketing pages
- Public tool landing pages and generators
- Country invoice landing pages
- Blog index and blog posts
- Public trust and legal pages (`/about`, `/contact`, `/faq`, `/how-it-works`, `/privacy`, `/terms`, `/disclaimer`)
- Public calculator pages and calculator SEO landing pages
- Machine-readable discovery files (`robots.txt`, `sitemap.xml`, `llms.txt`, `rss.xml`)

## Out of scope
- Authenticated dashboard routes (`/dashboard`, `/documents`, `/clients`, `/settings`)
- Admin routes (`/admin/**`)
- Auth-only flows (`/login`, `/signup`, `/forgot-password`, `/reset-password`)
- Internal API routes unless they affect crawler behavior

## Target audience
- Freelancers
- Small and medium businesses
- Arabic- and English-speaking business users
- Users looking for invoice, quotation, receipt, calculator, and business utility tools

## Primary keywords
- invoice generator
- quotation generator
- receipt generator
- Arabic invoice generator
- ZATCA invoice generator
- business calculators
- country-specific invoice generator queries

## Dismissed categories
- (None yet)

## Notes
- Stack is hybrid: Vite + React app with Express HTML injection and SSR-style fallback content for many public routes.
- Public pages should be visible to Google, social bots, and AI crawlers from the initial HTML response, not only after client-side rendering.
