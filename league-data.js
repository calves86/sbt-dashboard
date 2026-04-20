/* ===== league-data.js — Supabase-backed rules load/save =====
 *
 * Bridges the existing commissioner.html UI to the Supabase backend.
 * Exposes two async functions on window:
 *
 *   loadLeagueRules(leagueSlug)
 *     → returns a rules.json-shaped object assembled from:
 *         public.leagues.settings (everything except Scoring System)
 *         public.scoring_rules.rules WHERE is_active=true (Scoring System)
 *     → returns null on error (caller should fall back to fetch('data/rules.json'))
 *
 *   saveLeagueRules(leagueId, rulesObject)
 *     → splits the rules.json-shaped object back into:
 *         settings jsonb on public.leagues
 *         new version of public.scoring_rules (via publish_scoring_rules RPC)
 *     → resolves to { ok: true } on success
 *     → resolves to { ok: false, error } on failure (caller shows toast)
 *
 * Assumes window.sb (from supabase-client.js) is initialized.
 * ========================================================= */

async function loadLeagueRules(leagueSlug) {
  if (!window.sb) {
    console.error('[league-data] Supabase client not initialized');
    return null;
  }
  try {
    // Fetch league + active scoring rules in parallel
    const [leagueRes, scoringRes] = await Promise.all([
      sb.from('leagues').select('id, settings').eq('slug', leagueSlug).single(),
      sb.from('leagues').select('id').eq('slug', leagueSlug).single().then(async r => {
        if (r.error || !r.data) return { data: null, error: r.error };
        return await sb
          .from('scoring_rules')
          .select('rules, version')
          .eq('league_id', r.data.id)
          .eq('is_active', true)
          .maybeSingle();
      }),
    ]);

    if (leagueRes.error) {
      console.error('[league-data] loadLeagueRules: league fetch failed', leagueRes.error);
      return null;
    }

    const settings = leagueRes.data.settings || {};
    const scoring = scoringRes && scoringRes.data ? scoringRes.data.rules : null;

    // Assemble into rules.json shape
    const rules = { ...settings };
    if (scoring) {
      rules['Scoring System'] = scoring;
    }
    return rules;
  } catch (e) {
    console.error('[league-data] loadLeagueRules threw:', e);
    return null;
  }
}

async function saveLeagueRules(leagueId, rulesObject) {
  if (!window.sb) {
    return { ok: false, error: 'Supabase client not initialized' };
  }
  if (!leagueId) {
    return { ok: false, error: 'No leagueId provided' };
  }
  try {
    // Split: Scoring System → scoring_rules, rest → leagues.settings
    const { 'Scoring System': scoring, ...settings } = rulesObject || {};

    // 1) Update league settings
    const { error: settingsErr } = await sb
      .from('leagues')
      .update({ settings, updated_at: new Date().toISOString() })
      .eq('id', leagueId);

    if (settingsErr) {
      return { ok: false, error: 'Failed to save league settings: ' + settingsErr.message };
    }

    // 2) Publish new scoring rules version (if Scoring System section is present)
    if (scoring && typeof scoring === 'object') {
      const { error: rpcErr } = await sb.rpc('publish_scoring_rules', {
        p_league_id: leagueId,
        p_rules: scoring,
        p_notes: 'Saved via commissioner UI',
      });
      if (rpcErr) {
        return { ok: false, error: 'Failed to publish scoring rules: ' + rpcErr.message };
      }
    }

    return { ok: true };
  } catch (e) {
    console.error('[league-data] saveLeagueRules threw:', e);
    return { ok: false, error: String(e) };
  }
}

// Expose on window for legacy scripts
window.loadLeagueRules = loadLeagueRules;
window.saveLeagueRules = saveLeagueRules;
