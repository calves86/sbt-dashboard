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
}
