"""
embed_data.py — Embed JSON data files inline into SBT index.html.
Run this whenever any data file in data/ is updated.

Usage:
    python embed_data.py
"""
import json, sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILES = ['standings', 'matchups', 'draft_picks', 'champions',
         'team_yearly', 'head_to_head', 'playoff_games', 'rosters']

with open('index.html', encoding='utf-8') as f:
    html = f.read()

# 1. Ensure rosters is in the DATA init line
OLD_INIT = 'let DATA={standings:[],matchups:[],draft_picks:[],champions:[],team_yearly:[],head_to_head:[],playoff_games:[]};'
NEW_INIT = 'let DATA={standings:[],matchups:[],draft_picks:[],champions:[],team_yearly:[],head_to_head:[],playoff_games:[],rosters:[]};'
if OLD_INIT in html:
    html = html.replace(OLD_INIT, NEW_INIT)
    print('Updated DATA init to include rosters')
elif NEW_INIT in html:
    print('DATA init already includes rosters')
else:
    print('WARNING: DATA init line not found — check index.html')

# 2. Remove any existing inline DATA assignments
for name in FILES:
    html = re.sub(rf'DATA\["{name}"\]=\[.*?\];', '', html, flags=re.DOTALL)

# 3. Build new inline assignments
data_lines = []
for name in FILES:
    with open(f'data/{name}.json', encoding='utf-8') as f:
        data = json.load(f)
    data_json = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    data_lines.append(f'DATA["{name}"]={data_json};')
    print(f'  Embedded {name}.json ({len(data_json):,} chars)')

inline_block = '\n'.join(data_lines)

# 4. Insert after the DATA init line
ANCHOR = NEW_INIT if NEW_INIT in html else OLD_INIT
if ANCHOR in html:
    html = html.replace(ANCHOR, ANCHOR + '\n// Inline data — no server required\n' + inline_block)
    print(f'Inserted {len(FILES)} data blocks')
else:
    print('ERROR: Could not find DATA init anchor')
    sys.exit(1)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Done!')
