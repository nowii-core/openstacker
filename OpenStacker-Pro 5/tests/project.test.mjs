import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MESSAGES } from '../src/js/i18n.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('HTML points to existing, separated CSS and JS modules', () => {
  const html = read('index.html');
  const refs = [...html.matchAll(/(?:href|src)="\.\/([^\"]+)"/g)].map(match => match[1]);
  for (const ref of refs) {
    if (ref.startsWith('http')) continue;
    if (ref.startsWith('#')) continue;
    assert.ok(fs.existsSync(path.join(root, ref)), `Missing local asset: ${ref}`);
  }
  assert.match(html, /type="module"\s+src="\.\/src\/js\/main\.js"/);
  assert.doesNotMatch(html, /<script[^>]*>\s*[^<]{200,}/, 'Application logic should live in separate modules');
});

test('all literal translation calls in the app exist in both languages', () => {
  const source = read('src/js/main.js');
  const keys = [...source.matchAll(/\bt\(['"]([A-Za-z][\w]*)['"]\)/g)].map(match => match[1]);
  const missing = [...new Set(keys)].filter(key => !(key in MESSAGES.it) || !(key in MESSAGES.en));
  assert.deepEqual(missing, [], `Missing translation keys: ${missing.join(', ')}`);
});

test('legal pages and optional backend schema are included', () => {
  for (const file of ['privacy.html', 'privacy-en.html', 'terms.html', 'terms-en.html', 'supabase/schema.sql', 'LICENSE', 'README.md']) {
    assert.ok(fs.statSync(path.join(root, file)).isFile(), `Missing project file: ${file}`);
  }
  const html = read('index.html');
  assert.match(html, /id="privacy-link"/);
  assert.match(html, /id="terms-link"/);
});

test('premium motion includes reduced-motion support', () => {
  const css = read('src/css/animations.css') + read('src/css/components.css') + read('src/css/base.css');
  assert.match(css, /prefers-reduced-motion\s*:\s*reduce/);
  assert.match(css, /\.reveal/);
  assert.match(css, /\.animate-gradient/);
  assert.match(css, /\.button:hover/);
  const effects = read('src/js/effects.js');
  assert.match(effects, /IntersectionObserver/);
  assert.match(effects, /prefers-reduced-motion/);
  assert.match(effects, /\.magnetic/);
});

test('every catalog card has a live screenshot request and visible fallback', () => {
  const source = read('src/js/main.js');
  assert.match(source, /function screenshotMarkup\(/);
  assert.match(source, /data-preview-image/);
  assert.match(source, /data-preview-fallback/);
  assert.match(source, /\$\{screenshotMarkup\(tool\)\}/);
});

test('public configuration has no embedded service-role credential', () => {
  const config = read('src/js/config.js');
  assert.match(config, /SUPABASE_URL\s*=\s*''/);
  assert.match(config, /SUPABASE_ANON_KEY\s*=\s*''/);
  assert.doesNotMatch(config, /service[_-]?role\s*[:=]\s*['"][^'"]{12,}/i);
  assert.match(read('README.md'), /Never place the Supabase `service_role` key/i);
});

test('all static i18n hooks in the HTML have an Italian and English label', () => {
  const html = read('index.html');
  const keys = [...html.matchAll(/\bdata-i18n="([A-Za-z][\w]*)"/g)].map(match => match[1]);
  const missing = [...new Set(keys)].filter(key => !(key in MESSAGES.it) || !(key in MESSAGES.en));
  assert.deepEqual(missing, [], `Missing HTML translation keys: ${missing.join(', ')}`);
});

test('local dev server does not depend on Python', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.doesNotMatch(JSON.stringify(pkg.scripts), /python/i);
  assert.ok(fs.statSync(path.join(root, 'scripts/dev-server.mjs')).isFile());
  assert.doesNotMatch(read('README.md'), /python3 -m http\.server/);
});

test('catalog renders in batches and keeps filter UI in sync', () => {
  const source = read('src/js/main.js');
  assert.match(source, /const PAGE_SIZE = \d+/);
  assert.match(source, /function appendCatalogBatch\(/);
  assert.match(source, /function syncFilterUI\(/);
  assert.match(source, /cardCache/);
  assert.match(source, /id="catalog-more"/);
});

test('previews use a fixed frame with object-fit cover', () => {
  const css = read('src/css/components.css');
  assert.match(css, /\.preview-live-img \{[^}]*object-fit: cover/);
  assert.match(css, /\.card-preview \{[^}]*aspect-ratio: 16\/9/);
});

test('slides and route transitions are present and respect reduced motion', () => {
  const css = read('src/css/animations.css');
  assert.match(css, /\.carousel-track/);
  assert.match(css, /view-transition-new\(root\)/);
  assert.match(read('src/js/effects.js'), /export function initCarousels/);
  assert.match(read('src/js/main.js'), /startViewTransition/);
});
