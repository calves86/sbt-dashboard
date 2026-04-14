#!/bin/bash
# scrape_ngs_year.sh <year>
# Scrapes all NGS stat categories for the given year.
# Outputs to .firecrawl/ngs{year}/
# Then runs parse_ngs.py for that year.

YEAR=${1:?Usage: scrape_ngs_year.sh <year>}
BASE="https://nextgenstats.nfl.com/stats"
OUT="/c/Users/Chris/OneDrive/Desktop/sbt-dashboard/.firecrawl/ngs${YEAR}"
WAIT=5000
BATCH=10

mkdir -p "$OUT"

# Season length by year
if [ "$YEAR" -ge 2021 ]; then
  REG_WEEKS=18
else
  REG_WEEKS=17
fi

# Category slug -> short name
declare -A CATS
CATS["passing"]="passing"
CATS["rushing"]="rushing"
CATS["receiving"]="receiving"
CATS["top-plays/fastest-ball-carriers"]="fastest_ball_carriers"
CATS["top-plays/longest-plays"]="longest_plays"
CATS["top-plays/fastest-sacks"]="fastest_sacks"
CATS["top-plays/longest-tackles"]="longest_tackles"
CATS["top-plays/improbable-completions"]="improbable_completions"
CATS["top-plays/yac"]="incredible_yac"
CATS["top-plays/remarkable-rushes"]="remarkable_rushes"

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

# Build week list
ALL_WEEKS=()
for w in $(seq 1 $REG_WEEKS); do ALL_WEEKS+=("REG/$w"); done
ALL_WEEKS+=("POST/1" "POST/2" "POST/3" "POST/4")

echo "Year: $YEAR | REG weeks: $REG_WEEKS | Total: $((${#ALL_WEEKS[@]} * ${#CATS[@]})) scrapes"

pids=()
total=0
skipped=0

for slug in "${!CATS[@]}"; do
  name="${CATS[$slug]}"
  for wk in "${ALL_WEEKS[@]}"; do
    label=$(week_label "$wk")
    outfile="$OUT/${name}_${label}.md"

    if [ -f "$outfile" ] && [ -s "$outfile" ]; then
      skipped=$((skipped + 1))
      continue
    fi

    url="$BASE/$slug/$YEAR/$wk"
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

echo "Scraped: $total new | Skipped: $skipped existing"
echo ""
echo "File counts:"
for name in passing rushing receiving fastest_ball_carriers longest_plays fastest_sacks longest_tackles improbable_completions incredible_yac remarkable_rushes; do
  count=$(ls "$OUT" | grep "^${name}_" | wc -l)
  echo "  $name: $count"
done
