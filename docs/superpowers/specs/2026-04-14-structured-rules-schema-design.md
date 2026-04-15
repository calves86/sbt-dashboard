# Structured Rules Schema — Design

**Date:** 2026-04-14
**League:** SBT (Sigma Beta Tau Fantasy Football)
**Scope:** Scoring + standings rules only. Does NOT cover keepers, playoff bracket generation, roster legality enforcement, or Finances/Teams-and-Managers pages. Those are separate specs.

---

## 1. Problem

Today `data/rules.json` stores league rules as free-text strings — e.g.
`"0+ PaYds = .04 points for every 1 PaYd Plus a 2 point bonus @ 250+ PaYd"`.
That renders fine in the Rules tab, but JavaScript can't compute fantasy points
from it. When the 2026 season begins, the dashboard needs to pull live
play-by-play data and compute points itself, which requires a structured schema
for every scoring rule (flat, rate, tiered, bonuses) and for standings
tiebreakers.

This spec defines that schema and the minimal file-layout changes needed to
introduce it without disrupting today's Rules tab or Commissioner Tools editor.

## 2. Goals

1. Every scoring rule in your CBS league is expressible in the schema.
2. The schema supports **per-play** scoring (not just weekly totals), so yardage
   bonuses (PaTD 50–100 yd, ReTD 50+, RuTD 50+, MFG 50+) can be computed
   accurately.
3. Schema supports the constitution "QB to own-team WR/TE/RB" +3 bonus, which
   CBS cannot compute and you currently add manually.
4. Schema is versioned **per season** — rules for 2025, 2026, etc. live in
   separate files so past seasons always score under their original rules.
5. Schema also captures the **standings tiebreaker order** (regular season and
   division winner) and the **matchup tiebreaker** (reserves points).
6. No regression to the existing Rules tab, Settings editor, or the current
   `data/rules.json`.

## 3. Non-goals

- Building the scoring engine itself (separate spec).
- Building a standings calculator (separate spec).
- Keeper eligibility, playoff bracket generation, Loser Bowl logic (future
  specs).
- Restructuring the non-computable parts of `data/rules.json` (League Identity,
  Roster Limits, Transaction Settings, Draft Settings, Fees, Schedule &
  Playoffs strings). Those stay as-is.
- Fully editable UI for the new structured rules. Commissioner Tools editor is
  out of scope for this spec; the new files are hand-editable JSON for now.

## 4. File layout

```
data/
├── rules.json                 # unchanged — keeps all existing string-based rules
└── rules/
    ├── 2025.json              # NEW — structured scoring + standings rules for 2025
    └── 2026.json              # NEW — initial copy of 2025.json; editable when 2026 rules vote happens
```

- Per-season rule file path: `data/rules/<year>.json`.
- Dashboard code that needs rules for a given season fetches
  `data/rules/${season}.json`.
- Old `data/rules.json` is **not modified**. It keeps serving the Rules tab,
  the Settings editor in Commissioner Tools, and all current readers.

## 5. Schema

### 5.1 Top-level shape

```json
{
  "season": 2025,
  "description": "Human-readable note about this season's ruleset.",
  "scoring":        { ... },
  "house_bonuses":  [ ... ],
  "standings":      { ... }
}
```

All four keys are required. `description` is free-text; it's shown nowhere
automatically and exists solely for human note-taking inside the file.

### 5.2 `scoring` — stat-code-keyed rules

Each key is a CBS stat code (`PaTD`, `RuYd`, `DSTPA`, etc.). The **shape of the
value** tells the scoring engine which rule type applies. The engine decides a
rule's type by checking for these keys in the exact order below — first match
wins.

| # | Value has key | Rule type | Semantics |
|---|---|---|---|
| 1 | `tiers` | Tiered lookup | Exactly one tier matches per event. First tier whose `[min, max]` range contains the input wins. |
| 2 | `rate` (with optional `bonuses`) | Per-unit rate | `rate × units` for the per-unit points, plus every threshold `bonuses[i]` whose `at` value is ≤ units. Bonuses **stack**. |
| 3 | `points` (with optional `yardage_bonus`) | Per-event flat | `points` added for each event. If `yardage_bonus` present, add its `points` when the event's yardage falls in `[min, max]` (max optional = open-ended). |
| 4 | `bonuses` only (no `points` or `rate`) | Count threshold | No base value; add every `bonuses[i].points` whose `at` value is ≤ total count. Bonuses stack. Used for `RuAtt` (rushing-attempts thresholds only). |

A rule value MUST match exactly one row. Mixing incompatible keys
(`points` + `tiers`, or `rate` + `tiers`) is invalid and will be rejected by
the validator defined in section 8.

Field reference:

- `points` (number) — per-event flat points.
- `rate` (number) — points per single unit (yard, reception, etc.).
- `yardage_bonus.min`, `yardage_bonus.max`, `yardage_bonus.points` — extra
  points when a per-event's yardage satisfies `min ≤ yds ≤ max` (or just `min`
  if `max` omitted). `points` can be positive or negative.
- `bonuses[].at`, `bonuses[].points` — threshold bonus. Engine checks every
  entry; all whose `at` ≤ observed total contribute their `points`.
- `tiers[].min`, `tiers[].max`, `tiers[].points` — bracket lookup.

#### 5.2.1 Worked examples (abbreviated; full 35-rule file stored at `data/rules/2025.json`):

```json
"scoring": {
  "RuTD":  { "points": 6, "yardage_bonus": { "min": 50, "points": 5 } },
  "PaTD":  { "points": 5, "yardage_bonus": { "min": 50, "max": 100, "points": 3 } },
  "PaYd":  { "rate": 0.04, "bonuses": [
    { "at": 250, "points": 2 }, { "at": 300, "points": 3 },
    { "at": 350, "points": 3 }, { "at": 400, "points": 4 },
    { "at": 500, "points": 3 }
  ]},
  "RuAtt": { "bonuses": [
    { "at": 20, "points": 2 }, { "at": 25, "points": 3 }, { "at": 30, "points": 5 }
  ]},
  "Recpt": { "rate": 1 },
  "DSTPA": { "tiers": [
    { "min": 0,  "max": 0,   "points": 10 },
    { "min": 1,  "max": 3,   "points": 8  },
    { "min": 4,  "max": 14,  "points": 6  },
    { "min": 15, "max": 24,  "points": 4  },
    { "min": 25, "max": 35,  "points": 0  },
    { "min": 36, "max": 41,  "points": -4 },
    { "min": 42, "max": 999, "points": -8 }
  ]}
}
```

### 5.3 `house_bonuses` — constitution / custom rules

Rules not in CBS's scoring grid, applied at per-play scoring time. Array of
objects.

```json
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
]
```

Fields:

- `id` (string, stable) — used in engine logs and in the Rules tab when we
  surface which bonus fired.
- `description` (string) — shown verbatim on the Rules tab / Commissioner UI.
- `points` (number) — awarded when all `when` predicates match.
- `when` (object) — predicate bundle. Every predicate must be true for the
  bonus to fire on a given play.

#### 5.3.1 Day-one predicate vocabulary

- `event`: one of `"pass_td"`, `"rush_td"`, `"rec_td"`.
- `passer_team_eq_receiver_team` (bool): true if the passer's NFL team equals
  the receiver's NFL team.
- `passer_position_in` (array of positions) / `receiver_position_in` (array of
  positions) — restrict by position.
- `both_on_same_fantasy_roster` (bool): true if both the passer and the
  receiver are on the fantasy team being scored, at the time of the play.

The matcher is intentionally open-ended. New predicates (e.g., `week_in`,
`opponent_is_divisional`) can be added when new house rules appear; unknown
predicates are an engine error, not a silent skip.

### 5.4 `standings`

```json
"standings": {
  "tiebreakers": ["winning_pct", "head_to_head_record", "total_points", "division_record", "points_against"],
  "division_winner_tiebreakers": ["winning_pct", "head_to_head_record", "total_points", "division_record", "points_against"],
  "matchup_tiebreaker": "reserves_points",
  "playoff_matchup_tiebreaker": "reserves_points",
  "illegal_roster_score": "zero_points"
}
```

#### 5.4.1 Season tiebreaker keys

Ordered list; engine applies in order until one resolves the tie.

| Key | Meaning |
|---|---|
| `winning_pct` | Higher `W / (W + L + 0.5 * T)` wins. |
| `head_to_head_record` | Head-to-head W-L among the tied teams. Only valid when the tied teams have played each other; else skip to next key. |
| `total_points` | Cumulative points for. |
| `division_record` | W-L within own division. |
| `points_against` | Higher points-against wins (schedule-difficulty proxy; matches CBS behavior). |

#### 5.4.2 `matchup_tiebreaker` / `playoff_matchup_tiebreaker`

Single values:
- `reserves_points` — tied starter totals; team with more bench points wins.
- `none` — leave ties as ties (not used today, listed for extensibility).
- `home_team_wins` — not used today, listed for extensibility.

#### 5.4.3 `illegal_roster_score`

- `zero_points` — illegal rosters score 0 in standings for that week (current
  CBS setting).
- `actual_points` / `forfeit` — future extensibility; not used today.

## 6. Files to create

1. `data/rules/2025.json` — seeded from today's values. Derivation:
   - `scoring` filled from the `Scoring System` table in the current
     `data/rules.json` (35 rows), converted to the structured shape above.
   - `house_bonuses` filled with the single constitution bonus
     (`qb_own_receiver_same_team_td`).
   - `standings` filled from `Scoring Policies` and `Schedule & Playoffs` rows
     in the current `data/rules.json`.
2. `data/rules/2026.json` — initial copy of `2025.json`, `season` field bumped
   to 2026. Commissioner edits this file when 2026 rules are voted on.

## 7. Dashboard UI changes

Intentionally minimal — consumers are a separate spec.

- **Rules tab → Scoring sub-tab** (`index.html`): add a tiny footer line, e.g.
  `Scoring source: data/rules/2025.json`. Purpose: confirm the file is wired up
  and fetchable before any consumer is built. No other behavior change.
- Everything else — Rules tab layout, Settings editor in Commissioner Tools,
  `data/rules.json` — untouched.

## 8. Validation

A small validation function will run when a rules file is loaded (in the
future consumer spec, not this one). Its job:

- Ensure each `scoring.<code>` value has exactly one of the recognized shapes
  (`tiers`, `rate`, `points`+`yardage_bonus`, or `bonuses`-only).
- Ensure all `tiers` for a code are contiguous and non-overlapping, sorted by
  `min`.
- Ensure every `bonuses[].at` is strictly ascending.
- Ensure every `when` key in a `house_bonuses` entry is a known predicate.
- Ensure every tiebreaker key in `standings.tiebreakers` is recognized.

Validation is described here so the schema is stable, but the function lives
in the next spec (consumer build-out).

## 9. Migration & rollback

**Migration.** Purely additive. No existing file is modified.

**Rollback.** Delete `data/rules/2025.json`, `data/rules/2026.json`, and the
one-line "Scoring source" footer added to the Rules tab. Nothing else would
have changed.

## 10. Out of scope for this spec (follow-up work)

- **Scoring engine** — consumes `data/rules/<year>.json` + a play-by-play stat
  feed, returns per-player per-week fantasy points. Next spec.
- **Standings engine** — computes standings with tiebreakers from the same
  rules file plus matchup history. Subsequent spec.
- **Live PBP data pipeline** — separate work; feeds the scoring engine during
  the 2026 season.
- **Commissioner-tools editor for structured rules** — editable UI (dropdowns,
  number inputs, range rows) that writes to `data/rules/<year>.json`. Later
  spec; for now, edits are by hand in the JSON file.
- **Restructuring non-computable rules** (League Identity, Roster Limits, etc.)
  — stays in `data/rules.json`.
- **Keeper eligibility, playoff bracket, Loser Bowl, Finances, Teams &
  Managers** — all separate specs.
