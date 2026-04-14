#!/usr/bin/env python3
"""
fetch_ngs_api.py [year] [year2 ...]
Fetches NGS stats directly from the NFL NGS API (no Firecrawl needed).
Outputs data/ngs_{year}.js in the same format as parse_ngs.py.

Usage:
  python fetch_ngs_api.py 2024
  python fetch_ngs_api.py 2024 2023 2022 2021 2020 2019

Categories fetched: passing, rushing, receiving,
  fastest_ball_carriers, longest_plays, fastest_sacks,
  longest_tackles, improbable_completions, incredible_yac, remarkable_rushes
"""

import json, os, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE = "https://nextgenstats.nfl.com"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://nextgenstats.nfl.com/',
    'Origin': 'https://nextgenstats.nfl.com',
}

# teamId -> abbreviation (from /api/league/teams)
TEAM_MAP = {
    '3800': 'ARI', '0200': 'ATL', '0325': 'BAL', '0610': 'BUF', '0750': 'CAR',
    '0810': 'CHI', '0920': 'CIN', '1050': 'CLE', '1200': 'DAL', '1400': 'DEN',
    '1540': 'DET', '1800': 'GB',  '2120': 'HOU', '2200': 'IND', '2250': 'JAX',
    '2310': 'KC',  '4400': 'LAC', '2510': 'LAR', '2520': 'LV',  '2700': 'MIA',
    '3000': 'MIN', '3200': 'NE',  '3300': 'NO',  '3410': 'NYG', '3430': 'NYJ',
    '3700': 'PHI', '3900': 'PIT', '4600': 'SEA', '4500': 'SF',  '4900': 'TB',
    '2100': 'TEN', '5110': 'WAS',
}

PLAY_TYPE_MAP = {
    'play_type_pass':   'Pass',
    'play_type_rush':   'Rush',
    'play_type_sack':   'Sack',
    'play_type_penalty':'Penalty',
    'play_type_kickoff':'Kickoff',
    'play_type_punt':   'Punt',
    'play_type_extra_point': 'XP',
    'play_type_field_goal':  'FG',
}

OUT_DIR = os.path.join(os.path.dirname(__file__), 'data')


# ── HTTP ─────────────────────────────────────────────────────────────────────

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


# ── Transformers ──────────────────────────────────────────────────────────────

def team(row):
    return TEAM_MAP.get(str(row.get('teamId', '')), row.get('teamId', ''))


def transform_passing(stats):
    out = []
    for r in stats:
        p = r.get('player', {})
        out.append({
            'player':     r.get('playerName') or p.get('displayName', ''),
            'team':       team(r),
            'tt':         round(r.get('avgTimeToThrow', 0), 2),
            'cay':        round(r.get('avgCompletedAirYards', 0), 2),
            'iay':        round(r.get('avgIntendedAirYards', 0), 2),
            'ayd':        round(r.get('avgAirYardsDifferential', 0), 2),
            'agg_pct':    round(r.get('aggressiveness', 0), 1),
            'lcad':       round(r.get('maxCompletedAirDistance', 0), 1),
            'ayts':       round(r.get('avgAirYardsToSticks', 0), 2),
            'att':        r.get('attempts', 0),
            'yds':        r.get('passYards', 0),
            'td':         r.get('passTouchdowns', 0),
            'int':        r.get('interceptions', 0),
            'rate':       round(r.get('passerRating', 0), 1),
            'comp_pct':   round(r.get('completionPercentage', 0), 1),
            'x_comp_pct': round(r.get('expectedCompletionPercentage', 0), 1),
            'cpoe':       round(r.get('completionPercentageAboveExpectation', 0), 1),
        })
    return out


def transform_rushing(stats):
    out = []
    for r in stats:
        p = r.get('player', {})
        out.append({
            'player':       r.get('playerName') or p.get('displayName', ''),
            'team':         team(r),
            'eff':          round(r.get('efficiency', 0), 2),
            'box8plus_pct': round(r.get('percentAttemptsGteEightDefenders', 0), 1),
            'tlos':         round(r.get('avgTimeToLos', 0), 2),
            'att':          r.get('rushAttempts', 0),
            'yds':          r.get('rushYards', 0),
            'ryoe':         round(r.get('rushYardsOverExpected', 0), 1),
            'avg':          round(r.get('avgRushYards', 0), 2),
            'ryoe_per_att': round(r.get('rushYardsOverExpectedPerAtt', 0), 2),
            'roe_pct':      round(r.get('rushPctOverExpected', 0), 1),
            'td':           r.get('rushTouchdowns', 0),
        })
    return out


def transform_receiving(stats):
    out = []
    for r in stats:
        p = r.get('player', {})
        out.append({
            'player':   r.get('playerName') or p.get('displayName', ''),
            'team':     team(r),
            'pos':      r.get('position') or p.get('position', ''),
            'cush':     round(r.get('avgCushion', 0), 2),
            'sep':      round(r.get('avgSeparation', 0), 2),
            'tay':      round(r.get('avgIntendedAirYards', 0), 2),
            'tay_pct':  round(r.get('percentShareOfIntendedAirYards', 0), 1),
            'rec':      r.get('receptions', 0),
            'tar':      r.get('targets', 0),
            'ctch_pct': round(r.get('catchPercentage', 0), 1),
            'yds':      r.get('yards', 0),
            'td':       r.get('recTouchdowns', 0),
            'yac_r':    round(r.get('avgYAC', 0), 2),
            'x_yac_r':  round(r.get('avgExpectedYAC', 0), 2),
            'yac_oe':   round(r.get('avgYACAboveExpectation', 0), 2),
        })
    return out


def _play_type(play):
    raw = play.get('playType', '')
    return PLAY_TYPE_MAP.get(raw, raw.replace('play_type_', '').replace('_', ' ').title())


def transform_leaders_top_plays(leaders, category):
    """Handles fastest_ball_carriers, longest_plays, fastest_sacks, longest_tackles."""
    out = []
    for i, item in enumerate(leaders, 1):
        L = item.get('leader', {})
        P = item.get('play', {})
        row = {
            'rank':      i,
            'player':    L.get('playerName', ''),
            'team':      L.get('teamAbbr', ''),
            'pos':       L.get('position', ''),
            'week':      L.get('week', ''),
            'play_type': _play_type(P),
        }
        if category == 'fastest_ball_carriers':
            row['mph'] = round(L.get('maxSpeed', 0), 4)
        elif category == 'longest_plays':
            row['distance_yds'] = round(L.get('inPlayDist', 0), 1)
        elif category == 'fastest_sacks':
            row['time_secs'] = round(L.get('time', 0), 3)
            del row['play_type']  # sacks schema doesn't have play_type
        elif category == 'longest_tackles':
            row['distance_yds'] = round(L.get('inPlayDist', 0), 1)
        out.append(row)
    return out


def transform_improbable(leaders):
    out = []
    for i, item in enumerate(leaders, 1):
        L = item.get('leader', {})
        P = item.get('play', {})
        out.append({
            'rank':           i,
            'qb':             L.get('playerName', ''),
            'receiver':       L.get('receiverName', '') or '',
            'team':           L.get('teamAbbr', ''),
            'pos':            L.get('position', ''),
            'completion_pct': round(L.get('completionProbability', 0), 1),
            'week':           L.get('week', ''),
            'play_type':      _play_type(P),
        })
    return out


def transform_yac(leaders):
    out = []
    for i, item in enumerate(leaders, 1):
        L = item.get('leader', {})
        P = item.get('play', {})
        out.append({
            'rank':               i,
            'player':             L.get('playerName', ''),
            'team':               L.get('teamAbbr', ''),
            'pos':                L.get('position', ''),
            'yac':                round(L.get('yardsAfterCatch', 0), 1),
            'expected_yac':       round(L.get('expectedYAC', 0), 1),
            'yac_above_expected': round(L.get('yacAboveExpectation', 0), 1),
            'week':               L.get('week', ''),
            'play_type':          _play_type(P),
        })
    return out


def transform_ery(leaders):
    out = []
    for i, item in enumerate(leaders, 1):
        L = item.get('leader', {})
        out.append({
            'rank':                   i,
            'player':                 L.get('playerName', ''),
            'team':                   L.get('teamAbbr', ''),
            'pos':                    L.get('position', ''),
            'week':                   L.get('week', ''),
            'rush_yds':               round(L.get('rushYards', 0), 1),
            'expected_rush_yds':      round(L.get('expectedRushYards', 0), 1),
            'rush_yds_over_expected': round(L.get('rushYardsOverExpected', 0), 1),
        })
    return out


# ── Category fetch config ─────────────────────────────────────────────────────

# Each entry: (category_key, api_path, transformer_fn)
STATBOARD = [
    ('passing',   '/api/statboard/passing',   transform_passing),
    ('rushing',   '/api/statboard/rushing',   transform_rushing),
    ('receiving', '/api/statboard/receiving', transform_receiving),
]

LEADERS = [
    ('fastest_ball_carriers', '/api/leaders/speed/ballCarrier',            'top_plays'),
    ('longest_plays',         '/api/leaders/distance/ballCarrier',         'top_plays'),
    ('fastest_sacks',         '/api/leaders/time/sack',                    'top_plays'),
    ('longest_tackles',       '/api/leaders/distance/tackle',              'top_plays'),
    ('improbable_completions','/api/leaders/expectation/completion/week',  'improbable'),
    ('incredible_yac',        '/api/leaders/expectation/yac/week',         'yac'),
    ('remarkable_rushes',     '/api/leaders/expectation/ery/week',         'ery'),
]


# ── Week list ─────────────────────────────────────────────────────────────────

def week_list(year):
    reg_weeks = 18 if int(year) >= 2021 else 17
    weeks = [('REG', str(w)) for w in range(1, reg_weeks + 1)]
    weeks += [('POST', '1'), ('POST', '2'), ('POST', '3'), ('POST', '4')]
    return weeks


def week_key(season_type, week_num):
    if season_type == 'REG':
        return f"REG_{int(week_num):02d}"
    post_map = {'1': 'POST_WC', '2': 'POST_DIV', '3': 'POST_CONF', '4': 'POST_SB'}
    return post_map.get(str(week_num), f"POST_{week_num}")


# ── Main ──────────────────────────────────────────────────────────────────────

def fetch_year(year):
    year = str(year)
    result = {}
    total_fetched = 0
    total_rows = 0

    weeks = week_list(year)
    # Also fetch full-season aggregate (no week param)
    all_combos = [('REG', None)] + weeks  # None = season total → 'ALL'

    print(f"\n{'='*60}")
    print(f"  Year: {year}  ({len(weeks)} per-week + 1 season-total)")
    print(f"{'='*60}")

    # ── Statboard (passing / rushing / receiving) ──────────────────────────
    for cat_key, path, transformer in STATBOARD:
        result[cat_key] = {}
        tasks = []
        for (stype, wnum) in all_combos:
            wk = week_key(stype, wnum) if wnum else 'ALL'
            if wnum:
                url = f"{BASE}{path}?season={year}&seasonType={stype}&week={wnum}"
            else:
                url = f"{BASE}{path}?season={year}&seasonType=REG"
            tasks.append((wk, url))

        def _fetch_statboard(args, _cat=cat_key, _tr=transformer):
            wk, url = args
            data = fetch_json(url)
            if data and data.get('stats'):
                rows = _tr(data['stats'])
                return wk, rows
            return wk, []

        with ThreadPoolExecutor(max_workers=6) as ex:
            futs = {ex.submit(_fetch_statboard, t): t for t in tasks}
            for fut in as_completed(futs):
                wk, rows = fut.result()
                if rows:
                    result[cat_key][wk] = rows
                    total_rows += len(rows)
                    total_fetched += 1

        non_empty = sum(1 for v in result[cat_key].values() if v)
        print(f"  {cat_key:30s}: {non_empty}/{len(tasks)} weeks with data")

    # ── Leaders (top plays) ────────────────────────────────────────────────
    for cat_key, path, transform_type in LEADERS:
        result[cat_key] = {}

        def _fetch_leaders(args, _cat=cat_key, _path=path, _tt=transform_type):
            stype, wnum = args
            wk = week_key(stype, wnum)
            url = f"{BASE}{_path}?season={year}&seasonType={stype}&week={wnum}"
            data = fetch_json(url)
            if not data:
                return wk, []
            leaders = data.get('leaders', [])
            if not leaders:
                return wk, []
            if _tt == 'top_plays':
                rows = transform_leaders_top_plays(leaders, _cat)
            elif _tt == 'improbable':
                rows = transform_improbable(leaders)
            elif _tt == 'yac':
                rows = transform_yac(leaders)
            elif _tt == 'ery':
                rows = transform_ery(leaders)
            else:
                rows = []
            return wk, rows

        with ThreadPoolExecutor(max_workers=6) as ex:
            futs = {ex.submit(_fetch_leaders, (st, wn)): (st, wn) for st, wn in weeks}
            for fut in as_completed(futs):
                wk, rows = fut.result()
                if rows:
                    result[cat_key][wk] = rows
                    total_rows += len(rows)
                    total_fetched += 1

        non_empty = sum(1 for v in result[cat_key].values() if v)
        print(f"  {cat_key:30s}: {non_empty}/{len(weeks)} weeks with data")

    # ── Write output ──────────────────────────────────────────────────────
    os.makedirs(OUT_DIR, exist_ok=True)
    json_file = os.path.join(OUT_DIR, f'ngs_{year}.json')
    js_file   = os.path.join(OUT_DIR, f'ngs_{year}.js')

    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2)

    compact = json.dumps(result, ensure_ascii=False, separators=(',', ':'))
    with open(js_file, 'w', encoding='utf-8') as f:
        f.write('window.NGS_DATA=' + compact + ';')

    print(f"\n  Wrote {js_file} ({len(compact)//1024} KB)")
    print(f"  Total: {total_fetched} non-empty fetches, {total_rows} rows")

    return result


def main():
    years = sys.argv[1:] if len(sys.argv) > 1 else ['2024']
    print(f"Fetching NGS API for years: {years}")
    for year in years:
        fetch_year(year)
    print("\nDone.")


if __name__ == '__main__':
    main()
