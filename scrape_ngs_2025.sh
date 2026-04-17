#!/bin/bash
# Scrape all NFL Next Gen Stats for 2025 - Regular Season (18 wks) + Playoffs (4 rounds)
# Output: .firecrawl/ngs2025/{category}_{week}.md

BASE="https://nextgenstats.nfl.com/stats"
OUT="$(cd "$(dirname "$0")" && pwd)/.firecrawl/ngs2025"
WAIT=5000
BATCH=10  # concurrent scrapes at a time

# Categories: [slug, short_name]
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

# Build all week identifiers
REG_WEEKS=()
for w in $(seq 1 18); do REG_WEEKS+=("REG/$w"); done
POST_WEEKS=("POST/1" "POST/2" "POST/3" "POST/4")
ALL_WEEKS=("${REG_WEEKS[@]}" "${POST_WEEKS[@]}")

# Week label for filenames
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

total=0
pids=()

for slug in "${!CATS[@]}"; do
  name="${CATS[$slug]}"
  for wk in "${ALL_WEEKS[@]}"; do
    label=$(week_label "$wk")
    outfile="$OUT/${name}_${label}.md"

    # Skip if already scraped
    if [ -f "$outfile" ] && [ -s "$outfile" ]; then
      echo "SKIP: $name $label (exists)"
      continue
    fi

    url="$BASE/$slug/2025/$wk"
    firecrawl scrape "$url" --wait-for $WAIT --only-main-content -o "$outfile" > /dev/null 2>&1 &
    pids+=($!)
    total=$((total + 1))

    # Wait when batch is full
    if [ ${#pids[@]} -ge $BATCH ]; then
      echo "Waiting for batch of ${#pids[@]} scrapes..."
      wait "${pids[@]}"
      pids=()
    fi
  done
done

# Wait for any remaining
if [ ${#pids[@]} -gt 0 ]; then
  echo "Waiting for final batch of ${#pids[@]} scrapes..."
  wait "${pids[@]}"
fi

echo ""
echo "Done! Total scraped: $total"
echo "Files in $OUT:"
ls "$OUT" | wc -l
