#!/bin/bash
# scrape_ngs_missing.sh <year>
# Fills in the 4 categories that bash associative arrays miss on Windows Git Bash:
#   receiving, fastest_ball_carriers, fastest_sacks, longest_tackles
# Usage: bash scrape_ngs_missing.sh 2024

YEAR=${1:?Usage: scrape_ngs_missing.sh <year>}
BASE="https://nextgenstats.nfl.com/stats"
OUT="/c/Users/Chris/OneDrive/Desktop/sbt-dashboard/.firecrawl/ngs${YEAR}"
WAIT=5000
BATCH=10

mkdir -p "$OUT"

if [ "$YEAR" -ge 2021 ]; then
  REG_WEEKS=18
else
  REG_WEEKS=17
fi

# Build week list
ALL_WEEKS=()
for w in $(seq 1 $REG_WEEKS); do ALL_WEEKS+=("REG/$w"); done
ALL_WEEKS+=("POST/1" "POST/2" "POST/3" "POST/4")

week_label() {
  local wk=$1
  case "$wk" in
    REG/*) echo "reg_wk$(echo $wk | cut -d/ -f2)" ;;
    POST/1) echo "post_wc" ;;
    POST/2) echo "post_div" ;;
    POST/3) echo "post_conf" ;;
    POST/4) echo "post_sb" ;;
  esac
}

# Explicit list — avoids bash associative array issues on Windows Git Bash
# Covers all 10 categories; existing files are skipped automatically
SLUGS=(
  "passing"
  "rushing"
  "receiving"
  "top-plays/fastest-ball-carriers"
  "top-plays/longest-plays"
  "top-plays/fastest-sacks"
  "top-plays/longest-tackles"
  "top-plays/improbable-completions"
  "top-plays/yac"
  "top-plays/remarkable-rushes"
)
NAMES=(
  "passing"
  "rushing"
  "receiving"
  "fastest_ball_carriers"
  "longest_plays"
  "fastest_sacks"
  "longest_tackles"
  "improbable_completions"
  "incredible_yac"
  "remarkable_rushes"
)

total=0
skipped=0
pids=()

for i in "${!SLUGS[@]}"; do
  slug="${SLUGS[$i]}"
  name="${NAMES[$i]}"
  for wk in "${ALL_WEEKS[@]}"; do
    label=$(week_label "$wk")
    outfile="$OUT/${name}_${label}.md"

    if [ -f "$outfile" ] && [ -s "$outfile" ]; then
      skipped=$((skipped + 1))
      continue
    fi

    url="$BASE/$slug/$YEAR/$wk"
    echo "  Scraping $name $wk"
    firecrawl scrape "$url" --wait-for $WAIT --only-main-content -o "$outfile" > /dev/null 2>&1 &
    pids+=($!)
    total=$((total + 1))

    if [ ${#pids[@]} -ge $BATCH ]; then
      echo "  Batch done (${total} scraped so far)..."
      wait "${pids[@]}"
      pids=()
    fi
  done
done

[ ${#pids[@]} -gt 0 ] && wait "${pids[@]}"

echo ""
echo "Scraped: $total new | Skipped: $skipped existing"
echo ""
echo "File counts for $YEAR:"
for name in passing rushing receiving fastest_ball_carriers longest_plays fastest_sacks longest_tackles improbable_completions incredible_yac remarkable_rushes; do
  count=$(ls "$OUT" | grep "^${name}_" | wc -l)
  echo "  $name: $count / 22"
done

echo ""
echo "Running parse_ngs.py $YEAR ..."
cd /c/Users/Chris/OneDrive/Desktop/sbt-dashboard
python parse_ngs.py "$YEAR"
