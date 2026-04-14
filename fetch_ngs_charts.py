#!/usr/bin/env python3
"""
fetch_ngs_charts.py [year] [year2 ...]
Fetches NGS spray/route/pass charts via the NFL NGS API.
Outputs data/ngs_charts_{year}.js — window.NGS_CHARTS = { "REG_01": [...], ... }

Usage:
  python fetch_ngs_charts.py 2025
  python fetch_ngs_charts.py 2025 2024 2023 2022 2021 2020 2019
"""

import json, os, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from math import ceil

BASE = "https://nextgenstats.nfl.com"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://nextgenstats.nfl.com/',
    'Origin': 'https://nextgenstats.nfl.com',
}
PAGE_SIZE = 17   # API returns fixed 17 per page regardless of limit param
OUT_DIR = os.path.join(os.path.dirname(__file__), 'data')

TEAM_MAP = {
    '3800': 'ARI', '0200': 'ATL', '0325': 'BAL', '0610': 'BUF', '0750': 'CAR',
    '0810': 'CHI', '0920': 'CIN', '1050': 'CLE', '1200': 'DAL', '1400': 'DEN',
    '1540': 'DET', '1800': 'GB',  '2120': 'HOU', '2200': 'IND', '2250': 'JAX',
    '2310': 'KC',  '4400': 'LAC', '2510': 'LAR', '2520': 'LV',  '2700': 'MIA',
    '3000': 'MIN', '3200': 'NE',  '3300': 'NO',  '3410': 'NYG', '3430': 'NYJ',
    '3700': 'PHI', '3900': 'PIT', '4600': 'SEA', '4500': 'SF',  '4900': 'TB',
    '2100': 'TEN', '5110': 'WAS',
}


def fetch_json(url, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            resp = urllib.request.urlopen(req, timeout=15)
            return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            return None
        except Exception:
            if attempt < retries - 1:
                time.sleep(1)
                continue
            return None
    return None


def fix_url(u):
    """Add https: if URL starts with //"""
    if u and u.startswith('//'):
        return 'https:' + u
    return u


def transform_chart(c):
    """Strip API-internal fields, normalize URLs, flatten stats."""
    chart_type = c.get('type', '')
    row = {
        'player':  c.get('playerName', ''),
        'esbId':   c.get('esbId', ''),
        'pos':     c.get('position', ''),
        'team':    TEAM_MAP.get(str(c.get('teamId', '')), ''),
        'type':    chart_type,
        'week':    c.get('week', ''),
        'img_sm':  fix_url(c.get('smallImg', '')),
        'img_md':  fix_url(c.get('mediumImg', '')),
        'img_lg':  fix_url(c.get('extraLargeImg', '')),
    }
    # Type-specific stats
    if chart_type == 'route':
        row['rec']  = c.get('receptions', 0)
        row['yds']  = c.get('receivingYards', 0)
        row['td']   = c.get('touchdowns', 0)
    elif chart_type == 'pass':
        row['att']  = c.get('attempts', 0)
        row['cmp']  = c.get('completions', 0)
        row['yds']  = c.get('passingYards', 0)
        row['td']   = c.get('touchdowns', 0)
        row['int']  = c.get('interceptions', 0)
        row['rtg']  = round(c.get('passerRating', 0), 1)
    elif chart_type == 'carry':
        row['att']  = c.get('carries', 0)
        row['yds']  = c.get('rushingYards', 0)
        row['td']   = c.get('touchdowns', 0)
    return row


def fetch_all_charts_for_week(year, season_type, week_num):
    """Paginate through all charts for a given week."""
    all_charts = []
    offset = 0
    url_base = (f"{BASE}/api/content/microsite/chart"
                f"?season={year}&seasonType={season_type}&week={week_num}&type=all")
    # First call to get total
    first = fetch_json(f"{url_base}&offset=0")
    if not first or not first.get('charts'):
        return []
    total = first.get('total', 0)
    all_charts.extend(first['charts'])
    # Subsequent pages
    pages = ceil(total / PAGE_SIZE)
    for page in range(1, pages):
        offset = page * PAGE_SIZE
        data = fetch_json(f"{url_base}&offset={offset}")
        if data and data.get('charts'):
            all_charts.extend(data['charts'])
    return [transform_chart(c) for c in all_charts]


def week_key(season_type, week_num):
    if season_type == 'REG':
        return f"REG_{int(week_num):02d}"
    post_map = {19: 'POST_WC', 20: 'POST_DIV', 21: 'POST_CONF', 23: 'POST_SB',
                18: 'POST_WC', 22: 'POST_SB'}  # pre-2021: WC=18, SB=22
    return post_map.get(int(week_num), f"POST_{week_num}")


def playoff_weeks(year):
    """Return (season_type, week_num, label) tuples for playoff rounds."""
    y = int(year)
    if y >= 2021:
        # 18-week season: WC=19, DIV=20, CONF=21, SB=23 (22=Pro Bowl)
        return [('POST', 19, 'Wild Card'), ('POST', 20, 'Divisional'),
                ('POST', 21, 'Conference'), ('POST', 23, 'Super Bowl')]
    else:
        # 17-week season: WC=18, DIV=19, CONF=20, SB=22 (21=Pro Bowl)
        return [('POST', 18, 'Wild Card'), ('POST', 19, 'Divisional'),
                ('POST', 20, 'Conference'), ('POST', 22, 'Super Bowl')]


def fetch_year(year):
    year = str(year)
    reg_weeks = 18 if int(year) >= 2021 else 17
    result = {}
    post_weeks = playoff_weeks(year)

    print(f"\n{'='*55}")
    print(f"  Charts Year: {year}  ({reg_weeks} REG + 4 POST weeks)")
    print(f"{'='*55}")

    all_tasks = (
        [('REG', wk) for wk in range(1, reg_weeks + 1)] +
        [(stype, wnum) for stype, wnum, _ in post_weeks]
    )
    label_map = {('POST', wnum): lbl for stype, wnum, lbl in post_weeks}

    def _fetch(args):
        stype, wk = args
        charts = fetch_all_charts_for_week(year, stype, wk)
        return stype, wk, charts

    with ThreadPoolExecutor(max_workers=6) as ex:
        futs = {ex.submit(_fetch, t): t for t in all_tasks}
        for fut in as_completed(futs):
            stype, wk, charts = fut.result()
            if charts:
                key = week_key(stype, wk)
                result[key] = charts
                route = sum(1 for c in charts if c['type'] == 'route')
                pass_ = sum(1 for c in charts if c['type'] == 'pass')
                carry = sum(1 for c in charts if c['type'] == 'carry')
                label = label_map.get((stype, wk), f"Week {wk}")
                print(f"  {label:12s}: {len(charts):3d} charts  "
                      f"(route={route} pass={pass_} carry={carry})")
            else:
                label = label_map.get((stype, wk), f"Week {wk}")
                print(f"  {label:12s}: 0 charts")

    total = sum(len(v) for v in result.values())
    print(f"\n  Total: {total} charts across {len(result)} weeks")

    os.makedirs(OUT_DIR, exist_ok=True)
    js_file = os.path.join(OUT_DIR, f'ngs_charts_{year}.js')
    compact = json.dumps(result, ensure_ascii=False, separators=(',', ':'))
    with open(js_file, 'w', encoding='utf-8') as f:
        f.write('window.NGS_CHARTS=' + compact + ';')
    print(f"  Wrote {js_file} ({len(compact)//1024} KB)")


def main():
    years = sys.argv[1:] if len(sys.argv) > 1 else ['2025']
    for year in years:
        fetch_year(year)
    print("\nDone.")


if __name__ == '__main__':
    main()
