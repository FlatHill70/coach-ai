#!/usr/bin/env bash
# Installs or updates the Coach skill into ~/.claude/skills/coach from the latest GitHub release.
# Your data in ~/.coach is never touched.
set -euo pipefail

REPO="FlatHill70/coach"
VERSION="${COACH_VERSION:-latest}"
DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}/coach"

if [ "$VERSION" = "latest" ]; then
  URL="https://github.com/$REPO/releases/latest/download/coach-skill.zip"
else
  URL="https://github.com/$REPO/releases/download/$VERSION/coach-skill.zip"
fi

command -v node >/dev/null 2>&1 || { echo "Coach needs Node.js 20 or newer: https://nodejs.org" >&2; exit 1; }
command -v unzip >/dev/null 2>&1 || { echo "Please install unzip first." >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Downloading $URL"
curl -fsSL "$URL" -o "$TMP/coach-skill.zip"
unzip -q "$TMP/coach-skill.zip" -d "$TMP"
[ -f "$TMP/coach/SKILL.md" ] || { echo "The download does not look like the Coach skill." >&2; exit 1; }

mkdir -p "$(dirname "$DEST")"
if [ -d "$DEST" ]; then
  rm -rf "$DEST.previous"
  mv "$DEST" "$DEST.previous"
fi
mv "$TMP/coach" "$DEST"

VERSION_INSTALLED="$(sed -n 's/^ *version: *\([0-9.]*\).*/\1/p' "$DEST/SKILL.md" | head -n1)"
echo "Coach $VERSION_INSTALLED installed in $DEST"
[ -d "$DEST.previous" ] && echo "The previous version is kept in $DEST.previous"
echo "Start a new Claude Code session and type: /coach"
