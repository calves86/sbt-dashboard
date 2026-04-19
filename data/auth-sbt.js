/* ===== SBT League Auth Config (Supabase-backed) =====
 *
 * As of commissioner-auth v2.0, auth is fully server-enforced via Supabase.
 * PIN hashes are gone. Users sign in with a magic link (email + click).
 * Access control lives in the `public.memberships` table in Postgres with
 * row-level security policies.
 *
 * To add a commissioner or co-commissioner:
 *   1. They sign up via login.html (or you invite them from Supabase Auth)
 *   2. In Supabase SQL Editor, run:
 *        INSERT INTO public.memberships (user_id, league_id, role)
 *        SELECT u.id, l.id, 'commissioner'::public.membership_role
 *        FROM auth.users u CROSS JOIN public.leagues l
 *        WHERE u.email = 'their@email.com' AND l.slug = 'sbt-2026';
 *   3. Next time they visit commissioner.html they'll be granted access.
 * ===================================================================== */

window.COMM_AUTH = {
  leagueKey:  'sbt_comm_v2',   // localStorage scope (bumped from v1 to clear legacy)
  leagueSlug: 'sbt-2026',      // matches public.leagues.slug in Supabase
  leagueName: 'Sigma Beta Tau Fantasy Football'
};
