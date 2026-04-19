/* ===== supabase-client.js — Shared Supabase client singleton =====
 *
 * Loads the Supabase JS SDK from CDN (no build step required) and
 * exposes a pre-configured client on `window.sb`.
 *
 * The publishable key is intentionally embedded: it is safe to expose
 * in frontend code. Security is enforced by Row Level Security policies
 * on the database. Never embed the `sb_secret_...` key — that's server-only.
 *
 * To use on a page:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="supabase-client.js"></script>
 *   <script>
 *     // now window.sb is available
 *     const { data, error } = await sb.from('leagues').select('*');
 *   </script>
 * ================================================================ */

(function () {
  const SUPABASE_URL = 'https://phgipctxsnpfxxirytfi.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_46dG6k0VeUb548nzkEpZSw_NGVlcSfr';

  if (!window.supabase || !window.supabase.createClient) {
    console.error('[supabase-client] Supabase SDK not loaded. Did you include <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> before this file?');
    return;
  }

  // The CDN script puts the package on window.supabase. We create the
  // client instance and assign it to window.sb to avoid shadowing the
  // package namespace if anyone else needs it.
  window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // picks up magic-link tokens from URL hash
      storageKey: 'commish.supabase.auth', // scoped so it doesn't collide
    },
  });
})();
