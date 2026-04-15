/* ===== ngs-popup.js — NGS Charts section for player popups ===== */

const _NGS_WEEK_ORDER = [
  ...Array.from({length:18},(_,i)=>`REG_${String(i+1).padStart(2,'0')}`),
  'POST_WC','POST_DIV','POST_CONF','POST_SB'
];
const _NGS_WEEK_LABELS = {
  POST_WC:'Wild Card', POST_DIV:'Divisional', POST_CONF:'Conference', POST_SB:'Super Bowl'
};

/**
 * Build the HTML for an NGS Charts section inside a player popup.
 * Returns an empty string if no charts exist for the player.
 */
function buildNgsChartsSection(playerName) {
  const data = window.NGS_CHARTS;
  if (!data) return '';

  // Collect charts for this player across all weeks, in calendar order
  const byWeek = {};
  for (const wk of _NGS_WEEK_ORDER) {
    if (!data[wk]) continue;
    const found = data[wk].filter(c => c.player === playerName);
    if (found.length) byWeek[wk] = found;
  }
  const weeks = _NGS_WEEK_ORDER.filter(wk => byWeek[wk]);
  if (!weeks.length) return '';

  // Week selector pills
  const pillsHtml = weeks.map((wk, i) => {
    const lbl = _NGS_WEEK_LABELS[wk] || `Wk ${parseInt(wk.split('_')[1])}`;
    return `<button class="ngs-wk-pill${i===0?' on':''}" onclick="pmNgsWeek(this,'pm-ngs-${wk}')">${lbl}</button>`;
  }).join('');

  // Chart panels — one per week
  const panelsHtml = weeks.map((wk, i) => {
    const cards = byWeek[wk].map(c => {
      const img   = c.img_md || c.img_sm || '';
      const typeL = c.type==='route'?'Route Tree':c.type==='pass'?'Pass Chart':'Rush Chart';
      let stats = '';
      if      (c.type==='route')  stats = `${c.rec??'—'} rec &middot; ${c.yds??'—'} yds &middot; ${c.td??'—'} TD`;
      else if (c.type==='pass')   stats = `${c.cmp??'—'}/${c.att??'—'} cmp &middot; ${c.yds??'—'} yds &middot; ${c.td??'—'} TD &middot; ${c.rtg??'—'} RTG`;
      else if (c.type==='carry')  stats = `${c.att??'—'} car &middot; ${c.yds??'—'} yds &middot; ${c.td??'—'} TD`;
      const lg = (c.img_lg||c.img_md||c.img_sm||'').replace(/'/g,"\\'");
      const nm = playerName.replace(/'/g,"\\'");
      const tl = typeL.replace(/'/g,"\\'");
      return `<div class="ngs-card" onclick="pmOpenNgsLightbox('${lg}','${nm}','${tl}')">
        <div class="ngs-type-lbl">${typeL}</div>
        ${img?`<img src="${img}" class="ngs-card-img" loading="lazy" alt="${typeL}">`:'<div class="ngs-card-no-img">No image</div>'}
        <div class="ngs-stats-line">${stats}</div>
      </div>`;
    }).join('');
    return `<div id="pm-ngs-${wk}" class="pm-ngs-panel"${i>0?' style="display:none"':''}>
      <div class="ngs-card-row">${cards}</div>
    </div>`;
  }).join('');

  return `<div class="modal-section ngs-charts-section">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div class="modal-section-title" style="margin-bottom:0">NGS CHARTS <span style="font-size:9px;color:#334155;font-weight:400;letter-spacing:.5px">2025</span></div>
    </div>
    <div class="ngs-wk-pills">${pillsHtml}</div>
    ${panelsHtml}
  </div>`;
}

/** Switch the active week panel inside a player popup. */
function pmNgsWeek(btn, panelId) {
  btn.parentElement.querySelectorAll('.ngs-wk-pill').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  const target = document.getElementById(panelId);
  if (!target) return;
  target.parentElement.querySelectorAll('.pm-ngs-panel').forEach(p => {
    p.style.display = p.id === panelId ? '' : 'none';
  });
}

/** Open a full-screen lightbox for an NGS chart image. */
function pmOpenNgsLightbox(imgUrl, name, type) {
  const existing = document.getElementById('pm-ngs-lb');
  if (existing) existing.remove();
  if (!imgUrl) return;
  const lb = document.createElement('div');
  lb.id = 'pm-ngs-lb';
  lb.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.93);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:20px';
  lb.innerHTML = `<div style="max-width:min(600px,90vw);text-align:center" onclick="event.stopPropagation()">
    <img src="${imgUrl}" style="width:100%;border-radius:10px;box-shadow:0 0 60px rgba(0,0,0,0.6)" alt="${type}">
    <div style="margin-top:12px;color:#94a3b8;font-size:13px;font-weight:700">${name}</div>
    <div style="margin-top:4px;color:#475569;font-size:11px;letter-spacing:.5px;text-transform:uppercase">${type}</div>
    <div style="margin-top:10px;color:#334155;font-size:10px">Press Esc or click outside to close</div>
  </div>`;
  lb.onclick = () => lb.remove();
  document.body.appendChild(lb);
}

// Close lightbox on Escape (attaches once)
(function() {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const lb = document.getElementById('pm-ngs-lb');
      if (lb) { lb.remove(); e.stopPropagation(); }
    }
  });
})();
