/* ===== leftnav.js — Shared vertical navigation for SBT Dashboard ===== */

/**
 * initLeftNav(activePage, opts)
 *   activePage : filename of current page e.g. 'team.html'
 *   opts       : { leagueName, leagueSub, logo, footerText, includeTeamList }
 */
function initLeftNav(activePage, opts) {
  opts = opts || {};
  const nav = document.getElementById('leftnav');
  if (!nav) return;

  // Restore collapse state
  if (localStorage.getItem('ln-collapsed') === '1') {
    document.body.classList.add('nav-col');
  }

  nav.innerHTML = _buildNavHTML(activePage, opts);

  // Archive expand/collapse
  const archiveToggle = document.getElementById('ln-archive-toggle');
  if (archiveToggle) archiveToggle.addEventListener('click', lnToggleArchive);

  // Collapse button
  const colBtn = document.getElementById('ln-collapse-btn');
  if (colBtn) {
    colBtn.addEventListener('click', lnToggleCollapse);
    if (document.body.classList.contains('nav-col')) {
      colBtn.innerHTML = '<span>&#9654;</span><span>Expand</span>';
    }
  }
}

function _buildNavHTML(activePage, opts) {
  const logo      = opts.logo       || 'sbt-logo.png';
  const lName     = opts.leagueName || 'SBT Fantasy';
  const lSub      = opts.leagueSub  || 'Sigma Beta Tau';
  const footer    = opts.footerText || 'SBT &middot; 2025';
  const teamList  = opts.includeTeamList;

  const items = [
    { href: 'index.html',        icon: '&#127968;', label: 'Dashboard'     },
    { href: 'team.html',         icon: '&#128101;', label: 'My Teams'      },
    { href: 'transactions.html', icon: '&#128257;', label: 'Activity'      },
    { href: 'players.html',      icon: '&#10133;',  label: 'Free Agents'   },
    { href: 'trade.html',        icon: '&#8652;',   label: 'Trade Builder' },
    { href: 'mock-draft.html',   icon: '&#127919;', label: 'Mock Draft', badge: 'NEW' },
  ];

  let html = `
    <div class="ln-brand">
      <img src="${logo}" class="ln-logo" alt="Logo" onerror="this.style.display='none'">
      <div class="ln-brand-text">
        <div class="ln-league-name">${lName}</div>
        <div class="ln-league-sub">${lSub}</div>
      </div>
    </div>
    <div class="ln-section">2025 Season</div>`;

  items.forEach(item => {
    const active = activePage === item.href;
    html += `
    <a href="${item.href}" class="ln-item${active ? ' active' : ''}">
      <span class="ln-icon">${item.icon}</span>
      <span>${item.label}</span>
      ${item.badge ? `<span class="ln-badge">${item.badge}</span>` : ''}
    </a>`;
  });

  html += `
    <div class="ln-divider"></div>
    <div class="ln-section">History</div>
    <button class="ln-item hist" id="ln-archive-toggle" type="button">
      <span class="ln-icon">&#127942;</span>
      <span>Season Archive</span>
      <span class="ln-chev" id="ln-archive-chev">&#9660;</span>
    </button>
    <div id="ln-archive-years">`;

  ['2025','2024','2023','2022','2021','2020','2019'].forEach(y => {
    html += `<div class="ln-sub">${y} Season</div>`;
  });

  html += `
    </div>
    <a href="#" class="ln-item hist"><span class="ln-icon">&#128200;</span><span>All-Time Stats</span></a>
    <a href="#" class="ln-item hist"><span class="ln-icon">&#128081;</span><span>Champions</span></a>`;

  if (teamList) {
    html += `
    <div class="ln-divider"></div>
    <div class="ln-team-section">Teams</div>
    <div id="team-list"></div>`;
  }

  html += `
    <div class="ln-spacer"></div>
    <button id="ln-collapse-btn" type="button">
      <span>&#9664;</span>
      <span>Collapse</span>
    </button>
    <div class="ln-footer">${footer}</div>`;

  return html;
}

let _archiveOpen = true;
function lnToggleArchive() {
  _archiveOpen = !_archiveOpen;
  const el = document.getElementById('ln-archive-years');
  const chev = document.getElementById('ln-archive-chev');
  if (el) el.style.display = _archiveOpen ? '' : 'none';
  if (chev) chev.style.transform = _archiveOpen ? '' : 'rotate(-90deg)';
}

function lnToggleCollapse() {
  const col = document.body.classList.toggle('nav-col');
  localStorage.setItem('ln-collapsed', col ? '1' : '0');
  const btn = document.getElementById('ln-collapse-btn');
  if (btn) btn.innerHTML = col
    ? '<span>&#9654;</span><span>Expand</span>'
    : '<span>&#9664;</span><span>Collapse</span>';
}

function lnToggleMobile() {
  document.getElementById('leftnav')?.classList.toggle('open');
}
