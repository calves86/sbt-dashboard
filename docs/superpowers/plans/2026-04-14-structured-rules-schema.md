# Structured Rules Schema — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create per-season structured-rules files (`data/rules/2025.json`, `data/rules/2026.json`) so a future scoring engine can compute fantasy points from play-by-play data, and wire a minimal UI touchpoint confirming the files are reachable.

**Architecture:** Additive only. Two new JSON files following the schema in `docs/superpowers/specs/2026-04-14-structured-rules-schema-design.md`. One tiny footer line on the existing Rules → Scoring tab. No engine yet — that's a follow-up spec.

**Tech Stack:** JSON data files, vanilla JS dashboard (`index.html`), Python 3 for one-shot validation of the data file shape.

**Scope boundary:** SBT repo only (`C:/Users/Chris/OneDrive/Desktop/sbt-dashboard`). PHFL uses different rules and will need a parallel pass in its own plan.

**Reference spec:** `docs/superpowers/specs/2026-04-14-structured-rules-schema-design.md` (commit `fb6d217`).

---

## Task 1: Create `data/rules/2025.json`

The file contains the full SBT 2025 ruleset: `scoring` (34 rules), `house_bonuses` (1 rule), `standings` (4 fields).

**Files:**
- Create: `data/rules/2025.json`

Derivation note: this is hand-authored from the existing free-text values in `data/rules.json` (Scoring System / Scoring Policies / Schedule & Playoffs sections) cross-checked against the CBS `/rules` scrape saved at `.firecrawl/cbs-rules.json`. No automation — one-time manual translation. The `TK` (Tackle) rule uses the `0 points` value from CBS's "Special Scoring for Defense/STs" sub-section, because SBT is a DST-only league with no IDP.

- [ ] **Step 1: Verify the spec file exists and is committed**

Run:

```bash
ls -la docs/superpowers/specs/2026-04-14-structured-rules-schema-design.md
git log --oneline docs/superpowers/specs/2026-04-14-structured-rules-schema-design.md
```

Expected: file exists, one commit (`fb6d217` or later).

- [ ] **Step 2: Create `data/rules/` directory**

Run:

```bash
mkdir -p data/rules
ls data/rules
```

Expected: directory created, empty.

- [ ] **Step 3: Write `data/rules/2025.json`**

Create the file with this exact content:

```json
{
  "season": 2025,
  "description": "SBT scoring & standings rules for the 2025 season. Seeded from data/rules.json on 2026-04-14. TK uses the Defense/ST override value (0 pts) since SBT is DST-only.",
  "scoring": {
    "FG":      { "points": 3,  "yardage_bonus": { "min": 50, "points": 2 } },
    "MFG":     { "points": -3, "yardage_bonus": { "min": 50, "points": 3 } },
    "XP":      { "points": 1 },
    "MXP":     { "points": -2 },
    "PaTD":    { "points": 5,  "yardage_bonus": { "min": 50, "max": 100, "points": 3 } },
    "PaYd":    { "rate": 0.04, "bonuses": [
      { "at": 250, "points": 2 },
      { "at": 300, "points": 3 },
      { "at": 350, "points": 3 },
      { "at": 400, "points": 4 },
      { "at": 500, "points": 3 }
    ]},
    "PaInt":   { "points": -2 },
    "PaIntTD": { "points": -6 },
    "Pa2P":    { "points": 2 },
    "RuTD":    { "points": 6,  "yardage_bonus": { "min": 50, "points": 5 } },
    "RuYd":    { "rate": 0.1,  "bonuses": [
      { "at": 100, "points": 3 },
      { "at": 150, "points": 3 },
      { "at": 200, "points": 5 },
      { "at": 250, "points": 5 },
      { "at": 300, "points": 5 }
    ]},
    "RuAtt":   { "bonuses": [
      { "at": 20, "points": 2 },
      { "at": 25, "points": 3 },
      { "at": 30, "points": 5 }
    ]},
    "Ru2P":    { "points": 2 },
    "ReTD":    { "points": 6,  "yardage_bonus": { "min": 50, "points": 3 } },
    "ReYd":    { "rate": 0.1,  "bonuses": [
      { "at": 100, "points": 3 },
      { "at": 125, "points": 3 },
      { "at": 150, "points": 5 },
      { "at": 200, "points": 5 },
      { "at": 250, "points": 3 }
    ]},
    "Recpt":   { "rate": 1 },
    "Re2P":    { "points": 2 },
    "FL":      { "points": -2 },
    "IFRTD":   { "points": 6 },
    "IKRTD":   { "points": 6 },
    "IPRTD":   { "points": 6 },
    "DFTD":    { "points": 6 },
    "STTD":    { "points": 6 },
    "ST2PT":   { "points": 2 },
    "Int":     { "points": 2 },
    "SACK":    { "points": 2 },
    "STY":     { "points": 5 },
    "FF":      { "points": 1 },
    "TK":      { "points": 0 },
    "BFB":     { "points": 1 },
    "BP":      { "points": 1 },
    "BXP":     { "points": 1 },
    "DFR":     { "points": 1 },
    "DSTPA":   { "tiers": [
      { "min": 0,  "max": 0,   "points": 10 },
      { "min": 1,  "max": 3,   "points": 8  },
      { "min": 4,  "max": 14,  "points": 6  },
      { "min": 15, "max": 24,  "points": 4  },
      { "min": 25, "max": 35,  "points": 0  },
      { "min": 36, "max": 41,  "points": -4 },
      { "min": 42, "max": 999, "points": -8 }
    ]}
  },
  "house_bonuses": [
    {
      "id": "qb_own_receiver_same_team_td",
      "description": "+3 bonus when a QB throws a TD to a WR/TE/RB on your roster who plays for the same NFL team as the QB.",
      "points": 3,
      "when": {
        "event": "pass_td",
        "passer_team_eq_receiver_team": true,
        "receiver_position_in": ["WR", "TE", "RB"],
        "both_on_same_fantasy_roster": true
      }
    }
  ],
  "standings": {
    "tiebreakers": ["winning_pct", "head_to_head_record", "total_points", "division_record", "points_against"],
    "division_winner_tiebreakers": ["winning_pct", "head_to_head_record", "total_points", "division_record", "points_against"],
    "matchup_tiebreaker": "reserves_points",
    "playoff_matchup_tiebreaker": "reserves_points",
    "illegal_roster_score": "zero_points"
  }
}
```

- [ ] **Step 4: Validate JSON parses and matches the schema shape**

Run (from repo root):

```bash
python -c "
import json
r = json.load(open('data/rules/2025.json', encoding='utf-8'))
assert r['season'] == 2025, 'season mismatch'
assert 'scoring' in r and 'house_bonuses' in r and 'standings' in r, 'missing top-level key'

# Dispatch-order check (spec §5.2, first-match wins, exactly-one-shape rule)
for code, rule in r['scoring'].items():
    has_tiers = 'tiers' in rule
    has_rate = 'rate' in rule
    has_points = 'points' in rule
    has_bonuses_only = ('bonuses' in rule) and not has_rate and not has_points and not has_tiers
    shape_count = sum([has_tiers, has_rate, has_points, has_bonuses_only])
    assert shape_count == 1, f'{code}: ambiguous shape ({shape_count} matched): {rule}'

# DSTPA tiers contiguous and sorted
tiers = r['scoring']['DSTPA']['tiers']
for i in range(len(tiers)-1):
    assert tiers[i]['max'] + 1 == tiers[i+1]['min'], f'DSTPA tier gap between index {i} and {i+1}'

# All bonus .at arrays strictly ascending
for code, rule in r['scoring'].items():
    if 'bonuses' in rule:
        ats = [b['at'] for b in rule['bonuses']]
        assert ats == sorted(ats), f'{code}: bonuses not sorted'
        assert len(set(ats)) == len(ats), f'{code}: duplicate bonus thresholds'

# House bonus predicates use known vocabulary
KNOWN_PREDS = {'event', 'passer_team_eq_receiver_team', 'passer_position_in',
               'receiver_position_in', 'both_on_same_fantasy_roster'}
for hb in r['house_bonuses']:
    for k in hb['when'].keys():
        assert k in KNOWN_PREDS, f'house bonus {hb[\"id\"]}: unknown predicate {k}'

# Standings tiebreaker keys
KNOWN_TBS = {'winning_pct', 'head_to_head_record', 'total_points',
             'division_record', 'points_against'}
for k in r['standings']['tiebreakers'] + r['standings']['division_winner_tiebreakers']:
    assert k in KNOWN_TBS, f'unknown tiebreaker key: {k}'

print(f'OK - {len(r[\"scoring\"])} scoring rules, {len(r[\"house_bonuses\"])} house bonuses, standings keys: {list(r[\"standings\"].keys())}')
"
```

Expected: prints `OK - 34 scoring rules, 1 house bonuses, standings keys: ['tiebreakers', 'division_winner_tiebreakers', 'matchup_tiebreaker', 'playoff_matchup_tiebreaker', 'illegal_roster_score']` and exits 0.

If the assertion fails, fix the JSON, not the validator. The validator's checks are exactly what spec §5.2 and §5.3 require.

- [ ] **Step 5: Commit**

```bash
git add data/rules/2025.json
git commit -m "Add structured 2025 rules file (scoring + standings schema)

Per spec docs/superpowers/specs/2026-04-14-structured-rules-schema-design.md.
Seeded from existing data/rules.json. TK uses the Defense/ST override
(0 pts) since SBT is DST-only.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Create `data/rules/2026.json`

Initial copy of 2025.json, `season` field bumped to 2026. When 2026 rules are voted on, this file gets edited.

**Files:**
- Create: `data/rules/2026.json`

- [ ] **Step 1: Copy 2025 file, update season + description**

Run:

```bash
python -c "
import json
r = json.load(open('data/rules/2025.json', encoding='utf-8'))
r['season'] = 2026
r['description'] = 'SBT scoring & standings rules for the 2026 season. Initial copy of 2025.json on 2026-04-14 - edit when 2026 rule changes are voted on.'
with open('data/rules/2026.json', 'w', encoding='utf-8') as f:
    json.dump(r, f, ensure_ascii=False, indent=2)
    f.write('\n')
print('wrote data/rules/2026.json')
"
```

Expected: prints `wrote data/rules/2026.json`.

- [ ] **Step 2: Verify 2026.json parses and has correct season**

Run:

```bash
python -c "
import json
r = json.load(open('data/rules/2026.json', encoding='utf-8'))
assert r['season'] == 2026, f'expected 2026, got {r[\"season\"]}'
assert len(r['scoring']) == 34
assert len(r['house_bonuses']) == 1
print('OK 2026.json season=2026,', len(r['scoring']), 'scoring rules')
"
```

Expected: `OK 2026.json season=2026, 34 scoring rules`.

- [ ] **Step 3: Commit**

```bash
git add data/rules/2026.json
git commit -m "Add 2026 rules file (initial copy of 2025)

Placeholder for the 2026 season - will be edited when the league
votes on any rule changes.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Add wiring-confirmation footer to Rules → Scoring tab

A single read-only footer line on the Scoring sub-tab, inside `index.html`. Purpose: confirm the file is fetchable before any consumer gets built. The footer fetches `data/rules/<currentSeason>.json`, shows the filename, and if the fetch fails surfaces the error in-place. No behavior change to any existing UI.

**Files:**
- Modify: `C:/Users/Chris/OneDrive/Desktop/sbt-dashboard/index.html` (the `renderRules` function, `rt==='scoring'` branch, around line 884 — right after the existing `BONUS SCORING` block and before the closing `} else if(rt==='constitution'){`)

- [ ] **Step 1: Inspect the current Scoring-tab render block**

Run:

```bash
sed -n '864,890p' index.html
```

Expected: shows the `rt==='scoring'` branch rendering 'OFFENSIVE SCORING', 'DEFENSIVE SCORING', and the 'BONUS SCORING' card. The new footer goes right after the BONUS SCORING block.

- [ ] **Step 2: Add the footer in `renderRules`**

Apply this Edit to `index.html` — insert the `SCORING SOURCE` block after the existing `BONUS SCORING` card and before the `} else if(rt==='constitution'){`:

Find the exact string (around line 884–890):

```javascript
    html+=sectionTitle('BONUS SCORING');
    html+=`<div class="data-table" style="margin-bottom:24px">
      <div style="padding:14px 16px;font-size:13px;color:#e2e8f0;line-height:1.6">
        <span style="color:${AC};font-weight:700">+3 point bonus</span> when your QB throws a TD to one of your own WR/TE/RB who plays for the same NFL team as the QB.
      </div>
    </div>`;

    } else if(rt==='constitution'){
```

Replace with:

```javascript
    html+=sectionTitle('BONUS SCORING');
    html+=`<div class="data-table" style="margin-bottom:24px">
      <div style="padding:14px 16px;font-size:13px;color:#e2e8f0;line-height:1.6">
        <span style="color:${AC};font-weight:700">+3 point bonus</span> when your QB throws a TD to one of your own WR/TE/RB who plays for the same NFL team as the QB.
      </div>
    </div>`;

    const scoringSeason = 2025;
    html+=`<div id="scoring-source" style="margin-top:8px;font-size:11px;color:#475569;font-family:'DM Sans',sans-serif">Scoring source: <code style="color:#64748b">data/rules/${scoringSeason}.json</code> <span id="scoring-source-status" style="margin-left:6px">(checking…)</span></div>`;
    setTimeout(()=>{
      fetch('data/rules/'+scoringSeason+'.json',{cache:'no-store'})
        .then(r=>r.ok?r.json():Promise.reject(r.status))
        .then(j=>{
          const n=Object.keys(j.scoring||{}).length;
          const el=document.getElementById('scoring-source-status');
          if(el) el.innerHTML='<span style="color:#10b981">✓ '+n+' rules loaded</span>';
        })
        .catch(err=>{
          const el=document.getElementById('scoring-source-status');
          if(el) el.innerHTML='<span style="color:#f87171">✗ not reachable ('+err+')</span>';
        });
    },0);

    } else if(rt==='constitution'){
```

- [ ] **Step 3: Manual browser verification**

Start a local static server (any one of these):

```bash
python -m http.server 8000
```

Then in your browser:

1. Open http://localhost:8000/index.html?tab=Rules
2. Click the **Scoring** sub-tab.
3. Scroll to the bottom. Confirm the footer reads `Scoring source: data/rules/2025.json ✓ 34 rules loaded` (green checkmark).
4. Open DevTools → Network. Reload. Confirm a request to `data/rules/2025.json` returned `200 OK` with JSON content.

If the footer shows `✗ not reachable (404)` or similar, the file path is wrong — re-check Task 1.

Stop the server with Ctrl+C when done.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "Rules tab: show scoring source footer

Reads data/rules/2025.json and displays whether it loaded, so we can
verify the new per-season rules files are wired up before building the
scoring engine.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Push both commits

All three commits (Task 1, 2, 3) should be pushed to `origin main`.

- [ ] **Step 1: Review unpushed commits**

Run:

```bash
git log origin/main..HEAD --oneline
```

Expected: three commits from this plan:

```
<sha3> Rules tab: show scoring source footer
<sha2> Add 2026 rules file (initial copy of 2025)
<sha1> Add structured 2025 rules file (scoring + standings schema)
```

- [ ] **Step 2: Push**

Run:

```bash
git push origin main
```

Expected: `origin/main` advances by three commits; no errors.

- [ ] **Step 3: Post-push browser verification on GitHub Pages**

Wait ~60 seconds for GitHub Pages to redeploy, then load the live site:

1. Open https://calves86.github.io/sbt-dashboard/?tab=Rules
2. Click the Scoring sub-tab.
3. Confirm the footer reads `Scoring source: data/rules/2025.json ✓ 34 rules loaded`.

If live shows `✗ not reachable`, the file didn't upload — check `git ls-tree -r origin/main -- data/rules/`.

---

## Known follow-ups (out of scope for this plan)

- Scoring engine (`scoring-engine.js`) that consumes `data/rules/<year>.json` + a play-by-play stream and returns per-player per-week points.
- Standings engine (applies `standings.tiebreakers` order).
- Commissioner Tools editor for structured rules (dropdowns, number inputs, range rows, bonus rows).
- Parallel pass for **PHFL** — same schema, different league values. Separate plan.
- Live PBP data pipeline for 2026.

Each gets its own brainstorm → spec → plan.
