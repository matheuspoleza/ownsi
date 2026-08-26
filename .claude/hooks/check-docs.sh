#!/usr/bin/env bash
# Runs the docs guardrails after an edit under apps/docs, so drift is fixed in the same
# turn rather than at review time. Exit 2 feeds the output back into the session.
set -uo pipefail

path=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null)

case "$path" in
  */apps/docs/*) ;;
  *) exit 0 ;;
esac

root="$(cd "$(dirname "$0")/../.." && pwd)"
docs="$root/apps/docs"
report=$(mktemp)
failed=0

case "$path" in
  */apps/docs/openapi.json)
    printf 'apps/docs/openapi.json is generated. Change the route schema in apps/api and run `bun run docs:emit`.\n' >>"$report"
    failed=1
    ;;
  */apps/docs/diagnostics/catalogue.mdx)
    printf 'apps/docs/diagnostics/catalogue.mdx is generated. Change `explain()` in apps/api/src/verification/domain/diagnosis.ts and run `bun run docs:emit`.\n' >>"$report"
    failed=1
    ;;
esac

pages=$(find "$docs" -name "*.mdx" -not -path "*/node_modules/*" -not -path "*/.turbo/*" -not -path "*/diagnostics/catalogue.mdx")

banned() {
  local label="$1" pattern="$2"
  local hits
  hits=$(printf '%s\n' "$pages" | xargs grep -nEI "$pattern" 2>/dev/null | sed "s|$root/||")
  if [ -n "$hits" ]; then
    printf '%s\n%s\n\n' "$label" "$hits" >>"$report"
    failed=1
  fi
}

banned "Marketing vocabulary and AI tells — say the true thing instead:" \
  "\b([Cc]omprehensive|[Ss]eamless(ly)?|[Rr]obust|[Pp]owerful|cutting-edge|[Ll]everages?|[Uu]tilize[sd]?|[Ee]ffortless(ly)?|[Ss]imply|serves as|functions as|is designed to|aims to|allows you to|enables you to|[Ii]n order to|[Ii]t is important to note)\b"

banned "Link text that names no destination:" \
  "\[([Ll]earn more|[Cc]lick here)\]"

banned "Markdown in a <Step title> — Mintlify renders it literally, move it to the body:" \
  '<Step title="[^"]*(\*\*|\[|`)'

banned "Angle-bracket email autolink — the < opens a JSX tag and fails the page. Use [name](mailto:name):" \
  '<[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}>'

banned "Mintlify preview hostname — link the relative path instead:" \
  'https?://[a-z0-9-]+\.mintlify\.app'

spelling=$(printf '%s\n' "$pages" | while read -r page; do
  awk '
    /^[[:space:]]*```/ { fenced = !fenced; next }
    fenced { next }
    { line = $0; gsub(/`[^`]*`/, "", line); print FILENAME ":" NR ":" line }
  ' "$page"
done | grep -EiI "\b(organiz|recogniz|summariz|categoriz|prioritiz|customiz|minimiz|maximiz|standardiz|realiz|emphasiz|specializ|generaliz|characteriz|analyz)(e|es|ed|ing|ation|ations)\b|\bbehaviors?\b" | sed "s|$root/||")
if [ -n "$spelling" ]; then
  printf 'American spelling — the docs and the source are British:\n%s\n\n' "$spelling" >>"$report"
  failed=1
fi

codes=$(grep -oE 'readonly code: "[a-z_]+"' "$root/apps/api/src/verification/domain/diagnosis.ts" | grep -oE '"[a-z_]+"' | tr -d '"')

unlinked=$(printf '%s\n' "$pages" | while read -r page; do
  grep -qF "/diagnostics/catalogue" "$page" && continue
  prose=$(awk '/^[[:space:]]*```/ { fenced = !fenced; next } !fenced' "$page")
  for code in $codes; do
    printf '%s' "$prose" | grep -qE "\b$code\b" || continue
    printf '%s: %s\n' "${page#"$root/"}" "$code"
  done
done)
if [ -n "$unlinked" ]; then
  printf 'Diagnosis code named on a page that never links the catalogue — link the first mention as [`code`](/diagnostics/catalogue#code):\n%s\n\n' "$unlinked" >>"$report"
  failed=1
fi

(cd "$docs" && bun test) >>"$report" 2>&1 || failed=1

if [ "$failed" -ne 0 ]; then
  printf 'Docs guardrails failed. Fix before continuing:\n\n%s\n' "$(cat "$report")" >&2
  rm -f "$report"
  exit 2
fi

rm -f "$report"
