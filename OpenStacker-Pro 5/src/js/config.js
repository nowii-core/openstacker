/**
 * Public frontend configuration.
 * Only the Supabase project URL and anon/publishable key belong here.
 * NEVER put a Supabase service-role key or any private API secret in this file.
 */
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';
export const APP_VERSION = '2.1.0';
export const SUPPORT_EMAIL = '';
export const SCREENSHOT_SERVICE = 'https://image.thum.io/get';

export const isBackendConfigured = () =>
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL.trim()) &&
  SUPABASE_ANON_KEY.trim().length > 20;
