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

  // Archive expand/collapse (start collapsed by default in nav)
  const archiveToggle = document.getElementById('ln-archive-toggle');
  if (archiveToggle) archiveToggle.addEventListener('click', lnToggleArchive);
  // Start archive collapsed
  const archiveYears = document.getElementById('ln-archive-years');
  const archiveChev  = document.getElementById('ln-archive-chev');
  if (archiveYears) archiveYears.style.display = 'none';
  if (archiveChev)  archiveChev.style.transform = 'rotate(-90deg)';
  _archiveOpen = false;

  // Collapse button
  const colBtn = document.getElementById('ln-collapse-btn');
  if (colBtn) {
    colBtn.addEventListener('click', lnToggleCollapse);
    if (document.body.classList.contains('nav-col')) {
      colBtn.innerHTML = '<span>&#9654;</span><span>Expand</span>';
    }
  }

  // Overlay backdrop — tap outside to close nav on mobile
  if (!document.getElementById('ln-overlay')) {
    const ov = document.createElement('div');
    ov.id = 'ln-overlay';
    ov.onclick = lnToggleMobile;
    document.body.appendChild(ov);
  }

  // Bottom tab nav — mobile only (shown via CSS)
  if (!document.getElementById('bottom-nav')) {
    const bn = document.createElement('nav');
    bn.id = 'bottom-nav';
    bn.innerHTML = _buildBottomNavHTML(activePage);
    document.body.appendChild(bn);
  }
}

function _buildNavHTML(activePage, opts) {
  const logo     = opts.logo       || 'sbt-logo.png';
  const lName    = opts.leagueName || 'SBT Fantasy';
  const lSub     = opts.leagueSub  || 'Sigma Beta Tau';
  const footer   = opts.footerText || 'SBT &middot; 2025';
  const teamList = opts.includeTeamList;

  // Current-season nav items
  const season = [
    { href: 'dashboard.html',    label: 'Dashboard'     },
    { href: 'matchup.html',      label: 'Matchups'      },
    { href: 'team.html',         label: 'My Teams'      },
    { href: 'standings.html',    label: 'Standings'     },
    { href: 'transactions.html', label: 'Activity'      },
    { href: 'players.html',      label: 'Free Agents'   },
    { href: 'trade.html',        label: 'Trade Builder' },
    { href: 'playoff.html',      label: 'Playoffs'      },
    { href: 'index.html?tab=Rules', label: 'Rules'         },
    { href: 'commissioner.html',   label: 'Commissioner',  badge: 'NEW' },
  ];

  // Stats nav items
  const stats = [
    { href: 'index.html?tab=Player+Stats', label: 'Player Stats'   },
    { href: 'ngs-stats.html',              label: 'Next Gen Stats', badge: 'NEW' },
    { href: 'ngs-charts.html',             label: 'NGS Charts',     badge: 'NEW' },
  ];

  // Draft nav items
  const draft = [
    { href: 'mock-draft.html',  label: 'Mock Draft'  },
    { href: 'draft-room.html',  label: 'Draft Room', badge: 'SOON' },
  ];

  // History nav items — all route to index.html with a ?tab= param
  const history = [
    { href: 'index.html?tab=Overview',      label: 'All-Time Stats'   },
    { href: 'index.html?tab=Champions',     label: 'Champions'        },
    { href: 'index.html?tab=Teams',         label: 'Franchise History'},
    { href: 'index.html?tab=Record+Book',   label: 'Record Book'      },
    { href: 'index.html?tab=Draft+History', label: 'Draft History'    },
  ];

  // Archive years — link to index.html with ?year=
  const years = ['2025','2024','2023','2022','2021','2020','2019'];

  // Determine active — strip any query string for page matching
  const activePage2 = activePage.split('?')[0];

  let html = `
    <div class="ln-brand">
      <img src="${logo}" class="ln-logo" alt="Logo" onerror="this.style.display='none'">
      <div class="ln-brand-text">
        <div class="ln-league-name">${lName}</div>
        <div class="ln-league-sub">${lSub}</div>
      </div>
    </div>
    <div class="ln-section">2025 Season</div>`;

  season.forEach(item => {
    const active = activePage2 === item.href;
    html += `
    <a href="${item.href}" class="ln-item${active ? ' active' : ''}">
      <span>${item.label}</span>
    </a>`;
  });

  html += `
    <div class="ln-divider"></div>
    <div class="ln-section">Stats</div>`;

  stats.forEach(item => {
    const active = activePage === item.href || activePage2 === item.href;
    html += `
    <a href="${item.href}" class="ln-item${active ? ' active' : ''}">
      <span>${item.label}</span>
      ${item.badge ? `<span class="ln-badge">${item.badge}</span>` : ''}
    </a>`;
  });

  html += `
    <div class="ln-divider"></div>
    <div class="ln-section">Draft</div>`;

  draft.forEach(item => {
    const active = activePage2 === item.href;
    html += `
    <a href="${item.href}" class="ln-item${active ? ' active' : ''}">
      <span>${item.label}</span>
      ${item.badge ? `<span class="ln-badge">${item.badge}</span>` : ''}
    </a>`;
  });

  html += `
    <div class="ln-divider"></div>
    <div class="ln-section">History</div>`;

  history.forEach(item => {
    const active = activePage === item.href;
    html += `
    <a href="${item.href}" class="ln-item hist${active ? ' active' : ''}">
      <span>${item.label}</span>
    </a>`;
  });

  // Season Archive expandable
  html += `
    <button class="ln-item hist" id="ln-archive-toggle" type="button">
      <span>Season Archive</span>
      <span class="ln-chev" id="ln-archive-chev">&#9660;</span>
    </button>
    <div id="ln-archive-years">`;

  years.forEach(y => {
    html += `<a href="index.html?year=${y}" class="ln-sub">${y} Season</a>`;
  });

  html += `</div>`;

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

let _archiveOpen = false;
function lnToggleArchive() {
  _archiveOpen = !_archiveOpen;
  const el   = document.getElementById('ln-archive-years');
  const chev = document.getElementById('ln-archive-chev');
  if (el)   el.style.display     = _archiveOpen ? '' : 'none';
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
  document.getElementById('ln-overlay')?.classList.toggle('show');
}

function _buildBottomNavHTML(activePage) {
  const ap = activePage.split('?')[0];

  const IC = {
    home:      '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    matchup:   '<svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    team:      '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    standings: '<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    more:      '<svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  };

  const tabs = [
    { href: 'dashboard.html',  label: 'Home',      icon: IC.home      },
    { href: 'matchup.html',    label: 'Matchup',   icon: IC.matchup   },
    { href: 'team.html',       label: 'My Team',   icon: IC.team      },
    { href: 'standings.html',  label: 'Standings', icon: IC.standings },
  ];

  let html = tabs.map(t =>
    `<a href="${t.href}" class="bn-tab${ap === t.href ? ' active' : ''}">${t.icon}<span class="bn-label">${t.label}</span></a>`
  ).join('');

  html += `<button class="bn-tab" onclick="lnToggleMobile()" type="button">${IC.more}<span class="bn-label">More</span></button>`;

  return html;
}
