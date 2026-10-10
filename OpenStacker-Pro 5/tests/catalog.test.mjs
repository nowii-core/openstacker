import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOOLS, TOOL_EN, TOOL_IT, EXTRA_TOOL_EN, CATEGORY_LABELS, CATEGORY_EN,
  PRICING_INFO, PRICING_EN, OFFICIAL_PRICING_URLS
} from '../src/js/catalog.js';

const ids = new Set(TOOLS.map(tool => tool.id));

test('catalog contains a substantial set of unique tools', () => {
  assert.ok(TOOLS.length >= 200, `Expected at least 200 tools, got ${TOOLS.length}`);
  assert.equal(ids.size, TOOLS.length, 'Tool IDs must be unique');
});

test('every catalog record has required fields and a safe public URL', () => {
  for (const tool of TOOLS) {
    assert.match(tool.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `Invalid id: ${tool.id}`);
    assert.ok(tool.name?.trim(), `Missing name: ${tool.id}`);
    assert.ok(tool.category?.trim(), `Missing category: ${tool.id}`);
    assert.ok(tool.desc?.trim(), `Missing description: ${tool.id}`);
    assert.ok(['free', 'freemium', 'paid'].includes(tool.price), `Invalid price model: ${tool.id}`);
    const url = new URL(tool.url);
    assert.ok(['http:', 'https:'].includes(url.protocol), `Unsafe URL: ${tool.id}`);
  }
});

test('all alternative links point to a catalog entry', () => {
  for (const tool of TOOLS) {
    for (const alternative of tool.alternatives || []) {
      assert.ok(ids.has(alternative), `${tool.id} refers to missing alternative ${alternative}`);
      assert.notEqual(alternative, tool.id, `${tool.id} cannot be its own alternative`);
    }
  }
});

test('all categories have Italian and English labels', () => {
  const categories = new Set(TOOLS.map(tool => tool.category));
  for (const category of categories) {
    assert.ok(CATEGORY_LABELS.it[category], `Missing IT category label ${category}`);
    assert.ok(CATEGORY_LABELS.en[category] || CATEGORY_EN[category], `Missing EN category label ${category}`);
  }
});

test('each tool has English localization or an explicit generic fallback', () => {
  const missing = TOOLS.filter(tool => !TOOL_EN[tool.id] && !EXTRA_TOOL_EN[tool.id]);
  assert.deepEqual(missing.map(tool => tool.id), []);
});

test('Italian translation overrides use valid fields', () => {
  for (const [id, translation] of Object.entries(TOOL_IT)) {
    assert.ok(ids.has(id), `Italian localization references unknown tool ${id}`);
    assert.ok(translation.desc || translation.long, `Empty Italian localization for ${id}`);
  }
});

test('pricing records always provide a usable official URL', () => {
  for (const [id, info] of Object.entries(PRICING_INFO)) {
    assert.ok(ids.has(id), `Pricing data refers to unknown tool ${id}`);
    const candidate = info.officialUrl || OFFICIAL_PRICING_URLS[id];
    assert.ok(candidate, `Missing official pricing URL for ${id}`);
    assert.ok(['https:', 'http:'].includes(new URL(candidate).protocol), `Invalid pricing URL for ${id}`);
  }
  for (const [id, info] of Object.entries(PRICING_EN)) {
    assert.ok(ids.has(id), `English pricing data refers to unknown tool ${id}`);
    assert.ok(info.headline && info.note, `Incomplete English pricing info for ${id}`);
  }
});

test('no tool URL is also rendered as a non-http resource', () => {
  assert.equal(TOOLS.filter(tool => !/^https?:\/\//i.test(tool.url)).length, 0);
});
