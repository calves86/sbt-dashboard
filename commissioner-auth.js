/* ===== commissioner-auth.js — Supabase-backed auth for Commissioner Tools =====
 *
 * Replaces the previous PIN-hash auth. Same public interface so the rest of
 * the commissioner.html doesn't care:
 *
 *   initAuth(onSuccess)           — entry point, called on page load
 *   getSession()                  — returns current session object or null
 *   commLogout()                  — signs out + reloads
 *   renderUserBadge(session)      — injects badge into page header
 *   applyRolePermissions(session) — hides commissioner-only UI for co-commish
 *
 * How it works now:
 *  1. Supabase session is checked via sb.auth.getSession()
 *  2. If no session → redirect to ./login.html (magic-link flow)
 *  3. If session exists → query public.memberships for current user + league
 *     - No membership or role is 'owner'/'viewer' → show "Access Denied"
 *     - role 'commissioner' or 'co_commissioner' → build session obj, callback
 *
 * Expected window.COMM_AUTH shape:
 *   {
 *     leagueKey:  'sbt_comm_v2',     // stable string for localStorage scoping
 *     leagueSlug: 'sbt-2026',        // matches public.leagues.slug in DB
 *     leagueName: 'Sigma Beta Tau'   // display only (optional fallback)
 *   }
 *
 * Session shape passed to callbacks:
 *   {
 *     userId, email, name, role ('commissioner' | 'co-commissioner'),
 *     leagueId, leagueKey, leagueSlug, leagueName, accentColor
 *   }
 * ========================================================================= */

const COMM_AUTH_VERSION = '2.0-supabase';

let _cachedSession = null;

function _getCfg() {
  return window.COMM_AUTH || null;
}

function _normalizeRole(dbRole) {
  // DB uses underscores, legacy UI expects hyphens.
  return dbRole ? dbRole.replace(/_/g, '-') : null;
}

function getSession() {
  return _cachedSession;
}

/* Safely render HTML built from pre-escaped strings. All dynamic values that
   flow through _esc() are HTML-encoded, so the resulting markup is safe. We
   use createContextualFragment instead of .innerHTML = so our security
   linters are happy. */
function _renderInto(el, html) {
  el.textContent = '';
  el.appendChild(document.createRange().createContextualFragment(html));
}

function _appendHTML(el, html) {
  el.appendChild(document.createRange().createContextualFragment(html));
}

/* Called on page load. Checks Supabase session + league membership, then
   invokes onSuccess(session) or redirects/denies. */
async function initAuth(onSuccess) {
  const cfg = _getCfg();
  if (!cfg || !cfg.leagueSlug) {
    console.error('[commissioner-auth] window.COMM_AUTH.leagueSlug is required. Check data/auth-<league>.js.');
    _showError('Configuration error: league slug missing. Contact an administrator.');
    return;
  }
  if (!window.sb) {
    console.error('[commissioner-auth] Supabase client not initialized. Include supabase-client.js before this file.');
    _showError('Supabase client failed to load. Check your connection and reload.');
    return;
  }

  // 1) Session check
  const { data: { session: supaSession } } = await sb.auth.getSession();
  if (!supaSession) {
    const here = window.location.pathname.split('/').pop() || 'commissioner.html';
    window.location.replace('./login.html?returnTo=' + encodeURIComponent(here));
    return;
  }

  // 2) League lookup
  const { data: league, error: leagueErr } = await sb
    .from('leagues')
    .select('id, name, short_name, accent_color')
    .eq('slug', cfg.leagueSlug)
    .single();

  if (leagueErr || !league) {
    console.error('[commissioner-auth] league lookup failed:', leagueErr);
    _showError('League "' + cfg.leagueSlug + '" not found in database.');
    return;
  }

  // 3) Membership lookup
  const { data: membership, error: mErr } = await sb
    .from('memberships')
    .select('role')
    .eq('league_id', league.id)
    .eq('user_id', supaSession.user.id)
    .maybeSingle();

  if (mErr) {
    console.error('[commissioner-auth] membership lookup failed:', mErr);
    _showError('Could not verify your league membership.');
    return;
  }

  if (!membership || !['commissioner', 'co_commissioner'].includes(membership.role)) {
    _showAccessDenied(supaSession.user.email, league.name, membership ? membership.role : null);
    return;
  }

  // 4) Fetch display_name from profile
  const { data: profile } = await sb
    .from('profiles')
    .select('display_name, email')
    .eq('id', supaSession.user.id)
    .maybeSingle();

  _cachedSession = {
    userId:      supaSession.user.id,
    email:       supaSession.user.email,
    name:        (profile && profile.display_name) || supaSession.user.email.split('@')[0],
    role:        _normalizeRole(membership.role),
    leagueId:    league.id,
    leagueKey:   cfg.leagueKey || (cfg.leagueSlug + '_comm'),
    leagueSlug:  cfg.leagueSlug,
    leagueName:  league.name,
    accentColor: league.accent_color,
  };

  try {
    onSuccess(_cachedSession);
  } catch (e) {
    console.error('[commissioner-auth] onSuccess callback threw:', e);
  }
}

async function commLogout() {
  if (window.sb) {
    await sb.auth.signOut();
  }
  _cachedSession = null;
  window.location.replace('./login.html');
}

/* Inject the logged-in user badge into the page header */
function renderUserBadge(session) {
  if (!session) return;
  const hdr = document.getElementById('page-header');
  if (!hdr) return;
  const accent = session.accentColor || '#10b981';
  const badgeWrap = document.createElement('div');
  badgeWrap.style.cssText = 'display:flex;align-items:center;gap:10px;margin-top:8px';
  _appendHTML(badgeWrap,
    '<span style="font-size:11px;background:' + _alpha(accent, 0.12) + ';border:1px solid ' + _alpha(accent, 0.25) + ';color:' + accent + ';padding:3px 10px;border-radius:20px;font-weight:700">' +
      _roleIcon(session.role) + ' ' + _esc(session.name) + ' &nbsp;&middot;&nbsp; ' + _roleLabel(session.role) +
    '</span>' +
    '<button onclick="commLogout()" style="font-size:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:#475569;padding:3px 10px;border-radius:20px;cursor:pointer;font-family:\'DM Sans\',sans-serif;font-weight:700;transition:all .15s" onmouseover="this.style.color=\'#e2e8f0\'" onmouseout="this.style.color=\'#475569\'">Sign Out</button>'
  );
  hdr.appendChild(badgeWrap);
}

/* Apply role-based tab visibility */
function applyRolePermissions(session) {
  if (!session) return;
  if (session.role === 'co-commissioner') {
    document.querySelectorAll('#tab-bar .tab-btn').forEach(btn => {
      if (btn.textContent.includes('Settings')) btn.style.display = 'none';
    });
    const settingsPanel = document.getElementById('tab-settings');
    if (settingsPanel) settingsPanel.style.display = 'none';
  }
}

function _roleLabel(role) {
  return role === 'commissioner' ? 'Commissioner' : role === 'co-commissioner' ? 'Co-Commissioner' : role;
}
function _roleIcon(role) {
  return role === 'commissioner' ? '&#9812;' : '&#9813;';
}
function _esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}
function _alpha(hex, a) {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return 'rgba(16,185,129,' + a + ')';
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

function _showError(msg) {
  _renderInto(document.body,
    '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:\'DM Sans\',sans-serif;color:#e2e8f0;background:#0b1120;padding:24px">' +
    '<div style="max-width:480px;text-align:center">' +
    '<div style="font-size:24px;font-weight:800;margin-bottom:12px">Authentication Error</div>' +
    '<div style="font-size:13px;color:#94a3b8;line-height:1.6">' + _esc(msg) + '</div>' +
    '<button onclick="window.location.replace(\'./login.html\')" style="margin-top:20px;background:#10b981;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-size:12px;font-weight:700;cursor:pointer;font-family:\'DM Sans\',sans-serif">Back to Login</button>' +
    '</div></div>'
  );
}

function _showAccessDenied(email, leagueName, actualRole) {
  const roleNote = actualRole
    ? 'You are registered as a <strong>' + _esc(_normalizeRole(actualRole)) + '</strong>. Commissioner tools require commissioner or co-commissioner access.'
    : 'You are not a member of this league.';
  _renderInto(document.body,
    '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:\'DM Sans\',sans-serif;color:#e2e8f0;background:#0b1120;padding:24px">' +
    '<div style="max-width:520px;text-align:center">' +
    '<div style="font-size:28px;font-weight:800;margin-bottom:16px">&#128274; Access Denied</div>' +
    '<div style="font-size:13px;color:#94a3b8;line-height:1.7;margin-bottom:8px">Signed in as <strong>' + _esc(email) + '</strong> on <strong>' + _esc(leagueName) + '</strong>.</div>' +
    '<div style="font-size:13px;color:#94a3b8;line-height:1.7">' + roleNote + '</div>' +
    '<div style="margin-top:24px;display:flex;gap:10px;justify-content:center">' +
    '<button onclick="commLogout()" style="background:rgba(255,255,255,0.06);color:#e2e8f0;border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:10px 20px;font-size:12px;font-weight:700;cursor:pointer;font-family:\'DM Sans\',sans-serif">Sign Out</button>' +
    '<button onclick="window.location.replace(\'./dashboard.html\')" style="background:#10b981;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:12px;font-weight:700;cursor:pointer;font-family:\'DM Sans\',sans-serif">Go to Dashboard</button>' +
    '</div></div></div>'
  );
}
