import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', encoding='utf-8') as f:
    html = f.read()

old = (
    '    f.rows.forEach((r,i)=>{\n'
    '      const res=getResult(r.team_name,r.season);\n'
    '      const rc=res.includes(\'Champion\')?\'#f59e0b\':res.includes(\'Runner\')?\'#94a3b8\':res.includes(\'3rd\')?\'#cd7f32\':res.includes(\'Booty\')?\'#10b981\':res.includes(\'Biggest\')?\'#ef4444\':\'#64748b\';\n'
    '      html+=`<div style="display:grid;grid-template-columns:55px 185px 170px 80px 80px 80px 145px;align-items:center;padding:10px 16px;${i%2===0?\'background:rgba(255,255,255,0.02)\':\'\'}">\n'
    '        <div style="font-size:13px;font-weight:700;color:#64748b">${r.season}</div>\n'
    '        <div style="font-size:13px;font-weight:600;color:#f1f5f9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.team_name}</div>\n'
    '        <div style="font-size:12px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.owner||\'\'}</div>\n'
    '        <div style="font-size:13px;color:#94a3b8;text-align:center">${r.wins}-${r.losses}${r.ties>0?\'-\'+r.ties:\'\'}</div>\n'
    '        <div style="font-size:13px;color:#10b981;text-align:right;font-weight:600">${r.points_for>0?r.points_for.toFixed(1):\'—\'}</div>\n'
    '        <div style="font-size:13px;color:#64748b;text-align:right">${r.points_against>0?r.points_against.toFixed(1):\'—\'}</div>\n'
    '        <div style="font-size:12px;color:${rc};font-weight:${res?\'600\':\'400\'}">${res||\'—\'}</div>\n'
    '      </div>`;\n'
    '    });'
)

new = (
    '    f.rows.forEach((r,i)=>{\n'
    '      const res=getResult(r.team_name,r.season);\n'
    '      const rc=res.includes(\'Champion\')?\'#f59e0b\':res.includes(\'Runner\')?\'#94a3b8\':res.includes(\'3rd\')?\'#cd7f32\':res.includes(\'Booty\')?\'#10b981\':res.includes(\'Biggest\')?\'#ef4444\':\'#64748b\';\n'
    '      const roster=findRoster(r.season,r.team_name);\n'
    '      const expanded=state.teamsRosterYear===r.season;\n'
    '      const rowBg=expanded?\'background:rgba(16,185,129,0.06);border-left:3px solid rgba(16,185,129,0.4)\':i%2===0?\'background:rgba(255,255,255,0.02)\':\'\' ;\n'
    '      html+=`<div onclick="${roster?`state.teamsRosterYear=${expanded?\'null\':r.season};render()`:\'\'}" style="display:grid;grid-template-columns:55px 185px 170px 80px 80px 80px 145px;align-items:center;padding:10px 16px;${rowBg}${roster?\';cursor:pointer\':\'\'}">\n'
    '        <div style="font-size:13px;font-weight:700;color:${expanded?\'#10b981\':\'#64748b\'}">${r.season}</div>\n'
    '        <div style="font-size:13px;font-weight:600;color:#f1f5f9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.team_name}</div>\n'
    '        <div style="font-size:12px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.owner||\'\'}</div>\n'
    '        <div style="font-size:13px;color:#94a3b8;text-align:center">${r.wins}-${r.losses}${r.ties>0?\'-\'+r.ties:\'\'}</div>\n'
    '        <div style="font-size:13px;color:#10b981;text-align:right;font-weight:600">${r.points_for>0?r.points_for.toFixed(1):\'—\'}</div>\n'
    '        <div style="font-size:13px;color:#64748b;text-align:right">${r.points_against>0?r.points_against.toFixed(1):\'—\'}</div>\n'
    '        <div style="font-size:12px;color:${rc};font-weight:${res?\'600\':\'400\'};display:flex;align-items:center;justify-content:space-between;gap:4px"><span>${res||\'—\'}</span>${roster?`<span style="font-size:10px;color:#475569;flex-shrink:0">${expanded?\'▲ hide\':\'▼ roster\'}</span>`:\'\'}</div>\n'
    '      </div>`;\n'
    '      if(expanded&&roster)html+=rosterPanel(roster);\n'
    '    });'
)

if old in html:
    html = html.replace(old, new, 1)
    print('Updated year rows with roster drill-down')
else:
    print('ERROR: pattern not found — checking nearby text...')
    idx = html.find('f.rows.forEach')
    if idx >= 0:
        print('Found f.rows.forEach at:', idx)
        print(repr(html[idx:idx+400]))

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Done')
