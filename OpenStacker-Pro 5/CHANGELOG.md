# Changelog

## 2.1.0 — 2026-10-09

- **Catalog performance:** cards are now rendered in batches of 24 (infinite scroll + "Show more" fallback) instead of all ~200 at once; card HTML and search text are cached, so changing filters is instant.
- **Filter fixes:** price/favorite pills now update their active state, filters no longer force a scroll jump, and the scroll-reveal observer no longer drops elements that were not yet visible.
- Favorites and compare toggles update the card in place instead of re-rendering the whole page.
- **Images:** previews are requested at a fixed 16:9 ratio and painted with `object-fit: cover`; logos fill their square exactly.
- Removed per-card `backdrop-filter`, per-card event listeners (now delegated), the permanent page-level `filter`, and trimmed the ambient canvas.
- **New motion:** hero scroll parallax and line-by-line entrance, snap-scrolling featured slides (static, no auto-zoom; arrows, dots, drag), animated route transitions (View Transitions API), spring micro-interactions. All respect `prefers-reduced-motion`.
- **Python removed:** the local dev server is now `node scripts/dev-server.mjs` (`npm run dev`).

## 2.0.0 — 2026-10-09

- Reorganized the app into separate HTML, CSS, JavaScript modules, catalog data, tests and Supabase schema.
- Added bilingual Italian/English interface labels and translated legal-information pages.
- Expanded and validated the curated tools directory to 203 unique records across 24 categories.
- Added searchable filters, separate Free/Freemium/Paid classification, tool detail routes, alternatives and side-by-side comparisons.
- Added live vendor-site previews with visible fallbacks and favicon fallbacks.
- Added premium micro-interactions, animated backgrounds, reveal effects, card tilt, command palette and reduced-motion support.
- Added optional Supabase authentication, community submissions, admin moderation, shared ratings/comments and per-account favorites. These features require owner configuration.
- Added automated catalog/project checks and GitHub Pages deployment gated by those checks.
- Clarified that prices are reference information and must be verified on official pricing pages.
