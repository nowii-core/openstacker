# Contributing to OpenStacker Pro

Thank you for taking the time to improve the catalog.

## Before opening a pull request

1. Keep catalog records in `src/js/catalog.js` and interface copy in `src/js/i18n.js`.
2. Give each tool a unique lowercase-hyphenated ID, an official HTTPS URL whenever possible, a clear price classification (`free`, `freemium` or `paid`), a license note and only valid alternative IDs.
3. Add an English description for every new catalog entry. Do not invent pricing, ratings or user counts. Where a price has not been checked, link to the official pricing page and mark it as unverified.
4. Keep user-provided strings escaped before inserting them into HTML. Do not place private keys or credentials in client-side files.
5. Respect keyboard navigation, mobile layouts and `prefers-reduced-motion`.
6. Run `npm run check` and include a concise summary of the change.

## Scope

Small, focused pull requests are easiest to review. Please do not upload screenshots, product logos or other assets unless their use is permitted. Use the project's issue templates for bugs and feature requests.
