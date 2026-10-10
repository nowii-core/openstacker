import { SUPABASE_ANON_KEY, SUPABASE_URL, isBackendConfigured } from './config.js';

let clientPromise;

/** Connects lazily so GitHub Pages works without a backend configuration. */
export async function connectBackend() {
  if (!isBackendConfigured()) return null;
  if (!clientPromise) {
    clientPromise = import('https://esm.sh/@supabase/supabase-js@2').then(({ createClient }) =>
      createClient(SUPABASE_URL.trim(), SUPABASE_ANON_KEY.trim(), {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        global: { headers: { 'x-client-info': 'openstacker-pro/2.0.0' } }
      })
    );
  }
  return clientPromise;
}

export { isBackendConfigured };

export function normalizeSubmission(row) {
  return {
    id: `community-${row.id}`,
    sourceId: row.id,
    name: row.name,
    category: row.category,
    desc: row.description,
    longDesc: row.description,
    url: row.url,
    license: row.license || '',
    price: ['free', 'freemium', 'paid'].includes(row.price_model) ? row.price_model : 'freemium',
    tags: Array.isArray(row.tags) ? row.tags : ['community'],
    alternatives: [],
    communitySubmitted: true
  };
}
