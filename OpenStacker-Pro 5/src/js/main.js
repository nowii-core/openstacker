import {
  TOOLS, TOOL_EN, TOOL_IT, EXTRA_TOOL_EN, CATEGORY_EN, TAG_EN, CATEGORY_LABELS,
  PRICING_INFO, PRICING_EN, OFFICIAL_PRICING_URLS
} from './catalog.js';
import { message } from './i18n.js';
import { connectBackend, isBackendConfigured, normalizeSubmission } from './backend.js';
import { activatePremiumInteractions, activateReveals, initAmbientCanvas, initCarousels, initGlobalMotion, resetReveals } from './effects.js';
import { APP_VERSION, SCREENSHOT_SERVICE } from './config.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const STORAGE_PREFIX = 'openstacker:v2:';
const readStore = (key, fallback) => {
  try { const raw = localStorage.getItem(STORAGE_PREFIX + key); return raw === null ? fallback : JSON.parse(raw); }
  catch { return fallback; }
};
const writeStore = (key, value) => {
  try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value)); return true; }
  catch { return false; }
};
const removeStore = key => { try { localStorage.removeItem(STORAGE_PREFIX + key); } catch {} };
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const safeURL = value => {
  try { const url = new URL(String(value)); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; }
  catch { return ''; }
};
const domainOf = value => { try { return new URL(value).hostname.replace(/^www\./, ''); } catch { return String(value ?? ''); } };
const initials = value => String(value || 'OS').trim().split(/[\s.-]+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'OS';
const nowISO = () => new Date().toISOString();

const UI = {
  lang: ['it', 'en'].includes(readStore('lang', 'it')) ? readStore('lang', 'it') : 'it',
  theme: ['dark', 'light'].includes(readStore('theme', 'dark')) ? readStore('theme', 'dark') : 'dark',
  query: '', category: 'all', priceFilter: 'all', sort: 'featured', favoritesOnly: false,
  favorites: new Set(readStore('favorites', [])), compare: new Set(readStore('compare', [])),
  localVotes: readStore('local-votes', {}), localComments: readStore('local-comments', {}), localSubmissions: readStore('local-submissions', []),
  backend: null, session: null, profile: null, backendError: '', remoteRatings: [], communityTools: [], currentComments: [], adminQueue: [], authMode: 'signin',
  activeToolId: null, commandQuery: '', commandIndex: 0, currentRoute: '#/', currentView: '', stackIds: null
};
const PAGE_SIZE = 24;
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

const CATEGORY_ICONS = {
  grafica:'◈', vettoriale:'✳', '3d':'⬡', video:'▶', audio:'◖', musica:'♫', programmazione:'⌘', ai:'✧', office:'▤',
  produttivita:'◷', webdesign:'⌘', cms:'▦', hosting:'⌁', backend:'⌘', browser:'◎', sicurezza:'⌑', media:'▷', cloud:'☁',
  gamedev:'◇', comunicazione:'↗', streaming:'♫', devops:'⛭', database:'▥', testing:'⌁'
};
const FEATURED_IDS = ['blender','vscode','github','chatgpt','figma','obs-studio','docker','wireshark','react','supabase'];
const DEVELOPER_IDS = ['vscode','github','gitlab','docker','postman','react','nextjs','supabase','playwright','wireshark'];
const DOCUMENTATION_ROUTES = {
  'vscode':'https://code.visualstudio.com/docs', 'github':'https://docs.github.com', 'gitlab':'https://docs.gitlab.com', 'docker':'https://docs.docker.com',
  'blender':'https://docs.blender.org', 'react':'https://react.dev/learn', 'vue':'https://vuejs.org/guide', 'svelte':'https://svelte.dev/docs',
  'angular':'https://angular.dev/overview', 'nextjs':'https://nextjs.org/docs', 'astro':'https://docs.astro.build', 'tailwind-css':'https://tailwindcss.com/docs',
  'vite':'https://vite.dev/guide', 'nodejs':'https://nodejs.org/en/learn', 'bun':'https://bun.sh/docs', 'sqlite':'https://sqlite.org/docs.html',
  'mongodb':'https://www.mongodb.com/docs', 'redis':'https://redis.io/docs/latest/', 'playwright':'https://playwright.dev/docs/intro', 'vitest':'https://vitest.dev/guide',
  'jest':'https://jestjs.io/docs/getting-started', 'cypress':'https://docs.cypress.io', 'wireshark':'https://www.wireshark.org/docs/', 'nmap':'https://nmap.org/book/man.html',
  'owasp-juice-shop':'https://pwning.owasp-juice.shop', 'tryhackme':'https://tryhackme.com/resources/blog', 'hack-the-box':'https://academy.hackthebox.com',
  'github-actions':'https://docs.github.com/actions', 'jenkins':'https://www.jenkins.io/doc', 'neon':'https://neon.tech/docs', 'valkey':'https://valkey.io/topics/'
};

const t = key => message(UI.lang, key);
const allTools = () => [...TOOLS, ...UI.communityTools];
const getTool = id => allTools().find(tool => tool.id === id);
const categoryLabel = category => CATEGORY_LABELS[UI.lang]?.[category] || (UI.lang === 'en' ? CATEGORY_EN[category] : null) || category;

function localizedDesc(tool, long = false) {
  const key = long ? 'long' : 'desc';
  if (UI.lang === 'it') {
    return TOOL_IT[tool.id]?.[key] || tool[long ? 'longDesc' : 'desc'] || `${tool.name}: uno strumento per ${categoryLabel(tool.category).toLowerCase()}. Consulta il sito ufficiale per le funzionalità complete.`;
  }
  const extra = EXTRA_TOOL_EN[tool.id];
  if (extra) return extra[long ? 1 : 0];
  const translated = TOOL_EN[tool.id]?.[key];
  if (translated) return translated;
  const description = long
    ? `${tool.name} is a tool in ${categoryLabel(tool.category).toLowerCase()}. The official website and documentation provide current features, supported platforms, license terms and usage limits.`
    : `${tool.name} is a ${categoryLabel(tool.category).toLowerCase()} tool. Visit the official website for current features and requirements.`;
  return description;
}
function localizedTag(tag) {
  if (UI.lang === 'it') return tag.replaceAll('-', ' ');
  const fallback = tag.replaceAll('-', ' ');
  return TAG_EN[tag] || ({ grafica:'graphics', 'sicurezza':'security', 'illustrazione':'illustration', 'musica':'music', 'produttivita':'productivity', 'montaggio':'editing', 'loghi':'logos', 'immagini':'images', 'foto':'photography', 'programmazione':'programming', 'registrazione':'recording', 'terminale':'terminal', 'trascrizione':'transcription', 'semplice':'easy to use', 'locale':'local', 'nodi':'nodes', 'notazione':'notation', 'principianti':'beginner friendly', 'comunicazione':'communication', 'universale':'cross-platform', 'avanzato':'advanced', 'collaborazione':'collaboration', 'gestione':'management', 'conversione':'conversion', 'privacy':'privacy' })[tag] || fallback;
}
function priceLabel(price) { return t(price === 'free' ? 'freeLabel' : price === 'freemium' ? 'freemiumLabel' : 'paidLabel'); }
function priceClass(price) { return ['free', 'freemium', 'paid'].includes(price) ? price : 'freemium'; }
function pricingData(tool) {
  const base = PRICING_INFO[tool.id];
  const english = PRICING_EN[tool.id];
  if (UI.lang === 'en') {
    if (english) return { officialUrl: base?.officialUrl || OFFICIAL_PRICING_URLS[tool.id] || tool.url, verified: base?.verified === true, headline: english.headline, note: english.note, plans: (english.plans || []).map(plan => ({ name: plan[0], price: plan[1], detail: plan[2] })) };
    return {
      officialUrl: OFFICIAL_PRICING_URLS[tool.id] || base?.officialUrl || tool.pricingUrl || tool.url,
      verified: false,
      headline: tool.price === 'freemium' ? 'Free tier + premium features' : 'Paid license or subscription',
      note: 'A stable current amount has not been confirmed for this entry. Costs can vary by country, billing term, seats, taxes, features and promotions. Check the vendor pricing page before purchasing.', plans: []
    };
  }
  if (base) return { ...base, officialUrl: OFFICIAL_PRICING_URLS[tool.id] || base.officialUrl || tool.url };
  return {
    officialUrl: OFFICIAL_PRICING_URLS[tool.id] || tool.pricingUrl || tool.url,
    verified: false,
    headline: tool.price === 'freemium' ? 'Piano gratuito + funzioni premium' : 'Licenza o abbonamento',
    note: 'Non è stato verificato un prezzo unico e stabile per questa voce. Il costo può variare per Paese, valuta, durata, numero di utenti, imposte e promozioni. Consulta il listino ufficiale prima di acquistare.', plans: []
  };
}
function ratingSummary(toolId) {
  if (UI.backend) {
    const rows = UI.remoteRatings.filter(item => item.tool_id === toolId);
    const values = rows.map(row => Number(row.rating)).filter(value => Number.isFinite(value) && value >= 1 && value <= 5);
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    const myVote = UI.session ? (rows.find(row => row.user_id === UI.session.user.id)?.rating || 0) : 0;
    return { average, count: values.length, myVote, shared: true };
  }
  return { average: 0, count: 0, myVote: Number(UI.localVotes[toolId] || 0), shared: false };
}
function starsText(rating) { return rating ? `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}` : '☆☆☆☆☆'; }
function toolFavicon(tool) {
  const url = safeURL(tool.url);
  if (!url) return '';
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(url).hostname)}&sz=128`;
}
function logoMarkup(tool, large = false) {
  const logo = toolFavicon(tool);
  return `<span class="tool-logo${large ? ' logo-large' : ''}" aria-hidden="true"><span class="logo-fallback">${escapeHTML(initials(tool.name))}</span>${logo ? `<img src="${escapeHTML(logo)}" alt="" loading="lazy" data-logo-image>` : ''}</span>`;
}
function screenshotURL(url, width = 800, height = 450) {
  const checked = safeURL(url);
  if (!checked) return '';
  return `${SCREENSHOT_SERVICE}/width/${width}/crop/${height}/noanimate/${checked}`;
}
// Every preview is requested at a fixed aspect ratio and painted with object-fit: cover,
// so every screenshot fills its frame exactly, whatever size the remote site returns.
function screenshotMarkup(tool, detail = false, pageUrl = tool.url) {
  const checked = safeURL(pageUrl) || safeURL(tool.url);
  const width = detail ? 1200 : 800;
  const height = detail ? 750 : 450;
  const shot = screenshotURL(checked, width, height);
  return `<div class="${detail ? 'detail-preview' : 'card-preview'}" data-preview-domain="${escapeHTML(domainOf(checked))}">
    <div class="preview-chrome" aria-hidden="true"><i></i><i></i><i></i><span class="preview-address">${escapeHTML(domainOf(checked))}</span></div>
    <div class="preview-viewport">
      <div class="preview-fallback" data-preview-fallback><span class="preview-fallback-logo">${escapeHTML(initials(tool.name))}</span><span class="preview-fallback-name">${escapeHTML(tool.name)}</span><span class="preview-fallback-domain">${escapeHTML(domainOf(checked))}</span></div>
      ${shot ? `<img class="preview-live-img" data-preview-image src="${escapeHTML(shot)}" width="${width}" height="${height}" alt="${escapeHTML(t('sitePreview') + ': ' + tool.name)}" loading="lazy" decoding="async" fetchpriority="low" referrerpolicy="no-referrer">` : ''}
    </div>
    <span class="preview-overlay-label"><i></i>${escapeHTML(t('preview'))}</span>
  </div>`;
}
function setupImages(root = document) {
  $$('[data-logo-image]', root).forEach(img => {
    if (img.dataset.bound) return;
    img.dataset.bound = '1';
    img.addEventListener('error', () => { img.remove(); }, { once: true });
  });
  $$('[data-preview-image]', root).forEach(img => {
    if (img.dataset.bound) return;
    img.dataset.bound = '1';
    const fallback = img.parentElement?.querySelector('[data-preview-fallback]');
    img.addEventListener('load', () => { img.classList.add('is-loaded'); if (fallback) fallback.classList.add('is-hidden'); }, { once: true });
    img.addEventListener('error', () => { img.classList.remove('is-loaded'); if (fallback) fallback.classList.remove('is-hidden'); img.remove(); }, { once: true });
    if (img.complete && img.naturalWidth > 0) { img.classList.add('is-loaded'); fallback?.classList.add('is-hidden'); }
  });
}
function showToast(text, kind = 'success') {
  const stack = $('#toast-stack');
  if (!stack) return;
  const item = document.createElement('div');
  item.className = `toast-message${kind === 'error' ? ' error' : ''}`;
  item.setAttribute('role', 'status');
  item.innerHTML = `<i aria-hidden="true">${kind === 'error' ? '!' : '✓'}</i><span>${escapeHTML(text)}</span>`;
  stack.append(item);
  window.setTimeout(() => { item.style.opacity = '0'; item.style.transform = 'translateX(12px)'; item.style.transition = 'opacity .22s ease, transform .22s ease'; window.setTimeout(() => item.remove(), 260); }, 3400);
}
function activatePageEffects(root = $('#app-view')) {
  activateReveals(root || document);
  activatePremiumInteractions();
  setupImages(root || document);
  animateCounters(root || document);
  initCarousels(root || document);
}
function animateCounters(root) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $$('[data-count]', root).forEach(element => {
    if (element.dataset.counted) return;
    element.dataset.counted = '1';
    const goal = Number(element.dataset.count) || 0;
    if (reduced || goal > 10000) { element.textContent = String(goal); return; }
    const start = performance.now();
    const duration = 760;
    const tick = now => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      element.textContent = String(Math.round(goal * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
function persistSet(name, set) { writeStore(name, [...set]); }
function setTheme(theme) {
  UI.theme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = UI.theme;
  writeStore('theme', UI.theme);
  const button = $('#theme-toggle');
  if (button) { button.setAttribute('aria-label', t(UI.theme === 'dark' ? 'themeLight' : 'themeDark')); button.title = t(UI.theme === 'dark' ? 'themeLight' : 'themeDark'); }
  const icon = $('#theme-icon');
  if (icon) icon.textContent = UI.theme === 'dark' ? '☼' : '☾';
}
function setLanguage(language) {
  UI.lang = language === 'en' ? 'en' : 'it';
  writeStore('lang', UI.lang);
  document.documentElement.lang = UI.lang;
  $('#language-toggle').textContent = UI.lang.toUpperCase();
  document.title = UI.lang === 'it' ? 'OpenStacker Pro — Catalogo di strumenti digitali' : 'OpenStacker Pro — Digital Tools Directory';
  const description = $('meta[name="description"]');
  if (description) description.content = t('seoDescription');
  $$('[data-i18n]').forEach(element => { const key = element.dataset.i18n; element.textContent = t(key); });
  renderRoute({ keepScroll: true });
  updateStaticUI();
}
function updateStaticUI() {
  $$('[data-i18n]').forEach(element => { const key = element.dataset.i18n; element.textContent = t(key); });
  const navKeys = { explore:'navExplore', categories:'navCategories', pricing:'navPricing', about:'navAbout' };
  $$('[data-nav]').forEach(element => { element.textContent = t(navKeys[element.dataset.nav] || 'navExplore'); });
  const primaryNav = $('#primary-nav'); if (primaryNav) primaryNav.setAttribute('aria-label', t('navAria'));
  const searchButton = $('#open-command'); if (searchButton) { searchButton.setAttribute('aria-label', t('hotkeyHint')); searchButton.title = `${t('hotkeyHint')} (⌘K)`; }
  const languageButton = $('#language-toggle'); if (languageButton) { languageButton.setAttribute('aria-label', t('language')); languageButton.title = t('language'); }
  const footerSubmit = $('#footer-submit'); if (footerSubmit) footerSubmit.textContent = t('footerSubmit');
  const documentationLink = $('#documentation-link'); if (documentationLink) documentationLink.textContent = t('docsLabel');
  const privacyLink = $('#privacy-link'); if (privacyLink) { privacyLink.href = UI.lang === 'en' ? './privacy-en.html' : './privacy.html'; privacyLink.textContent = t('privacy'); }
  const termsLink = $('#terms-link'); if (termsLink) { termsLink.href = UI.lang === 'en' ? './terms-en.html' : './terms.html'; termsLink.textContent = t('terms'); }
  for (const nav of [$('.primary-nav'), $('#mobile-nav')]) {
    if (!nav) continue;
    const existing = nav.querySelector('[data-admin-nav]');
    if (UI.profile?.role === 'admin' && !existing) { const link = document.createElement('a'); link.href = '#/admin'; link.dataset.adminNav = 'true'; link.textContent = t('admin'); nav.append(link); }
    else if (UI.profile?.role !== 'admin') existing?.remove();
  }
  $('#language-toggle').textContent = UI.lang.toUpperCase();
  const accountLabel = $('#account-label');
  if (accountLabel) accountLabel.textContent = UI.profile?.username || UI.session?.user?.email?.split('@')[0] || t('signIn');
  const status = $('#backend-status-text');
  if (status) status.textContent = UI.backend && UI.session ? t('backendReady') : t('backendOffline');
  $('#current-year').textContent = String(new Date().getFullYear());
  const mobileButton = $('#mobile-menu-toggle');
  if (mobileButton) mobileButton.setAttribute('aria-label', t('menuToggle'));
}
function getFeaturedTools(ids, limit = 6) {
  return ids.map(id => getTool(id)).filter(Boolean).slice(0, limit);
}
function categoryCounts() {
  const counts = new Map();
  for (const tool of allTools()) counts.set(tool.category, (counts.get(tool.category) || 0) + 1);
  return counts;
}
function priceCounts() {
  const counts = { all: allTools().length, free: 0, freemium: 0, paid: 0 };
  for (const tool of allTools()) if (Object.hasOwn(counts, tool.price)) counts[tool.price]++;
  return counts;
}
const searchCache = new Map();
function searchText(tool) {
  const key = `${UI.lang}|${tool.id}`;
  let text = searchCache.get(key);
  if (text === undefined) { text = buildSearchText(tool); searchCache.set(key, text); }
  return text;
}
function buildSearchText(tool) {
  return [tool.name, tool.id, tool.category, categoryLabel(tool.category), localizedDesc(tool), localizedDesc(tool, true), tool.license, ...(tool.tags || []).map(localizedTag), domainOf(tool.url)].join(' ').toLocaleLowerCase(UI.lang);
}
function getFilteredTools() {
  let list = allTools();
  if (UI.stackIds) { const wanted = new Set(UI.stackIds); list = list.filter(tool => wanted.has(tool.id)); }
  const query = UI.query.trim().toLocaleLowerCase(UI.lang);
  if (query) {
    const terms = query.split(/\s+/).filter(Boolean);
    list = list.filter(tool => { const haystack = searchText(tool); return terms.every(term => haystack.includes(term)); });
  }
  if (UI.category !== 'all') list = list.filter(tool => tool.category === UI.category);
  if (UI.priceFilter !== 'all') list = list.filter(tool => tool.price === UI.priceFilter);
  if (UI.favoritesOnly) list = list.filter(tool => UI.favorites.has(tool.id));
  if (UI.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, UI.lang));
  else if (UI.sort === 'rating') list.sort((a, b) => ratingSummary(b.id).average - ratingSummary(a.id).average || a.name.localeCompare(b.name));
  else if (UI.sort === 'newest') list.sort((a, b) => Number(Boolean(b.communitySubmitted)) - Number(Boolean(a.communitySubmitted)) || a.name.localeCompare(b.name));
  else list.sort((a, b) => Number(FEATURED_IDS.includes(b.id)) - Number(FEATURED_IDS.includes(a.id)) || a.name.localeCompare(b.name));
  return list;
}
const cardCache = new Map();
const dropCard = id => { cardCache.delete(`it|${id}`); cardCache.delete(`en|${id}`); };
// Card HTML is built once per tool/language and reused on every filter change.
function cardMarkup(tool, index = 0) {
  const key = `${UI.lang}|${tool.id}`;
  let html = cardCache.get(key);
  if (html === undefined) { html = buildCardMarkup(tool); cardCache.set(key, html); }
  return html.replace('__I__', String(index % 12));
}
function buildCardMarkup(tool) {
  const rating = ratingSummary(tool.id);
  const ratingHTML = rating.count
    ? `<span class="tool-rating"><span class="star">★</span><span class="rating-val">${rating.average.toFixed(1)}</span><span>· ${rating.count}</span></span>`
    : rating.myVote
      ? `<span class="tool-rating" title="${escapeHTML(t('localVote'))}"><span class="star">★</span><span class="rating-val">${rating.myVote}/5</span></span>`
      : `<span class="tool-rating" title="${escapeHTML(t('notRated'))}"><span class="star">☆</span><span>—</span></span>`;
  const tags = (tool.tags || []).slice(0, 2).map(tag => `<span class="tag-chip">${escapeHTML(localizedTag(tag))}</span>`).join('');
  const isFav = UI.favorites.has(tool.id);
  const inCompare = UI.compare.has(tool.id);
  return `<article class="tool-card card-in" tabindex="0" role="link" aria-label="${escapeHTML(`${t('detailsCta')}: ${tool.name}`)}" data-tool-card="${escapeHTML(tool.id)}" style="--i:__I__">
    <div class="tool-card-top">
      ${logoMarkup(tool)}
      <div class="tool-meta"><div class="tool-meta-line"><a class="tool-name" href="#/tool/${encodeURIComponent(tool.id)}" data-open-tool="${escapeHTML(tool.id)}">${escapeHTML(tool.name)}</a><span class="price-badge ${priceClass(tool.price)}">${escapeHTML(priceLabel(tool.price))}</span></div><span class="tool-vendor">${escapeHTML(domainOf(tool.url))}</span></div>
      <div class="card-actions"><button class="card-action${isFav?' is-active':''}" type="button" data-action="favorite" data-id="${escapeHTML(tool.id)}" aria-label="${escapeHTML(t(isFav?'removeFavorite':'addFavorite'))}" aria-pressed="${isFav}">${isFav?'★':'☆'}</button><button class="card-action${inCompare?' is-active':''}" type="button" data-action="compare" data-id="${escapeHTML(tool.id)}" aria-label="${escapeHTML(t('compare'))}" aria-pressed="${inCompare}">${inCompare?'✓':'＋'}</button></div>
    </div>
    ${screenshotMarkup(tool)}
    <div class="tool-card-body"><p class="tool-description">${escapeHTML(localizedDesc(tool))}</p><div class="tool-card-bottom"><div class="tool-tags">${tags || `<span class="tag-chip">${escapeHTML(categoryLabel(tool.category))}</span>`}</div>${ratingHTML}</div><div class="card-open-hint"><span>${escapeHTML(categoryLabel(tool.category))}</span><span aria-hidden="true">↗</span></div></div>
  </article>`;
}
function categoryCardMarkup(category, count, index = 0) {
  const icon = CATEGORY_ICONS[category] || '◇';
  return `<button type="button" class="category-card reveal" data-action="select-category" data-category="${escapeHTML(category)}" style="--reveal-delay:${(index%6)*40}ms"><span class="category-icon" aria-hidden="true">${icon}</span><span class="category-card-bottom"><span class="category-card-name">${escapeHTML(categoryLabel(category))}</span><span class="category-card-count">${count.toString().padStart(2,'0')}</span></span></button>`;
}
function filterMarkup() {
  const counts = priceCounts();
  const categories = [...categoryCounts().keys()].sort((a,b) => categoryLabel(a).localeCompare(categoryLabel(b), UI.lang));
  const filter = (value, label, count) => `<button type="button" class="filter-pill${UI.priceFilter===value?' is-active':''}" data-action="price-filter" data-price="${value}" aria-pressed="${UI.priceFilter===value}">${escapeHTML(label)} <span class="pill-count">${count}</span></button>`;
  return `<div class="filter-search-row"><label class="search-box"><span class="search-symbol" aria-hidden="true">⌕</span><input class="input-control" id="catalog-search" type="search" autocomplete="off" placeholder="${escapeHTML(t('searchPlaceholder'))}" value="${escapeHTML(UI.query)}" aria-label="${escapeHTML(t('searchPlaceholder'))}"><kbd class="search-shortcut">⌘ K</kbd></label><div class="filter-extra"><label class="sr-only" for="category-select">${escapeHTML(t('category'))}</label><select class="select-control" id="category-select"><option value="all">${escapeHTML(t('anyCategory'))}</option>${categories.map(cat=>`<option value="${escapeHTML(cat)}"${UI.category===cat?' selected':''}>${escapeHTML(categoryLabel(cat))}</option>`).join('')}</select><label class="sr-only" for="sort-select">${escapeHTML(t('sortLabel'))}</label><select class="select-control" id="sort-select"><option value="featured"${UI.sort==='featured'?' selected':''}>${escapeHTML(t('sortFeatured'))}</option><option value="name"${UI.sort==='name'?' selected':''}>${escapeHTML(t('sortName'))}</option><option value="rating"${UI.sort==='rating'?' selected':''}>${escapeHTML(t('sortRating'))}</option><option value="newest"${UI.sort==='newest'?' selected':''}>${escapeHTML(t('sortNewest'))}</option></select></div></div>
    <div class="filter-toolbar"><div class="filter-pills">${filter('all',t('all'),counts.all)}${filter('free',t('free'),counts.free)}${filter('freemium',t('freemium'),counts.freemium)}${filter('paid',t('paid'),counts.paid)}<button type="button" class="filter-pill${UI.favoritesOnly?' is-active':''}" data-action="favorites-only" aria-pressed="${UI.favoritesOnly}">☆ ${escapeHTML(t('favorites'))}</button></div><button class="text-button" type="button" data-action="clear-filters">${escapeHTML(t('clearFilters'))}</button></div>`;
}
const catalogView = { list: [], shown: 0, observer: null };
function updateLoadMore() {
  const more = $('#catalog-more');
  if (!more) return;
  const left = catalogView.list.length - catalogView.shown;
  more.hidden = left <= 0;
  const button = more.querySelector('button');
  if (button) button.textContent = `${t('loadMore')} (${left})`;
}
function appendCatalogBatch() {
  const grid = $('#tool-grid');
  if (!grid) return;
  const batch = catalogView.list.slice(catalogView.shown, catalogView.shown + PAGE_SIZE);
  if (!batch.length) return;
  grid.insertAdjacentHTML('beforeend', batch.map((tool, index) => cardMarkup(tool, index)).join(''));
  catalogView.shown += batch.length;
  setupImages(grid);
  updateLoadMore();
}
function watchCatalogSentinel() {
  const more = $('#catalog-more');
  if (!more || !('IntersectionObserver' in window)) return;
  if (!catalogView.observer) {
    catalogView.observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      appendCatalogBatch();
      // Re-arm: if the sentinel is still inside the margin (tall screens) we must load again.
      const current = $('#catalog-more');
      if (current && !current.hidden) { catalogView.observer.unobserve(current); requestAnimationFrame(() => catalogView.observer.observe(current)); }
    }, { rootMargin: '700px 0px' });
  }
  catalogView.observer.disconnect();
  catalogView.observer.observe(more);
}
// Keeps pills, selects and the search box in sync with UI state without re-rendering the toolbar.
function syncFilterUI() {
  $$('[data-action="price-filter"]').forEach(button => {
    const active = button.dataset.price === UI.priceFilter;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const fav = $('[data-action="favorites-only"]');
  if (fav) { fav.classList.toggle('is-active', UI.favoritesOnly); fav.setAttribute('aria-pressed', String(UI.favoritesOnly)); }
  const category = $('#category-select'); if (category && category.value !== UI.category) category.value = UI.category;
  const sort = $('#sort-select'); if (sort && sort.value !== UI.sort) sort.value = UI.sort;
  const search = $('#catalog-search'); if (search && search.value !== UI.query) search.value = UI.query;
}
function renderCatalogResults() {
  const grid = $('#tool-grid');
  const count = $('#catalog-result-count');
  if (!grid) return;
  const tools = getFilteredTools();
  catalogView.list = tools;
  catalogView.shown = 0;
  if (count) count.innerHTML = `<strong>${tools.length}</strong> ${escapeHTML(t('results'))}`;
  if (!tools.length) {
    grid.innerHTML = `<div class="grid-empty"><span class="grid-empty-icon">⌕</span><h3>${escapeHTML(t(UI.favoritesOnly?'emptyFavorites':'noResults'))}</h3><p>${escapeHTML(t(UI.favoritesOnly?'emptyFavoritesDesc':'noResultsDesc'))}</p><button type="button" class="button button-outline" data-action="clear-filters">${escapeHTML(t('clearFilters'))}</button></div>`;
  } else {
    grid.innerHTML = '';
    appendCatalogBatch();
  }
  updateLoadMore();
  syncFilterUI();
  watchCatalogSentinel();
  updateCompareDock();
}
// Scrolls to the catalog only when it is actually out of view (filters should feel instant, not scroll-jumpy).
function ensureCatalogVisible() {
  const wrap = $('.catalog-wrap');
  if (!wrap) return;
  const rect = wrap.getBoundingClientRect();
  if (rect.top > window.innerHeight * 0.55 || rect.bottom < 160) $('#catalog')?.scrollIntoView({ behavior: reducedMotionQuery.matches ? 'auto' : 'smooth', block: 'start' });
}
function applyFilters(patch = {}, { scroll = true } = {}) {
  const { stackIds = null, ...rest } = patch;
  Object.assign(UI, rest);
  UI.stackIds = stackIds;
  if (!$('#tool-grid')) { history.replaceState(null, '', '#catalog'); renderHome(); }
  else renderCatalogResults();
  if (scroll) ensureCatalogVisible();
}
function renderHome() {
  const counts = categoryCounts();
  const total = allTools().length;
  const free = allTools().filter(tool => tool.price === 'free').length;
  const categoryKeys = ['programmazione','sicurezza','ai','grafica','3d','video','devops','database'];
  const categoriesHTML = categoryKeys.filter(cat => counts.has(cat)).map((cat,index)=>categoryCardMarkup(cat,counts.get(cat),index)).join('');
  const featuredHTML = getFeaturedTools(FEATURED_IDS, 10).map((tool, index) => `<div class="carousel-slide">${cardMarkup(tool, index)}</div>`).join('');
  $('#app-view').innerHTML = `<div class="page-enter">
    <section class="hero container"><div class="hero-orbit" aria-hidden="true"></div><div class="hero-content">
      <span class="eyebrow reveal"><i class="eyebrow-dot"></i>${escapeHTML(t('eyebrow'))}</span>
      <h1><span class="hero-line">${escapeHTML(t('heroTitleA'))}</span><span class="hero-line accent-line animate-gradient">${escapeHTML(t('heroTitleB'))}</span></h1>
      <p class="hero-copy reveal" style="--reveal-delay:130ms">${escapeHTML(t('heroDesc'))}</p>
      <div class="hero-actions reveal" style="--reveal-delay:180ms"><a class="button button-primary magnetic" href="#catalog"><span>${escapeHTML(t('exploreTools'))}</span><span aria-hidden="true">↘</span></a><a class="button button-outline magnetic" href="#pricing"><span>${escapeHTML(t('viewPricing'))}</span><span aria-hidden="true">↗</span></a></div>
      <div class="hero-mini-proof reveal" style="--reveal-delay:240ms"><span class="proof-item"><span class="proof-check">✓</span>${escapeHTML(t('statOpen'))}</span><span class="proof-item"><span class="proof-check">✓</span>${escapeHTML(t('free'))} / ${escapeHTML(t('freemium'))} / ${escapeHTML(t('paid'))}</span><span class="proof-item"><span class="proof-check">✓</span>IT / EN</span></div>
    </div></section>
        <section class="container stats-strip reveal" aria-label="${escapeHTML(t('statsSummary'))}"><div class="stat"><strong class="stat-value" data-count="${total}">0</strong><span class="stat-label">${escapeHTML(t('statTools'))}</span></div><div class="stat"><strong class="stat-value" data-count="${counts.size}">0</strong><span class="stat-label">${escapeHTML(t('statCategories'))}</span></div><div class="stat"><strong class="stat-value" data-count="${free}">0</strong><span class="stat-label">${escapeHTML(t('statFree'))}</span></div><div class="stat"><strong class="stat-value"><span>↗</span> 100%</strong><span class="stat-label">${escapeHTML(t('statOpen'))}</span></div></section>
    <section class="section-block container" id="categories"><div class="section-heading reveal"><div><p class="section-kicker">01 / ${escapeHTML(t('sectionDiscover'))}</p><h2>${escapeHTML(t('categoriesTitle'))}</h2><p>${escapeHTML(t('featuredDesc'))}</p></div><button type="button" class="button button-quiet" data-action="reset-category">${escapeHTML(t('allCategories'))} <span aria-hidden="true">↗</span></button></div><div class="category-grid">${categoriesHTML}</div></section>
    <section class="section-block container" id="featured"><div class="section-heading reveal"><div><p class="section-kicker">02 / ${escapeHTML(t('sectionCurated'))}</p><h2>${escapeHTML(t('featured'))}</h2><p>${escapeHTML(t('featuredDesc'))}</p></div><button type="button" class="button button-quiet" data-action="show-catalog">${escapeHTML(t('toolsCatalog'))} <span aria-hidden="true">↘</span></button></div><div class="carousel reveal" data-carousel><div class="carousel-track" data-carousel-track>${featuredHTML}</div><div class="carousel-controls"><div class="carousel-progress" aria-hidden="true"><span data-carousel-progress></span></div><div class="carousel-dots" data-carousel-dots aria-hidden="true"></div><div class="carousel-arrows"><button type="button" class="icon-button" data-carousel-prev aria-label="${escapeHTML(t('prevSlide'))}">←</button><button type="button" class="icon-button" data-carousel-next aria-label="${escapeHTML(t('nextSlide'))}">→</button></div></div></div></section>
    <section class="section-block container" id="catalog"><div class="section-heading reveal"><div><p class="section-kicker">03 / ${escapeHTML(t('sectionDirectory'))}</p><h2>${escapeHTML(t('toolsCatalog'))}</h2><p>${escapeHTML(t('toolsCaption'))}</p></div><span class="local-badge">${escapeHTML(UI.backend ? t('backendReady') : t('noBackendBadge'))}</span></div><div class="catalog-wrap reveal"><div class="catalog-topline"><div class="catalog-title-wrap"><h2>${escapeHTML(t('toolsCatalog'))}</h2><p>${escapeHTML(t('catalogue') || t('toolsCaption'))}</p></div><span class="local-badge">${escapeHTML(`${total} ${t('categoryCount')}`)}</span></div>${filterMarkup()}<div class="filter-bottomline"><span class="result-count" id="catalog-result-count"></span><span class="helper-text">${escapeHTML(t('screenshotNote'))}</span></div><div class="tool-grid" id="tool-grid"></div><div class="catalog-more" id="catalog-more" hidden><button type="button" class="button button-outline" data-action="load-more"></button></div></div></section>
    <section class="section-block container" id="pricing"><div class="promo-grid"><article class="promo-panel reveal"><span class="promo-label">04 / ${escapeHTML(t('sectionPricing'))}</span><h3>${escapeHTML(t('premiumTitle'))}</h3><p>${escapeHTML(t('premiumDesc'))}</p><button type="button" class="button button-primary" data-action="price-filter-paid">${escapeHTML(t('paid'))} <span aria-hidden="true">↗</span></button></article><article class="promo-panel secondary reveal"><span class="promo-label">${escapeHTML(t('sectionBuilders'))}</span><h3>${escapeHTML(t('popularDev'))}</h3><p>${escapeHTML(t('featuredDesc'))}</p><button type="button" class="button button-outline" data-action="developer-stack">${escapeHTML(t('exploreTools'))} <span aria-hidden="true">↗</span></button></article></div></section>
    <section class="section-block container" id="about"><div class="section-heading reveal"><div><p class="section-kicker">05 / ${escapeHTML(t('sectionAbout'))}</p><h2>${escapeHTML(t('tagline'))}</h2><p>${escapeHTML(t('footerText'))} ${escapeHTML(t('footerPrivacy'))}</p></div><button type="button" class="button button-outline" data-action="submit-tool">＋ ${escapeHTML(t('submitTool'))}</button></div></section>
  </div>`;
  $('#site-footer').hidden = false;
  renderCatalogResults();
  activatePageEffects($('#app-view'));
}

function renderDetail(toolId) {
  const tool = getTool(toolId);
  if (!tool) { renderNotFound(); return; }
  UI.activeToolId = tool.id;
  const price = pricingData(tool);
  const isFav = UI.favorites.has(tool.id);
  const inCompare = UI.compare.has(tool.id);
  const descLong = localizedDesc(tool, true);
  const related = (tool.alternatives || []).map(getTool).filter(Boolean).slice(0, 6);
  const rating = ratingSummary(tool.id);
  const docsURL = DOCUMENTATION_ROUTES[tool.id];
  const officialURL = safeURL(tool.url) || '#';
  const priceURL = safeURL(price.officialUrl) || officialURL;
  const pricingSection = tool.price === 'free' ? `<div class="price-panel"><h2>${escapeHTML(t('pricingPlans'))}</h2><p class="price-panel-intro">${escapeHTML(t('freeOnlyDesc'))}</p><span class="price-badge free">${escapeHTML(t('freeLabel'))}</span><a class="button button-outline" href="${escapeHTML(officialURL)}" target="_blank" rel="noopener noreferrer">${escapeHTML(t('openOfficial'))} ↗</a></div>` : `<div class="price-panel"><h2>${escapeHTML(t('pricingPlans'))}</h2><p class="price-panel-intro">${escapeHTML(price.headline || priceLabel(tool.price))}</p>${price.plans?.length ? `<div class="price-plan-list">${price.plans.map(plan=>`<div class="price-plan"><div><div class="price-plan-name">${escapeHTML(plan.name)}</div><div class="price-plan-detail">${escapeHTML(plan.detail || '')}</div></div><div class="price-plan-value">${escapeHTML(plan.price || '—')}</div></div>`).join('')}</div>` : `<div class="modal-alert"><strong>${escapeHTML(t('pricingUnknown'))}</strong>${escapeHTML(t('pricingUnknownNote'))}</div>`}<p class="price-disclaimer">${escapeHTML(price.note || t('priceDisclaimer'))}</p><p class="price-disclaimer">${escapeHTML(price.verified ? t('priceVerified') : t('priceUnverified'))}</p><a class="button button-primary" href="${escapeHTML(priceURL)}" target="_blank" rel="noopener noreferrer">${escapeHTML(t('visitPricing'))} ↗</a></div>`;
  $('#app-view').innerHTML = `<div class="detail-page page-enter container"><nav class="breadcrumb" aria-label="${escapeHTML(t('breadcrumb'))}"><a href="#/">OpenStacker</a><span class="slash">/</span><a href="#catalog">${escapeHTML(t('toolsCatalog'))}</a><span class="slash">/</span><span>${escapeHTML(tool.name)}</span></nav>
    <section class="detail-hero"><div class="detail-info"><div class="detail-identity">${logoMarkup(tool,true)}<div><div class="tool-meta-line"><span class="price-badge ${priceClass(tool.price)}">${escapeHTML(priceLabel(tool.price))}</span>${tool.communitySubmitted?`<span class="price-badge">${escapeHTML(t('communityBadge'))}</span>`:''}</div><span class="tool-vendor">${escapeHTML(domainOf(officialURL))}</span></div></div><div class="detail-title-block"><h1>${escapeHTML(tool.name)}</h1><p class="detail-description">${escapeHTML(localizedDesc(tool))}</p></div><div class="detail-meta"><span class="price-badge">${escapeHTML(categoryLabel(tool.category))}</span><span class="price-badge">${escapeHTML(tool.license || t('licenseUnspecified'))}</span>${rating.count?`<span class="price-badge">★ ${rating.average.toFixed(1)} · ${rating.count}</span>`:''}</div><div class="detail-actions"><a class="button button-primary magnetic" href="${escapeHTML(officialURL)}" target="_blank" rel="noopener noreferrer">${escapeHTML(t('openOfficial'))} ↗</a><button class="button button-outline" data-action="favorite" data-id="${escapeHTML(tool.id)}">${isFav?'★':'☆'} ${escapeHTML(isFav?t('saved'):t('save'))}</button><button class="button button-outline" data-action="compare" data-id="${escapeHTML(tool.id)}">${inCompare?'✓':'＋'} ${escapeHTML(t('compare'))}</button><button class="button button-quiet" data-action="share-tool" data-id="${escapeHTML(tool.id)}">↗ ${escapeHTML(t('share'))}</button></div></div>
    <div class="detail-visual">${screenshotMarkup(tool,true,officialURL)}<div class="preview-caption"><span>${escapeHTML(t('sitePreview'))}</span><a href="${escapeHTML(officialURL)}" target="_blank" rel="noopener noreferrer">${escapeHTML(t('openPreview'))} ↗</a></div></div></section>
    <section class="detail-columns"><div class="detail-main-column"><article class="content-panel"><h2>${escapeHTML(t('overview'))}</h2><p>${escapeHTML(descLong)}</p><p>${escapeHTML(t('priceDisclaimer'))}</p><div class="detail-tags">${(tool.tags||[]).map(tag=>`<span class="detail-tag">${escapeHTML(localizedTag(tag))}</span>`).join('')}</div></article>
      <article class="content-panel"><h2>${escapeHTML(t('alternatives'))}</h2>${related.length?`<div class="alternatives-grid">${related.map(item=>`<a class="alternative-card" href="#/tool/${encodeURIComponent(item.id)}">${logoMarkup(item)}<span><span class="alternative-name">${escapeHTML(item.name)}</span><span class="alternative-price">${escapeHTML(priceLabel(item.price))}</span></span></a>`).join('')}</div>`:`<p>${escapeHTML(t('noAlternatives'))}</p>`}</article>
      <article class="content-panel"><h2>${escapeHTML(t('comments'))}</h2><div id="comment-privacy-note" class="local-note">${escapeHTML(UI.backend ? t('loginForComments') : t('localComments'))}</div><form id="comment-form" class="modal-form" style="margin-top:13px"><label class="field"><span class="sr-only">${escapeHTML(t('commentPlaceholder'))}</span><textarea class="textarea-control" name="comment" maxlength="900" required placeholder="${escapeHTML(t('commentPlaceholder'))}"></textarea></label><button class="button button-primary" type="submit">${escapeHTML(t('postComment'))} ↗</button></form><div class="comment-list" id="comment-list"><p class="helper-text">${escapeHTML(t('loading'))}</p></div></article>
    </div><aside class="detail-side-column">${pricingSection}<article class="content-panel"><h2>${escapeHTML(t('rateTool'))}</h2><p class="helper-text">${escapeHTML(rating.shared ? (UI.session?t('yourRating'):t('signInToRate')) : t('localVote'))}</p><div class="rating-picker" role="group" aria-label="${escapeHTML(t('rateTool'))}">${[1,2,3,4,5].map(value=>`<button type="button" class="rating-star-button${rating.myVote>=value?' is-selected':''}" data-action="rate" data-id="${escapeHTML(tool.id)}" data-rating="${value}" aria-label="${value} / 5" aria-pressed="${rating.myVote===value}">★</button>`).join('')}</div><p class="helper-text">${rating.count?`${rating.average.toFixed(1)} / 5 · ${rating.count} ${escapeHTML(t('ratings'))}`:escapeHTML(t('notRated'))}</p>${!UI.backend?`<div class="local-note">${escapeHTML(t('localVote'))}</div>`:''}</article><article class="content-panel"><h2>${escapeHTML(t('details'))}</h2><dl class="side-facts"><div class="side-fact"><dt>${escapeHTML(t('category'))}</dt><dd>${escapeHTML(categoryLabel(tool.category))}</dd></div><div class="side-fact"><dt>${escapeHTML(t('pricing'))}</dt><dd>${escapeHTML(priceLabel(tool.price))}</dd></div><div class="side-fact"><dt>${escapeHTML(t('license'))}</dt><dd>${escapeHTML(tool.license||'—')}</dd></div><div class="side-fact"><dt>${escapeHTML(t('officialSite'))}</dt><dd><a href="${escapeHTML(officialURL)}" target="_blank" rel="noopener noreferrer">${escapeHTML(domainOf(officialURL))} ↗</a></dd></div>${docsURL?`<div class="side-fact"><dt>${escapeHTML(t('docsLabel'))}</dt><dd><a href="${escapeHTML(docsURL)}" target="_blank" rel="noopener noreferrer">${escapeHTML(t('openOfficial'))} ↗</a></dd></div>`:''}</dl></article><button class="button button-quiet" data-action="back">← ${escapeHTML(t('back'))}</button></aside></section></div>`;
  $('#site-footer').hidden = false;
  document.title = `${tool.name} — OpenStacker Pro`;
  loadComments(tool.id);
  activatePageEffects($('#app-view'));
}
function renderNotFound() {
  $('#app-view').innerHTML = `<section class="detail-page container"><div class="grid-empty"><span class="grid-empty-icon">?</span><h3>${escapeHTML(t('noResults'))}</h3><p>${escapeHTML(t('noResultsDesc'))}</p><a class="button button-primary" href="#/">${escapeHTML(t('back'))}</a></div></section>`;
}
function renderCompare() {
  const items = [...UI.compare].map(getTool).filter(Boolean);
  $('#app-view').innerHTML = `<section class="compare-page container page-enter"><div class="section-heading"><div><p class="section-kicker">${escapeHTML(t('compareKicker'))}</p><h1 class="section-title">${escapeHTML(t('compareTitle'))}</h1><p>${escapeHTML(t('toolsCaption'))}</p></div><button type="button" class="button button-outline" data-action="compare-clear">${escapeHTML(t('clearCompare'))}</button></div>${items.length<2?`<div class="grid-empty"><span class="grid-empty-icon">⇄</span><h3>${escapeHTML(t('compareEmpty'))}</h3><p>${escapeHTML(t('toolsCaption'))}</p><a class="button button-primary" href="#catalog">${escapeHTML(t('exploreTools'))}</a></div>`:`<div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>${escapeHTML(t('details'))}</th>${items.map(tool=>`<th><div class="compare-tool-head">${logoMarkup(tool)}<strong>${escapeHTML(tool.name)}</strong><button class="text-button" data-action="compare" data-id="${escapeHTML(tool.id)}">× ${escapeHTML(t('remove'))}</button></div></th>`).join('')}</tr></thead><tbody>${[[t('fieldCategory'),tool=>categoryLabel(tool.category)],[t('fieldPricing'),tool=>priceLabel(tool.price)],[t('fieldLicense'),tool=>tool.license||'—'],[t('fieldRating'),tool=>{const r=ratingSummary(tool.id);return r.count?`★ ${r.average.toFixed(1)} (${r.count})`:r.myVote?`★ ${r.myVote}/5`:'—';}],[t('fieldTags'),tool=>(tool.tags||[]).slice(0,6).map(localizedTag).join(', ')||'—'],[t('overview'),tool=>localizedDesc(tool,true)],[t('fieldUrl'),tool=>domainOf(tool.url)]].map(([label,getValue])=>`<tr><td>${escapeHTML(label)}</td>${items.map(tool=>`<td>${escapeHTML(getValue(tool))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}</section>`;
  $('#site-footer').hidden = false;
  document.title = `${t('compareTitle')} — OpenStacker Pro`;
  activatePageEffects($('#app-view'));
}
function renderAdmin() {
  const allowed = Boolean(UI.backend && UI.session && UI.profile?.role === 'admin');
  $('#app-view').innerHTML = `<section class="compare-page container page-enter"><div class="section-heading"><div><p class="section-kicker">${escapeHTML(t('adminKicker'))}</p><h1 class="section-title">${escapeHTML(t('adminTitle'))}</h1><p>${escapeHTML(t('adminDesc'))}</p></div></div>${allowed?`<div id="admin-queue" class="admin-list"><div class="skeleton" style="height:90px"></div></div>`:`<div class="modal-alert"><strong>${escapeHTML(t('admin'))}</strong>${escapeHTML(t('adminRequires'))}</div><p class="helper-text" style="margin-top:14px">${escapeHTML(t(UI.backend?'backendReady':'backendNeededDesc'))}</p>`}</section>`;
  $('#site-footer').hidden = false;
  document.title = `${t('admin')} — OpenStacker Pro`;
  if (allowed) loadAdminQueue();
}
async function loadAdminQueue() {
  const container = $('#admin-queue');
  if (!container || !UI.backend || UI.profile?.role !== 'admin') return;
  const { data, error } = await UI.backend.from('tool_submissions').select('*').eq('status','pending').order('created_at',{ascending:false}).limit(80);
  if (error) { container.innerHTML = `<div class="inline-error">${escapeHTML(error.message)}</div>`; return; }
  UI.adminQueue = data || [];
  container.innerHTML = UI.adminQueue.length ? UI.adminQueue.map(row=>`<article class="admin-item"><div><h3>${escapeHTML(row.name)} <span class="price-badge">${escapeHTML(priceLabel(row.price_model))}</span></h3><p>${escapeHTML(row.description)}<br><a href="${escapeHTML(safeURL(row.url)||'#')}" target="_blank" rel="noopener noreferrer">${escapeHTML(row.url)}</a><br><span>${escapeHTML(categoryLabel(row.category))} · ${escapeHTML(new Date(row.created_at).toLocaleDateString(UI.lang==='it'?'it-IT':'en-US'))}</span></p></div><div class="admin-actions"><button class="button button-primary button-small" data-action="moderate" data-id="${escapeHTML(row.id)}" data-status="published">${escapeHTML(t('approve'))}</button><button class="button button-outline button-small" data-action="moderate" data-id="${escapeHTML(row.id)}" data-status="rejected">${escapeHTML(t('reject'))}</button></div></article>`).join('') : `<div class="grid-empty"><span class="grid-empty-icon">✓</span><h3>${escapeHTML(t('noPending'))}</h3></div>`;
}
function parseRoute() {
  const hash = location.hash || '#/';
  const path = hash.replace(/^#\/?/, '').split('?')[0];
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'tool' && parts[1]) return { view: 'detail', id: parts[1] };
  if (parts[0] === 'compare') return { view: 'compare' };
  if (parts[0] === 'admin') return { view: 'admin' };
  return { view: 'home' };
}
function renderRoute(options = {}) {
  const route = parseRoute();
  UI.currentRoute = location.hash || '#/';
  const viewKey = `${route.view}:${route.id || ''}`;
  const changedView = Boolean(UI.currentView) && UI.currentView !== viewKey;
  UI.currentView = viewKey;
  const animate = changedView && !options.keepScroll && !reducedMotionQuery.matches && typeof document.startViewTransition === 'function';
  const run = () => {
    resetReveals();
    if (route.view === 'detail') renderDetail(route.id);
    else if (route.view === 'compare') renderCompare();
    else if (route.view === 'admin') renderAdmin();
    else renderHome();
    updateStaticUI();
    activatePageEffects($('#app-view'));
    if (!options.keepScroll) window.scrollTo({ top: 0, behavior: animate || reducedMotionQuery.matches ? 'auto' : 'smooth' });
  };
  if (animate) document.startViewTransition(run); else run();
}
function updateCompareDock() {
  const dock = $('#compare-dock');
  if (!dock) return;
  const tools = [...UI.compare].map(getTool).filter(Boolean);
  dock.hidden = tools.length === 0;
  $('#compare-count').textContent = String(tools.length);
  $('#compare-selected-label').textContent = t('selected');
  $('#compare-open').innerHTML = `${escapeHTML(t('compareNow'))} <span aria-hidden="true">↗</span>`;
  $('#compare-avatars').innerHTML = tools.map(tool=>`<span class="compare-avatar" title="${escapeHTML(tool.name)}"><img src="${escapeHTML(toolFavicon(tool))}" alt="" loading="lazy" data-logo-image>${escapeHTML(initials(tool.name))}</span>`).join('');
}
function refreshFavoriteUI(id) {
  const saved = UI.favorites.has(id);
  $$(`[data-action="favorite"][data-id="${CSS.escape(id)}"]`).forEach(button => {
    button.classList.toggle('is-active', saved);
    button.setAttribute('aria-pressed', String(saved));
    if (button.classList.contains('card-action')) { button.setAttribute('aria-label', t(saved ? 'removeFavorite' : 'addFavorite')); button.textContent = saved ? '★' : '☆'; }
    else button.textContent = `${saved ? '★' : '☆'} ${t(saved ? 'saved' : 'save')}`;
    button.classList.remove('is-popping'); void button.offsetWidth; button.classList.add('is-popping');
  });
}
function refreshCompareUI(id) {
  const selected = UI.compare.has(id);
  $$(`[data-action="compare"][data-id="${CSS.escape(id)}"]`).forEach(button => {
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
    if (button.classList.contains('card-action')) button.textContent = selected ? '✓' : '＋';
    else if (!button.classList.contains('text-button')) button.textContent = `${selected ? '✓' : '＋'} ${t('compare')}`;
    button.classList.remove('is-popping'); void button.offsetWidth; button.classList.add('is-popping');
  });
  updateCompareDock();
}
async function toggleFavorite(id) {
  const wasSaved = UI.favorites.has(id);
  if (UI.backend && UI.session?.user) {
    const result = wasSaved
      ? await UI.backend.from('favorites').delete().eq('tool_id', id).eq('user_id', UI.session.user.id)
      : await UI.backend.from('favorites').upsert({ tool_id: id, user_id: UI.session.user.id }, { onConflict: 'tool_id,user_id' });
    if (result.error) { showToast(result.error.message || t('toastError'), 'error'); return; }
  }
  if (wasSaved) UI.favorites.delete(id); else UI.favorites.add(id);
  persistSet('favorites', UI.favorites);
  dropCard(id);
  if (UI.favoritesOnly && $('#tool-grid')) renderCatalogResults(); else refreshFavoriteUI(id);
  showToast(t('toastSaved'));
}
function toggleCompare(id) {
  if (UI.compare.has(id)) UI.compare.delete(id);
  else {
    if (UI.compare.size >= 4) { showToast(UI.lang === 'it' ? 'Puoi confrontare al massimo 4 tool.' : 'You can compare up to 4 tools.', 'error'); return; }
    UI.compare.add(id);
  }
  persistSet('compare', UI.compare);
  dropCard(id);
  if (parseRoute().view === 'compare') renderRoute({ keepScroll: true }); else refreshCompareUI(id);
}
function renderCommandResults(query = '') {
  const container = $('#command-results');
  if (!container) return;
  const words = query.trim().toLocaleLowerCase(UI.lang).split(/\s+/).filter(Boolean);
  const results = allTools().filter(tool => !words.length || words.every(word => searchText(tool).includes(word))).slice(0, 12);
  UI.commandIndex = Math.min(UI.commandIndex, Math.max(0, results.length - 1));
  container.innerHTML = results.length ? results.map((tool,index)=>`<button class="command-result${index===UI.commandIndex?' is-current':''}" type="button" data-action="command-open" data-id="${escapeHTML(tool.id)}"><span class="tool-logo"><span class="logo-fallback">${escapeHTML(initials(tool.name))}</span><img src="${escapeHTML(toolFavicon(tool))}" alt="" loading="lazy" data-logo-image></span><span class="command-result-main"><span class="command-result-title">${escapeHTML(tool.name)}</span><span class="command-result-desc">${escapeHTML(localizedDesc(tool))}</span></span><kbd>↵</kbd></button>`).join('') : `<div class="grid-empty"><h3>${escapeHTML(t('noResults'))}</h3></div>`;
  activatePageEffects(container);
}
function openCommand() {
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-modal-backdrop><section class="modal-card command-modal" role="dialog" aria-modal="true" aria-label="${escapeHTML(t('hotkeyHint'))}"><div class="command-search-wrap"><span class="search-symbol" aria-hidden="true">⌕</span><input id="command-search" type="search" autocomplete="off" placeholder="${escapeHTML(t('searchPlaceholder'))}" autofocus><kbd>ESC</kbd></div><div id="command-results" class="command-results"></div><p class="helper-text" style="padding:8px 10px 2px">${escapeHTML(t('hotkeyHint'))} · ${escapeHTML(t('toolsCatalog'))}</p></section></div>`;
  renderCommandResults('');
  const input = $('#command-search');
  input?.focus();
  input?.addEventListener('input', () => { UI.commandQuery = input.value; UI.commandIndex = 0; renderCommandResults(input.value); });
}
function closeModal() { $('#modal-root').innerHTML = ''; }
function openAuthModal(mode = 'signin') {
  UI.authMode = mode;
  renderAuthModal();
}
function renderAuthModal() {
  const isSignup = UI.authMode === 'signup';
  const configured = isBackendConfigured() && UI.backend;
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-modal-backdrop><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button class="icon-button modal-close" type="button" data-action="close-modal" aria-label="${escapeHTML(t('close'))}">×</button><span class="modal-kicker">OPENSTACKER ID / 01</span><h2 id="auth-title">${escapeHTML(isSignup?t('signUp'):t('authTitle'))}</h2><p class="modal-description">${escapeHTML(t('authSubtitle'))}</p>${!configured?`<div class="modal-alert"><strong>${escapeHTML(t('backendNeeded'))}</strong>${escapeHTML(t('backendNeededDesc'))}<br><a href="./README.md#optional-supabase-backend" target="_blank" rel="noopener noreferrer">README · Setup guide ↗</a></div>`:`<form id="auth-form" class="modal-form">${isSignup?`<label class="field"><span>${escapeHTML(t('username'))}</span><input class="input-control" name="username" minlength="2" maxlength="24" required autocomplete="nickname"></label>`:''}<label class="field"><span>${escapeHTML(t('email'))}</span><input class="input-control" type="email" name="email" required autocomplete="email"></label><label class="field"><span>${escapeHTML(t('password'))}</span><input class="input-control" type="password" name="password" minlength="8" required autocomplete="${isSignup?'new-password':'current-password'}"></label><button class="button button-primary" type="submit">${escapeHTML(isSignup?t('signUp'):t('signInAction'))} ↗</button><p class="helper-text">${escapeHTML(t('secureBadge'))}</p></form>`}<button class="modal-switch" type="button" data-action="toggle-auth">${escapeHTML(isSignup?t('switchSignIn'):t('switchSignUp'))}</button></section></div>`;
  $('#modal-root').querySelector('[data-modal-backdrop]')?.addEventListener('click', event => { if (event.target.matches('[data-modal-backdrop]')) closeModal(); });
  $('#auth-form')?.querySelector('input')?.focus();
}
function openProposalModal() {
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-modal-backdrop><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="submit-title"><button class="icon-button modal-close" type="button" data-action="close-modal" aria-label="${escapeHTML(t('close'))}">×</button><span class="modal-kicker">${escapeHTML(t('communityKicker'))}</span><h2 id="submit-title">${escapeHTML(t('submitTitle'))}</h2><p class="modal-description">${escapeHTML(t('submitDesc'))}</p><form id="proposal-form" class="modal-form"><div class="form-grid"><label class="field"><span>${escapeHTML(t('toolName'))}</span><input class="input-control" name="name" maxlength="80" required></label><label class="field"><span>${escapeHTML(t('category'))}</span><select class="select-control" name="category" required>${Object.keys(CATEGORY_LABELS.it).map(cat=>`<option value="${escapeHTML(cat)}">${escapeHTML(categoryLabel(cat))}</option>`).join('')}</select></label><label class="field full"><span>${escapeHTML(t('toolUrl'))}</span><input class="input-control" type="url" name="url" placeholder="https://example.com" required></label><label class="field full"><span>${escapeHTML(t('shortDescription'))}</span><textarea class="textarea-control" name="description" maxlength="900" required></textarea></label><label class="field"><span>${escapeHTML(t('pricing'))}</span><select class="select-control" name="price_model"><option value="free">${escapeHTML(t('freeLabel'))}</option><option value="freemium">${escapeHTML(t('freemiumLabel'))}</option><option value="paid">${escapeHTML(t('paidLabel'))}</option></select></label><label class="field"><span>${escapeHTML(t('license'))}</span><input class="input-control" name="license" maxlength="80" placeholder="${escapeHTML(t('licensePlaceholder'))}"></label></div><button class="button button-primary" type="submit">${escapeHTML(t('sendProposal'))} ↗</button><p class="helper-text">${escapeHTML(UI.backend ? t('backendReady') : t('localModeNotice'))}</p></form></section></div>`;
  $('#modal-root').querySelector('[data-modal-backdrop]')?.addEventListener('click', event => { if (event.target.matches('[data-modal-backdrop]')) closeModal(); });
}
async function connectAndLoadBackend() {
  if (!isBackendConfigured()) { updateStaticUI(); return; }
  try {
    UI.backend = await connectBackend();
    if (!UI.backend) { updateStaticUI(); return; }
    const { data, error } = await UI.backend.auth.getSession();
    if (error) throw error;
    UI.session = data.session;
    if (UI.session?.user) await loadProfile();
    UI.backend.auth.onAuthStateChange((_event, session) => {
      UI.session = session;
      queueMicrotask(async () => {
        if (UI.session?.user) { await loadProfile(); try { await syncRemoteFavorites(); } catch (error) { console.warn('[OpenStacker] Favorites sync failed:', error.message); } } else { UI.profile = null; UI.favorites = new Set(readStore('favorites', [])); }
        updateStaticUI();
        if ($('#app-view')) renderRoute({ keepScroll: true });
        if ($('#modal-root').querySelector('#auth-title')) renderAuthModal();
      });
    });
    await Promise.all([loadRemoteRatings(), loadPublishedSubmissions(), syncRemoteFavorites()]);
  } catch (error) {
    UI.backendError = error?.message || 'Backend connection failed';
    UI.backend = null;
    console.error('[OpenStacker] Optional backend unavailable:', error);
    showToast(UI.lang === 'it' ? 'Backend non raggiungibile: è attiva la modalità locale.' : 'Backend unavailable: local demo mode is active.', 'error');
  }
  updateStaticUI();
  renderRoute({ keepScroll: true });
}
async function loadProfile() {
  if (!UI.backend || !UI.session?.user) { UI.profile = null; return; }
  try {
    const { data, error } = await UI.backend.from('profiles').select('id,username,role').eq('id', UI.session.user.id).maybeSingle();
    if (error) throw error;
    UI.profile = data || { id: UI.session.user.id, username: UI.session.user.user_metadata?.username || UI.session.user.email?.split('@')[0] || 'Member', role: 'user' };
  } catch (error) {
    console.warn('[OpenStacker] Profile could not be loaded:', error.message);
    UI.profile = { id: UI.session.user.id, username: UI.session.user.user_metadata?.username || UI.session.user.email?.split('@')[0] || 'Member', role: 'user' };
  }
}
async function syncRemoteFavorites() {
  if (!UI.backend || !UI.session?.user) return;
  const userId = UI.session.user.id;
  const seedKey = `favorites-seeded:${userId}`;
  const previousAccount = readStore('last-auth-user', null);
  const alreadySeeded = readStore(seedKey, false);
  // Only import browser favorites on a first sign-in or when returning to the same account.
  // This prevents favorites left by a previous account on a shared device leaking into another.
  const maySeedLocalFavorites = previousAccount === null || previousAccount === userId;
  if (!alreadySeeded && maySeedLocalFavorites && UI.favorites.size) {
    const rows = [...UI.favorites].map(tool_id => ({ tool_id, user_id: userId }));
    const { error: seedError } = await UI.backend.from('favorites').upsert(rows, { onConflict: 'tool_id,user_id', ignoreDuplicates: true });
    if (seedError) console.warn('[OpenStacker] Local favorites were not imported:', seedError.message);
    else writeStore(seedKey, true);
  } else if (!alreadySeeded) writeStore(seedKey, true);
  const { data, error } = await UI.backend.from('favorites').select('tool_id').eq('user_id', userId).limit(1500);
  if (error) throw error;
  UI.favorites = new Set((data || []).map(row => row.tool_id));
  writeStore('last-auth-user', userId);
  persistSet('favorites', UI.favorites);
}
async function loadRemoteRatings() {
  if (!UI.backend) return;
  try {
    const { data, error } = await UI.backend.from('ratings').select('tool_id,user_id,rating').limit(3000);
    if (error) throw error;
    UI.remoteRatings = data || [];
    cardCache.clear();
  } catch (error) { console.warn('[OpenStacker] Ratings could not be loaded:', error.message); }
}
async function loadPublishedSubmissions() {
  if (!UI.backend) return;
  try {
    const { data, error } = await UI.backend.from('tool_submissions').select('id,name,url,category,description,price_model,license,tags').eq('status','published').order('created_at',{ascending:false}).limit(300);
    if (error) throw error;
    UI.communityTools = (data || []).map(normalizeSubmission).filter(tool => !TOOLS.some(item=>item.id===tool.id));
    cardCache.clear();
  } catch (error) { console.warn('[OpenStacker] Community catalog could not be loaded:', error.message); }
}
async function loadComments(toolId) {
  const container = $('#comment-list');
  if (!container) return;
  if (UI.backend) {
    try {
      const { data, error } = await UI.backend.from('comments').select('id,tool_id,user_id,body,created_at,profiles!comments_user_id_fkey(username)').eq('tool_id', toolId).order('created_at',{ascending:false}).limit(50);
      if (error) throw error;
      UI.currentComments = (data || []).map(row => ({ id:row.id, user:row.profiles?.username || 'Member', text:row.body, ts:new Date(row.created_at).getTime(), remote:true }));
    } catch (error) {
      console.warn('[OpenStacker] Comments could not be loaded:', error.message);
      UI.currentComments = [];
    }
  } else UI.currentComments = [...(UI.localComments[toolId] || [])].sort((a,b)=>b.ts-a.ts);
  const note = $('#comment-privacy-note');
  if (note) note.textContent = UI.backend ? (UI.session ? t('backendReady') : t('loginForComments')) : t('localComments');
  renderComments();
}
function renderComments() {
  const container = $('#comment-list');
  if (!container) return;
  if (!UI.currentComments.length) { container.innerHTML = `<p class="helper-text">${escapeHTML(t('noComments'))}</p>`; return; }
  container.innerHTML = UI.currentComments.map(comment=>`<article class="comment-item"><div class="comment-head"><span class="comment-author">${escapeHTML(comment.user || t('guest'))}</span><time class="comment-date" datetime="${escapeHTML(new Date(comment.ts).toISOString())}">${escapeHTML(new Date(comment.ts).toLocaleDateString(UI.lang==='it'?'it-IT':'en-US'))}</time></div><p class="comment-body">${escapeHTML(comment.text)}</p></article>`).join('');
}
async function handleRating(toolId, value) {
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return;
  if (UI.backend) {
    if (!UI.session) { showToast(t('signInToRate'), 'error'); openAuthModal('signin'); return; }
    const { error } = await UI.backend.from('ratings').upsert({ tool_id: toolId, user_id: UI.session.user.id, rating, updated_at: nowISO() }, { onConflict: 'tool_id,user_id' });
    if (error) { showToast(error.message || t('toastError'), 'error'); return; }
    await loadRemoteRatings();
    cardCache.clear();
    renderRoute({ keepScroll: true });
    showToast(t('toastSaved'));
  } else {
    UI.localVotes[toolId] = rating;
    writeStore('local-votes', UI.localVotes);
    dropCard(toolId);
    renderRoute({ keepScroll: true });
    showToast(t('localVote'));
  }
}
async function handleCommentSubmit(form) {
  const toolId = UI.activeToolId;
  const textarea = form.elements.comment;
  const text = textarea.value.trim();
  if (!toolId || !text) return;
  if (UI.backend) {
    if (!UI.session) { showToast(t('loginForComments'), 'error'); openAuthModal('signin'); return; }
    const { error } = await UI.backend.from('comments').insert({ tool_id: toolId, user_id: UI.session.user.id, body: text });
    if (error) { showToast(error.message || t('toastError'), 'error'); return; }
    textarea.value = '';
    await loadComments(toolId);
    showToast(t('toastSaved'));
  } else {
    const comments = UI.localComments[toolId] || [];
    comments.push({ id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, user:'Guest', text, ts:Date.now() });
    UI.localComments[toolId] = comments;
    writeStore('local-comments', UI.localComments);
    textarea.value = '';
    await loadComments(toolId);
    showToast(t('localComments'));
  }
}
async function handleProposalSubmit(form) {
  const payload = Object.fromEntries(new FormData(form).entries());
  const url = safeURL(payload.url);
  if (!payload.name?.trim() || !url || !payload.description?.trim()) { showToast(t('required'), 'error'); return; }
  payload.url = url;
  payload.name = payload.name.trim();
  payload.description = payload.description.trim();
  payload.license = payload.license.trim();
  if (UI.backend) {
    if (!UI.session) { showToast(t('submitDesc'), 'error'); openAuthModal('signin'); return; }
    const { error } = await UI.backend.from('tool_submissions').insert({ name: payload.name, url: payload.url, category: payload.category, description: payload.description, price_model: payload.price_model, license: payload.license || null, status:'pending', submitted_by: UI.session.user.id });
    if (error) { showToast(error.message || t('proposalError'), 'error'); return; }
  } else {
    const submissions = UI.localSubmissions;
    submissions.push({ ...payload, id:`local-${Date.now()}`, created_at:nowISO(), status:'local-only' });
    UI.localSubmissions = submissions;
    writeStore('local-submissions', submissions);
  }
  closeModal(); showToast(t('proposalSaved'));
}
async function handleAuthSubmit(form) {
  if (!UI.backend) { showToast(t('backendNeeded'), 'error'); return; }
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    if (UI.authMode === 'signup') {
      if (String(data.password || '').length < 8) { showToast(t('minPassword'), 'error'); return; }
      const { data: result, error } = await UI.backend.auth.signUp({ email:String(data.email).trim(), password:String(data.password), options:{ data:{ username:String(data.username).trim() } } });
      if (error) throw error;
      if (result.session) { UI.session = result.session; await loadProfile(); await syncRemoteFavorites(); }
      closeModal(); showToast(t('signupSuccess'));
    } else {
      const { data: result, error } = await UI.backend.auth.signInWithPassword({ email:String(data.email).trim(), password:String(data.password) });
      if (error) throw error;
      UI.session = result.session; await loadProfile(); await Promise.all([loadRemoteRatings(), loadPublishedSubmissions(), syncRemoteFavorites()]);
      closeModal(); showToast(t('loginSuccess')); renderRoute({ keepScroll:true });
    }
  } catch (error) { showToast(error?.message || t('authError'), 'error'); }
}
async function moderateSubmission(id, status) {
  if (!UI.backend || UI.profile?.role !== 'admin') { showToast(t('adminRequires'), 'error'); return; }
  const { error } = await UI.backend.from('tool_submissions').update({ status, reviewed_at:nowISO(), reviewed_by:UI.session.user.id }).eq('id', id);
  if (error) { showToast(error.message || t('toastError'), 'error'); return; }
  await Promise.all([loadAdminQueue(), loadPublishedSubmissions()]);
  renderRoute({ keepScroll:true });
  showToast(t('toastSaved'));
}
async function shareTool(id) {
  const url = new URL(`#/tool/${encodeURIComponent(id)}`, window.location.href).href;
  const tool = getTool(id);
  try {
    if (navigator.share) await navigator.share({ title:`${tool?.name || 'OpenStacker'} — OpenStacker Pro`, url });
    else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); showToast(t('linkCopied')); }
    else { const textarea = document.createElement('textarea'); textarea.value = url; textarea.style.position='fixed'; textarea.style.opacity='0'; document.body.append(textarea); textarea.select(); const copied = document.execCommand('copy'); textarea.remove(); showToast(copied?t('linkCopied'):url); }
  } catch (error) { if (error?.name !== 'AbortError') showToast(t('toastError'), 'error'); }
}
function scrollToSection(id) {
  if (!location.hash.startsWith('#/') || location.hash === '#/') {
    document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start' });
  } else {
    history.replaceState(null, '', `#${id}`);
    renderHome();
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior:'smooth', block:'start' }));
  }
}
// All interactions are delegated once; re-rendering cards never stacks duplicate handlers.
document.addEventListener('click', async event => {
  const action = event.target.closest('[data-action]');
  const openTool = event.target.closest('[data-open-tool]');
  const card = event.target.closest('[data-tool-card]');
  if (openTool) { event.preventDefault(); location.hash = `#/tool/${encodeURIComponent(openTool.dataset.openTool)}`; return; }
  if (!action && card && !event.target.closest('button,a,input,select,textarea')) { location.hash = `#/tool/${encodeURIComponent(card.dataset.toolCard)}`; return; }
  if (!action) return;
  const { action: kind, id } = action.dataset;
  if (kind === 'favorite') { event.preventDefault(); toggleFavorite(id); }
  else if (kind === 'compare') { event.preventDefault(); toggleCompare(id); }
  else if (kind === 'rate') { event.preventDefault(); await handleRating(id, action.dataset.rating); }
  else if (kind === 'select-category') { event.preventDefault(); applyFilters({ category: action.dataset.category, favoritesOnly: false, priceFilter: UI.priceFilter, query: UI.query }); }
  else if (kind === 'price-filter') { event.preventDefault(); applyFilters({ priceFilter: action.dataset.price, favoritesOnly: false }); }
  else if (kind === 'price-filter-paid') { event.preventDefault(); applyFilters({ category: 'all', priceFilter: 'paid', favoritesOnly: false }); }
  else if (kind === 'favorites-only') { applyFilters({ favoritesOnly: !UI.favoritesOnly }, { scroll: false }); }
  else if (kind === 'clear-filters') applyFilters({ query: '', category: 'all', priceFilter: 'all', sort: 'featured', favoritesOnly: false });
  else if (kind === 'load-more') appendCatalogBatch();
  else if (kind === 'reset-category') applyFilters({ category: 'all', favoritesOnly: false });
  else if (kind === 'show-catalog') scrollToSection('catalog');
  else if (kind === 'developer-stack') applyFilters({ query: '', category: 'all', priceFilter: 'all', favoritesOnly: false, stackIds: DEVELOPER_IDS });
  else if (kind === 'submit-tool') openProposalModal();
  else if (kind === 'share-tool') await shareTool(id);
  else if (kind === 'back') { if (history.length > 1 && !document.referrer.endsWith(location.host)) history.back(); else location.hash='#/'; }
  else if (kind === 'compare-open') location.hash='#/compare';
  else if (kind === 'compare-clear') { UI.compare.clear(); persistSet('compare',UI.compare); renderRoute({keepScroll:true}); }
  else if (kind === 'command-open') { closeModal(); location.hash=`#/tool/${encodeURIComponent(id)}`; }
  else if (kind === 'close-modal') closeModal();
  else if (kind === 'toggle-auth') { UI.authMode = UI.authMode==='signup'?'signin':'signup'; renderAuthModal(); }
  else if (kind === 'moderate') await moderateSubmission(id, action.dataset.status);
});

document.addEventListener('submit', async event => {
  if (event.target.id === 'auth-form') { event.preventDefault(); await handleAuthSubmit(event.target); }
  else if (event.target.id === 'proposal-form') { event.preventDefault(); await handleProposalSubmit(event.target); }
  else if (event.target.id === 'comment-form') { event.preventDefault(); await handleCommentSubmit(event.target); }
});

let searchTimer = 0;
document.addEventListener('input', event => {
  if (event.target.id === 'catalog-search') {
    UI.query = event.target.value; UI.stackIds = null;
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(renderCatalogResults, 60);
  }
  if (event.target.id === 'command-search') { UI.commandQuery = event.target.value; renderCommandResults(UI.commandQuery); }
});
document.addEventListener('change', event => {
  if (event.target.id === 'category-select') { UI.category = event.target.value; UI.stackIds = null; renderCatalogResults(); }
  else if (event.target.id === 'sort-select') { UI.sort = event.target.value; renderCatalogResults(); }
});

$('#language-toggle').addEventListener('click', () => setLanguage(UI.lang === 'it' ? 'en' : 'it'));
$('#theme-toggle').addEventListener('click', () => { setTheme(UI.theme === 'dark' ? 'light' : 'dark'); activatePageEffects($('#app-view')); });
$('#account-button').addEventListener('click', async () => {
  if (UI.backend && UI.session) {
    const confirmed = window.confirm(UI.lang === 'it' ? 'Vuoi uscire dal tuo account?' : 'Sign out of your account?');
    if (!confirmed) return;
    const { error } = await UI.backend.auth.signOut();
    if (error) showToast(error.message, 'error'); else { UI.session=null; UI.profile=null; showToast(t('signOutSuccess')); renderRoute({keepScroll:true}); }
  } else openAuthModal('signin');
});
$('#open-command').addEventListener('click', openCommand);
$('#mobile-menu-toggle').addEventListener('click', () => { const nav = $('#mobile-nav'); nav.hidden = !nav.hidden; });
$('#compare-open').addEventListener('click', () => { location.hash = '#/compare'; });
$('#compare-clear').addEventListener('click', () => { UI.compare.clear(); persistSet('compare',UI.compare); updateCompareDock(); renderRoute({keepScroll:true}); });
$('#footer-submit').addEventListener('click', openProposalModal);
$('#back-to-top').addEventListener('click', () => window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));
window.addEventListener('hashchange', () => {
  const hash = location.hash;
  if (hash === '#catalog' || hash === '#categories' || hash === '#pricing' || hash === '#about' || hash === '#featured') {
    if (!$('#catalog')) renderHome();
    requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({behavior:'smooth',block:'start'}));
  } else renderRoute();
});
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openCommand(); }
  if (event.key === 'Escape' && $('#modal-root').childElementCount) closeModal();
  if (event.key === 'Enter' && event.target.matches('[data-tool-card]')) location.hash = `#/tool/${encodeURIComponent(event.target.dataset.toolCard)}`;
  if ($('#command-search') && event.target.id === 'command-search' && ['ArrowDown','ArrowUp'].includes(event.key)) {
    event.preventDefault(); UI.commandIndex = Math.max(0, Math.min(11, UI.commandIndex + (event.key === 'ArrowDown' ? 1 : -1))); renderCommandResults(event.target.value);
    $$('.command-result')[$$('.command-result').length ? UI.commandIndex % $$('.command-result').length : 0]?.focus();
  }
});

async function init() {
  document.documentElement.dataset.theme = UI.theme;
  document.documentElement.lang = UI.lang;
  setTheme(UI.theme);
  updateStaticUI();
  $('#language-toggle').textContent = UI.lang.toUpperCase();
  initGlobalMotion();
  initAmbientCanvas();
  renderRoute();
  connectAndLoadBackend();
  window.setTimeout(() => {
    $('#boot-screen')?.classList.add('is-hidden');
    $('#site-shell')?.classList.add('is-ready');
  }, 550);
  window.setTimeout(() => $('#boot-screen')?.remove(), 1200);
  console.info(`[OpenStacker Pro] v${APP_VERSION} · ${TOOLS.length} curated tools · ${UI.lang.toUpperCase()} · ${isBackendConfigured()?'backend configured':'local demo mode'}`);
}

init();
