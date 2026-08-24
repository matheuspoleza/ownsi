#!/usr/bin/env bash
# Runs the web guardrails after an edit under apps/web, so drift is fixed in the same
# turn rather than at review time. Exit 2 feeds the output back into the session.
set -uo pipefail

path=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null)

case "$path" in
  */apps/web/src/*|*/apps/web/test/*) ;;
  *) exit 0 ;;
esac

cd "$(dirname "$0")/../../apps/web" || exit 0

report=$(mktemp)
failed=0

bunx biome check src test >>"$report" 2>&1 || failed=1
bun test test/conventions.test.ts >>"$report" 2>&1 || failed=1

if [ "$failed" -ne 0 ]; then
  printf 'Web guardrails failed. Fix before continuing:\n\n%s\n' "$(cat "$report")" >&2
  rm -f "$report"
  exit 2
fi

rm -f "$report"
