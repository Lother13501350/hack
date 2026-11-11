#!/usr/bin/env bash
# Saves OPENAI_API_KEY to .env.local.
# The key is not echoed and never appears in shell history.
#   pnpm set-key
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -t 0 ]; then
  echo "Run this in an interactive terminal so you can paste the key." >&2
  exit 1
fi

read -rs -p "Paste your OpenAI API key, then press Enter: " key
echo
key="${key//[[:space:]]/}"
if [ -z "$key" ]; then
  echo "No key entered; nothing changed." >&2
  exit 1
fi

touch .env.local
tmp="$(mktemp .env.local.XXXXXX)"
grep -v '^OPENAI_API_KEY=' .env.local >"$tmp" || true
printf 'OPENAI_API_KEY=%s\n' "$key" >>"$tmp"
mv "$tmp" .env.local
chmod 600 .env.local
echo "Saved OPENAI_API_KEY to .env.local (${#key} characters)."
