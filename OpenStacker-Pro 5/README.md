# OpenStacker Pro

[![CI](https://github.com/nowii-core/openstacker-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/nowii-core/openstacker-pro/actions/workflows/ci.yml) ![Static site](https://img.shields.io/badge/site-static-9bf5cf) ![License](https://img.shields.io/badge/license-MIT-blue)

A polished, bilingual directory for discovering, filtering, comparing and bookmarking digital tools across development, cybersecurity, AI, design, productivity and more. Built with semantic HTML, modular CSS and native JavaScript ES modules; it has no frontend build step or npm runtime dependencies.

> **Project status:** the static catalog runs without an account or backend. Supabase-powered authentication, community ratings, public comments and moderation are optional and require the project owner to configure a Supabase project. The included price data is a reference, not a price guarantee. Always check the vendor's official page before purchasing.

## Highlights

- **203 catalog entries** across 24 categories, with unique IDs and checked internal alternative references.
- Strict pricing filters: `Free` includes only items marked `free`; `Freemium` is separate; `Paid-only` includes only items marked `paid`.
- English/Italian interface, persistent theme choice, searchable catalog, category selector, sorting, favorites, up-to-four-tool comparison and shareable detail routes.
- **Website previews for each tool** via an external screenshot service, lazy-loaded with a branded fallback when the vendor page cannot be captured.
- Premium motion details: subtle canvas field, reveal-on-scroll, gradient typography, card spotlight, magnetic CTAs, modals and micro-interactions. Motion is reduced when the visitor has enabled `prefers-reduced-motion`.
- Local demo mode never asks users to create a fake local password: local favorites, ratings, comments and submissions stay on that browser only.
- Optional Supabase authentication and shared ratings/comments/submissions, with a SQL schema that enables Row Level Security.
- Accessibility basics: keyboard focus styles, skip link, semantic page landmarks, labels, dialogs, status messages and responsive layout.
- Static HTML metadata, legal-information pages, automated catalog checks and a GitHub Pages deployment workflow.

## Run locally on macOS

You only need [Node.js](https://nodejs.org) 20+ (no packages to install, no Python).

```bash
cd OpenStacker-Pro
npm run dev
```

Open <http://localhost:4173> in Safari or Chrome. Use **Control/Command + C** in the Terminal to stop the local server. Avoid opening `index.html` directly with `file://`: browsers restrict JavaScript modules in that mode.

You can also use the VS Code Live Server extension, serving the project root. Do not serve only the `src` directory.

## Publish on GitHub Pages

1. Create a new repository under your GitHub account (for example `openstacker-pro`) and extract the project archive.
2. From the extracted folder:

   ```bash
   git init
   git add .
   git commit -m "Initial OpenStacker Pro release"
   git branch -M main
   git remote add origin https://github.com/nowii-core/openstacker-pro.git
   git push -u origin main
   ```

   Replace the repository name in the remote URL if you chose another name.
3. In **Repository → Settings → Pages**, select **GitHub Actions** as the build and deployment source.
4. Pushes to `main` run the checks and deploy the static site. The first deployment appears in the **Actions** tab; wait for that workflow to finish before opening the Pages URL.

If you fork/copy this project to another repository, update the README badge URLs and canonical/SEO URLs if you add them later.

## Optional Supabase backend

Without Supabase, the site is fully browsable, but data saved in the browser is private to that browser. To enable real user accounts and shared community features:

1. Create a Supabase project.
2. In **SQL Editor**, run [`supabase/schema.sql`](./supabase/schema.sql).
3. In **Project Settings → API**, copy the project URL and the public **anon/publishable** key into [`src/js/config.js`](./src/js/config.js):

   ```js
   export const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
   export const SUPABASE_ANON_KEY = 'YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY';
   ```

4. In **Authentication → URL Configuration**, add the local URL (for example `http://localhost:4173`) and your GitHub Pages origin to the allowed redirect URLs.
5. Create an account through the site and confirm the email if confirmation is enabled. In Supabase **SQL Editor**, promote that user to admin by copying their UUID from **Authentication → Users** and running:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = 'PASTE-YOUR-USER-UUID-HERE';
   ```

6. Sign in again, then open `#/admin` to moderate submitted tools.

**Never place the Supabase `service_role` key in `config.js`, HTML, JavaScript, a GitHub repository, or any browser-delivered file.** The anon/publishable key is designed for browser use only when the database's Row Level Security policies are enabled and correct. Review those policies before collecting real user data. Supabase is imported only if configuration is present, through a CDN ESM endpoint; that needs an Internet connection.

## Screenshots, logos and external services

- Live page captures use `image.thum.io`; a live capture can fail because a vendor blocks crawlers, the page is slow, or the external service imposes limits. The UI always keeps a branded fallback and official-site link. Some vendors may block embeds or page capture; that is outside this static app's control.
- Favicons are requested from Google's favicon endpoint.
- Google Fonts are optional; system-font fallbacks are included.
- Screenshot and favicon URLs disclose the corresponding vendor domain to those external services. For a privacy-controlled production deployment, save approved screenshots locally (with permission where needed) and self-host suitable logos.

## Catalog and pricing maintenance

- Canonical records and localization maps live in [`src/js/catalog.js`](./src/js/catalog.js).
- Interface translations live in [`src/js/i18n.js`](./src/js/i18n.js).
- Static UI/interaction code lives in [`src/js/main.js`](./src/js/main.js), while motion effects live in [`src/js/effects.js`](./src/js/effects.js).
- Pricing reference data lives in `PRICING_INFO` / `PRICING_EN` in `catalog.js`. Prices may vary by billing cadence, location, tax, seats and promotion; every detail page links to a vendor URL. Review prices and licensing before each production release. The site does not sell subscriptions or process payments.
- `free`, `freemium` and `paid` are catalog classifications, not legal advice. Open-source software can have license obligations even when the download is free.

To add a tool, add a record to `EXTRA_TOOLS` (or the curated records in `catalog.js`) with a unique `id`, safe `https://` `url`, category, one of the three pricing values, license and real alternative IDs. Add its English localization to `EXTRA_TOOL_EN` when possible. Run the checks below.

## Tests and checks

Requires Node.js 20 or newer. No `npm install` is needed.

```bash
npm test
npm run check
```

The checks validate data shape, unique IDs, URL protocols, allowed pricing classifications, category translations and that every listed alternative points to a catalog entry. GitHub Actions runs these on pushes and pull requests.

## Privacy and terms

Read [`privacy.html`](./privacy.html) and [`terms.html`](./terms.html) for this prototype's behavior and limitations. They are project information, not legal advice or a substitute for a review appropriate to your use case and jurisdiction.

## License

MIT. See [`LICENSE`](./LICENSE). Product names, trademarks, logos, product screenshots and external sites belong to their respective owners.
