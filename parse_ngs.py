#!/usr/bin/env python3
"""
parse_ngs.py [year]
Converts .firecrawl/ngs{year}/*.md files into structured JSON + JS.
Defaults to 2025.
Usage: python parse_ngs.py 2024
"""

import os, json, re, sys

YEAR = sys.argv[1] if len(sys.argv) > 1 else '2025'
MD_DIR = os.path.join(os.path.dirname(__file__), '.firecrawl', f'ngs{YEAR}')
OUT_FILE = os.path.join(os.path.dirname(__file__), 'data', f'ngs_{YEAR}.json')
print(f'Parsing NGS {YEAR} from {MD_DIR}')

# ── Column definitions per category ─────────────────────────────────────────

SCHEMAS = {
    'passing': [
        'player', 'team', 'tt', 'cay', 'iay', 'ayd', 'agg_pct',
        'lcad', 'ayts', 'att', 'yds', 'td', 'int', 'rate',
        'comp_pct', 'x_comp_pct', 'cpoe'
    ],
    'rushing': [
        'player', 'team', 'eff', 'box8plus_pct', 'tlos',
        'att', 'yds', 'ryoe', 'avg', 'ryoe_per_att', 'roe_pct', 'td'
    ],
    'receiving': [
        'player', 'team', 'pos', 'cush', 'sep', 'tay', 'tay_pct',
        'rec', 'tar', 'ctch_pct', 'yds', 'td', 'yac_r', 'x_yac_r', 'yac_oe'
    ],
    'fastest_ball_carriers': [
        'rank', 'player', 'team', 'pos', 'mph', 'week', 'play_type'
    ],
    'longest_plays': [
        'rank', 'player', 'team', 'pos', 'distance_yds', 'week', 'play_type'
    ],
    'fastest_sacks': [
        'rank', 'player', 'team', 'pos', 'time_secs', 'week'
    ],
    'longest_tackles': [
        'rank', 'player', 'team', 'pos', 'distance_yds', 'week', 'play_type'
    ],
    'improbable_completions': [
        'rank', 'qb', 'receiver', 'team', 'pos', 'completion_pct', 'week', 'play_type'
    ],
    'incredible_yac': [
        'rank', 'player', 'team', 'pos', 'yac', 'expected_yac', 'yac_above_expected', 'week', 'play_type'
    ],
    'remarkable_rushes': [
        'rank', 'player', 'team', 'pos', 'week', 'rush_yds', 'expected_rush_yds', 'rush_yds_over_expected'
    ],
}

NUMERIC_FIELDS = {
    'tt','cay','iay','ayd','agg_pct','lcad','ayts','att','yds','td','int','rate',
    'comp_pct','x_comp_pct','cpoe','eff','box8plus_pct','tlos','ryoe','avg',
    'ryoe_per_att','roe_pct','cush','sep','tay','tay_pct','rec','tar','ctch_pct',
    'yac_r','x_yac_r','yac_oe','rank','mph','distance_yds','time_secs',
    'completion_pct','yac','expected_yac','yac_above_expected',
    'rush_yds','expected_rush_yds','rush_yds_over_expected','week'
}


def week_label_to_key(label):
    """Convert filename segment to display week key."""
    m = re.match(r'reg_wk(\d+)', label)
    if m: return f"REG_{int(m.group(1)):02d}"
    if label == 'post_wc':   return 'POST_WC'
    if label == 'post_div':  return 'POST_DIV'
    if label == 'post_conf': return 'POST_CONF'
    if label == 'post_sb':   return 'POST_SB'
    return label.upper()


def clean_play_type(raw):
    """Strip markdown artifacts from play type cell."""
    s = re.sub(r'<br>.*', '', raw)          # remove <br>_add_circle_outline_
    s = re.sub(r'\\_add\\_circle\\_outline_', '', s)
    s = re.sub(r'\\?\*\s*$', '', s).strip() # trailing * (penalty marker)
    return s.strip()


def parse_table_row(line, schema):
    """Parse a markdown table row into a dict using the given schema."""
    # Strip leading/trailing pipes and split
    cells = [c.strip() for c in line.strip().strip('|').split('|')]

    # Drop the trailing empty cell firecrawl sometimes adds
    while cells and cells[-1] == '':
        cells.pop()

    if len(cells) < len(schema) - 2:
        return None  # too few columns, skip

    row = {}
    for i, key in enumerate(schema):
        if i >= len(cells):
            break
        val = cells[i].strip()

        # Clean up play_type fields
        if key in ('play_type',):
            val = clean_play_type(val)

        # Convert numerics
        if key in NUMERIC_FIELDS:
            try:
                val = float(val) if '.' in val else int(val)
            except ValueError:
                pass  # keep as string if unparseable

        row[key] = val

    return row if row else None


def is_data_row(line, schema):
    """Return True if this looks like a real data row (not header/separator)."""
    if not line.startswith('|'):
        return False
    if '---' in line:
        return False
    first_cell = line.strip().strip('|').split('|')[0].strip()
    # Skip blank rows
    if not first_cell:
        return False
    # Skip header rows (first cell matches first schema key label)
    header_indicators = {'PLAYER NAME', 'PLAYER', 'RK', 'QUARTERBACK'}
    if first_cell.upper() in header_indicators:
        return False
    return True


def parse_md_file(filepath, category):
    schema = SCHEMAS.get(category)
    if not schema:
        return []

    rows = []
    seen = set()  # deduplicate — NGS site sometimes renders the table twice
    with open(filepath, encoding='utf-8') as f:
        for line in f:
            line = line.rstrip('\n')
            if is_data_row(line, schema):
                row = parse_table_row(line, schema)
                if row:
                    key = tuple(str(v) for v in row.values())
                    if key not in seen:
                        seen.add(key)
                        rows.append(row)
    return rows


def main():
    if not os.path.isdir(MD_DIR):
        print(f"ERROR: {MD_DIR} not found")
        return

    result = {}

    files = sorted(os.listdir(MD_DIR))
    print(f"Found {len(files)} files in {MD_DIR}")

    for fname in files:
        if not fname.endswith('.md'):
            continue

        # Parse filename: {category}_{week_label}.md
        # Category names may have underscores so match greedily then strip known week suffixes
        m = re.match(r'^(.+?)_((?:reg_wk\d+|post_wc|post_div|post_conf|post_sb))\.md$', fname)
        if not m:
            print(f"  SKIP (name): {fname}")
            continue

        category = m.group(1)
        week_raw = m.group(2)

        if category not in SCHEMAS:
            print(f"  SKIP (schema): {fname}")
            continue

        week_key = week_label_to_key(week_raw)
        filepath = os.path.join(MD_DIR, fname)
        rows = parse_md_file(filepath, category)

        if category not in result:
            result[category] = {}
        result[category][week_key] = rows

        print(f"  {category} / {week_key}: {len(rows)} rows")

    # Also scrape the full-season "all" view for 2025 (pre-scraped files)
    if YEAR == '2025':
        all_dir = os.path.join(os.path.dirname(__file__), '.firecrawl')
        season_map = {
            'ngs-passing-2025.md':               ('passing',                 'ALL'),
            'ngs-rushing-2025.md':               ('rushing',                 'ALL'),
            'ngs-receiving-2025.md':             ('receiving',               'ALL'),
            'ngs-fastest-ball-carriers.md':      ('fastest_ball_carriers',   'ALL'),
            'ngs-longest-plays-2025.md':         ('longest_plays',           'ALL'),
            'ngs-fastest-sacks-2025.md':         ('fastest_sacks',           'ALL'),
            'ngs-longest-tackles-2025.md':       ('longest_tackles',         'ALL'),
            'ngs-improbable-completions-2025.md':('improbable_completions',  'ALL'),
            'ngs-yac-2025.md':                   ('incredible_yac',          'ALL'),
            'ngs-remarkable-rushes2-2025.md':    ('remarkable_rushes',       'ALL'),
        }
        for fname, (category, week_key) in season_map.items():
            fpath = os.path.join(all_dir, fname)
            if not os.path.exists(fpath):
                continue
            rows = parse_md_file(fpath, category)
            if category not in result:
                result[category] = {}
            result[category][week_key] = rows
            print(f"  {category} / {week_key}: {len(rows)} rows [season total]")

    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    with open(OUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2)

    # Also write as a JS file for direct script-tag loading (no fetch/CORS issues)
    js_file = OUT_FILE.replace('.json', '.js')
    compact = json.dumps(result, ensure_ascii=False, separators=(',', ':'))
    with open(js_file, 'w', encoding='utf-8') as f:
        f.write('window.NGS_DATA=' + compact + ';')
    print(f"Wrote {js_file} ({len(compact)//1024} KB)")

    print(f"\nWrote {OUT_FILE}")
    print("Categories:", list(result.keys()))
    for cat, weeks in result.items():
        print(f"  {cat}: {len(weeks)} weeks, {sum(len(v) for v in weeks.values())} total rows")


if __name__ == '__main__':
    main()
