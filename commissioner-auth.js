/* ===== commissioner-auth.js — Role-based auth for Commissioner Tools =====
 *
 * How it works (static site):
 *  - Each league has a data/auth-{league}.js file with user names + SHA-256 PIN hashes
 *  - On page load, checkAuth() looks for a valid sessionStorage session
 *  - If none, showLoginModal() is displayed — user picks their name, enters PIN
 *  - PIN is hashed client-side (Web Crypto SHA-256) and compared to stored hash
 *  - On match, session is saved to sessionStorage (clears when browser closes)
 *  - Role controls which tabs are visible:
 *      commissioner     → all tabs
 *      co-commissioner  → Hub, Rosters, Transactions, Adjustments (no Settings)
 *
 * To upgrade for 2026 launch:
 *  - Replace checkAuth/login/logout with real JWT calls to your backend
 *  - Keep the rest of the page logic unchanged
 *
 * To change a PIN:
 *  - Open browser console on any page and run:
 *      crypto.subtle.digest('SHA-256', new TextEncoder().encode('yourpin'))
 *        .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
 *  - Paste the result into data/auth-{league}.js as the pin_hash value
 * ===================================================================== */

const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours

/* SHA-256 via Web Crypto (built into all modern browsers) */
async function _sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function _getCfg() {
  return window.COMM_AUTH || null;
}

/* Returns the stored session object or null */
function getSession() {
  const cfg = _getCfg();
  if (!cfg) return null;
  try {
    const raw = sessionStorage.getItem(cfg.leagueKey);
    if (!raw) return null;
    const sess = JSON.parse(raw);
    if (!sess.ts || Date.now() - sess.ts > SESSION_MAX_AGE_MS) {
      sessionStorage.removeItem(cfg.leagueKey);
      return null;
    }
    return sess;
  } catch { return null; }
}

/* Attempt login — returns true on success */
async function commLogin(userId, pin) {
  const cfg = _getCfg();
  if (!cfg) return false;
  const user = cfg.users.find(u => u.id === userId);
  if (!user) return false;
  const hash = await _sha256(String(pin));
  if (hash !== user.pin_hash) return false;
  sessionStorage.setItem(cfg.leagueKey, JSON.stringify({
    userId, name: user.name, role: user.role, ts: Date.now()
  }));
  return true;
}

/* Clear session and reload */
function commLogout() {
  const cfg = _getCfg();
  if (cfg) sessionStorage.removeItem(cfg.leagueKey);
  location.reload();
}

/* Inject the login modal and block the page until authenticated */
function showLoginModal(onSuccess) {
  const cfg = _getCfg();
  if (!cfg) { onSuccess(null); return; } // no config = open access

  // Darken page
  document.body.style.overflow = 'hidden';

  const overlay = document.createElement('div');
  overlay.id = 'comm-login-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    background:rgba(7,11,24,0.97);
    display:flex;align-items:center;justify-content:center;padding:20px
  `;

  const userOptions = cfg.users.map(u =>
    `<option value="${u.id}">${u.name} — ${_roleLabel(u.role)}</option>`
  ).join('');

  overlay.innerHTML = `
    <div style="width:100%;max-width:380px">
      <div style="text-align:center;margin-bottom:28px">
        <div style="font-size:36px;font-weight:800;font-family:'Bebas Neue',sans-serif;letter-spacing:2px;color:#f1f5f9">Commissioner Tools</div>
        <div style="font-size:13px;color:#475569;margin-top:4px">${cfg.leagueName || 'Fantasy Football'}</div>
      </div>
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px 24px">
        <div style="font-size:10px;font-weight:800;letter-spacing:1.5px;color:#334155;text-transform:uppercase;margin-bottom:8px">Who are you?</div>
        <select id="comm-user-sel" style="width:100%;background:#0d1526;border:1px solid rgba(255,255,255,0.1);color:#e2e8f0;padding:10px 14px;border-radius:8px;font-size:13px;font-family:'DM Sans',sans-serif;font-weight:600;outline:none;margin-bottom:18px;cursor:pointer">
          <option value="">Select your name...</option>
          ${userOptions}
        </select>
        <div style="font-size:10px;font-weight:800;letter-spacing:1.5px;color:#334155;text-transform:uppercase;margin-bottom:8px">PIN</div>
        <input id="comm-pin-input" type="password" inputmode="numeric" maxlength="10" placeholder="Enter your PIN"
          style="width:100%;background:#0d1526;border:1px solid rgba(255,255,255,0.1);color:#e2e8f0;padding:10px 14px;border-radius:8px;font-size:16px;font-family:'DM Sans',sans-serif;outline:none;letter-spacing:4px;margin-bottom:6px"
          onkeydown="if(event.key==='Enter')document.getElementById('comm-login-btn').click()">
        <div id="comm-login-err" style="font-size:11px;color:#ef4444;min-height:18px;margin-bottom:12px"></div>
        <button id="comm-login-btn"
          style="width:100%;background:#10b981;border:none;color:#0b1120;font-size:14px;font-weight:800;padding:13px;border-radius:10px;cursor:pointer;font-family:'DM Sans',sans-serif;letter-spacing:.5px;transition:opacity .15s"
          onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'"
          onclick="handleCommLogin()">Access Commissioner Tools</button>
      </div>
      <div style="text-align:center;margin-top:16px;font-size:11px;color:#1e293b">
        Session expires when you close this browser tab
      </div>
    </div>`;

  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('comm-pin-input')?.focus(), 100);

  window.handleCommLogin = async function() {
    const userId = document.getElementById('comm-user-sel').value;
    const pin    = document.getElementById('comm-pin-input').value;
    const errEl  = document.getElementById('comm-login-err');
    const btn    = document.getElementById('comm-login-btn');

    if (!userId) { errEl.textContent = 'Please select your name.'; return; }
    if (!pin)    { errEl.textContent = 'Please enter your PIN.';  return; }

    btn.textContent = 'Verifying...';
    btn.style.opacity = '.6';
    btn.style.pointerEvents = 'none';
    errEl.textContent = '';

    const ok = await commLogin(userId, pin);
    if (ok) {
      overlay.remove();
      document.body.style.overflow = '';
      onSuccess(getSession());
    } else {
      errEl.textContent = 'Incorrect PIN. Try again.';
      document.getElementById('comm-pin-input').value = '';
      btn.textContent = 'Access Commissioner Tools';
      btn.style.opacity = '1';
      btn.style.pointerEvents = '';
      document.getElementById('comm-pin-input').focus();
    }
  };
}

/* Check existing session or show login */
function initAuth(onSuccess) {
  const session = getSession();
  if (session) {
    onSuccess(session);
  } else {
    // Wait for DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => showLoginModal(onSuccess));
    } else {
      showLoginModal(onSuccess);
    }
  }
}

/* Inject the logged-in user badge into the page header */
function renderUserBadge(session) {
  if (!session) return;
  const hdr = document.getElementById('page-header');
  if (!hdr) return;
  const badge = document.createElement('div');
  badge.style.cssText = 'display:flex;align-items:center;gap:10px;margin-top:8px';
  badge.innerHTML = `
    <span style="font-size:11px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.25);color:#10b981;padding:3px 10px;border-radius:20px;font-weight:700">
      ${_roleIcon(session.role)} ${session.name} &nbsp;&middot;&nbsp; ${_roleLabel(session.role)}
    </span>
    <button onclick="commLogout()" style="font-size:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:#475569;padding:3px 10px;border-radius:20px;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:700;transition:all .15s" onmouseover="this.style.color='#e2e8f0'" onmouseout="this.style.color='#475569'">Sign Out</button>`;
  hdr.appendChild(badge);
}

/* Apply role-based tab visibility */
function applyRolePermissions(session) {
  if (!session) return;
  // co-commissioner: hide Settings tab
  if (session.role === 'co-commissioner') {
    document.querySelectorAll('#tab-bar .tab-btn').forEach(btn => {
      if (btn.textContent.includes('Settings')) btn.style.display = 'none';
    });
    // Also hide the settings panel in case it was active
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
