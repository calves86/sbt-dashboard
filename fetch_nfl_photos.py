#!/usr/bin/env python3
"""
fetch_nfl_photos.py
Queries ESPN search API for every unique player in ngs_2025.json.
Outputs data/nfl_photos.js  ->  window.NFL_PHOTOS = { "Player Name": "https://..." }
Also maps team abbreviations to ESPN logo URLs.
"""
import json, time, urllib.request, urllib.parse, re
from pathlib import Path

BASE = Path(__file__).parent
NGS  = BASE / 'data' / 'ngs_2025.json'
OUT  = BASE / 'data' / 'nfl_photos.js'

ESPN_SEARCH = 'https://site.api.espn.com/apis/search/v2?query={q}&sport=football&league=nfl&limit=3'
ESPN_HEAD   = 'https://a.espncdn.com/i/headshots/nfl/players/full/{id}.png'
ESPN_LOGO   = 'https://a.espncdn.com/i/teamlogos/nfl/500-dark/{abbrev}.png'

# NGS abbrev -> ESPN abbrev (most are identical; only note exceptions)
TEAM_FIX = {
    'LV':  'lv',
    'LAR': 'lar',
    'LAC': 'lac',
    'NYG': 'nyg',
    'NYJ': 'nyj',
    'NE':  'ne',
    'NO':  'no',
    'SF':  'sf',
    'TB':  'tb',
    'GB':  'gb',
    'KC':  'kc',
    'WAS': 'was',
}

def espn_team_logo(abbrev):
    a = TEAM_FIX.get(abbrev, abbrev.lower())
    return ESPN_LOGO.format(abbrev=a)

def espn_search(name):
    q = urllib.parse.quote(name)
    url = ESPN_SEARCH.format(q=q)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=8) as r:
            data = json.load(r)
        for group in data.get('results', []):
            if group.get('type') != 'player':
                continue
            for item in group.get('contents', []):
                img = item.get('image', {})
                photo = img.get('default') or img.get('defaultDark')
                if photo and 'headshots/nfl' in photo:
                    return photo
    except Exception as e:
        print(f'  WARN {name}: {e}')
    return None

def collect_players(data):
    """Return set of (player_name, team) tuples from all categories."""
    players = set()
    for cat, weeks in data.items():
        for week, rows in weeks.items():
            for row in rows:
                name = row.get('player') or row.get('qb')
                team = row.get('team', '')
                if name:
                    players.add((name, team))
                recv = row.get('receiver')
                if recv:
                    players.add((recv, team))
    return players

def main():
    with open(NGS, encoding='utf-8') as f:
        data = json.load(f)

    players = sorted(collect_players(data))
    print(f'Found {len(players)} unique players')

    # Load existing cache if available
    cache = {}
    if OUT.exists():
        txt = OUT.read_text(encoding='utf-8')
        m = re.search(r'window\.NFL_PHOTOS\s*=\s*(\{.*?\});', txt, re.DOTALL)
        if m:
            try:
                cache = json.loads(m.group(1))
                print(f'Loaded {len(cache)} cached entries')
            except Exception:
                pass

    photos = dict(cache)
    missing = [(n, t) for n, t in players if n not in photos]
    print(f'Need to fetch {len(missing)} players')

    for i, (name, team) in enumerate(missing):
        url = espn_search(name)
        if url:
            photos[name] = url
            print(f'  [{i+1}/{len(missing)}] {name} -> OK')
        else:
            photos[name] = ''  # mark as not found so we don't retry
            print(f'  [{i+1}/{len(missing)}] {name} -> not found')
        time.sleep(0.15)  # gentle rate limit

    # Build team logo map from all teams in data
    teams = set()
    for cat, weeks in data.items():
        for week, rows in weeks.items():
            for row in rows:
                t = row.get('team')
                if t: teams.add(t)

    team_logos = {t: espn_team_logo(t) for t in sorted(teams)}

    # Write JS
    photos_json = json.dumps(photos, ensure_ascii=False, separators=(',', ':'))
    logos_json  = json.dumps(team_logos, ensure_ascii=False, separators=(',', ':'))
    OUT.write_text(
        f'window.NFL_PHOTOS={photos_json};\nwindow.NFL_TEAM_LOGOS={logos_json};\n',
        encoding='utf-8'
    )

    found = sum(1 for v in photos.values() if v)
    print(f'\nDone: {found}/{len(photos)} players with photos')
    print(f'Team logos: {len(team_logos)} teams')
    print(f'Wrote {OUT}')

if __name__ == '__main__':
    main()
