#!/usr/bin/env bash
set -Eeuo pipefail

# ── config ──────────────────────────────────────────────────────────────
SITE="cob.musicsian.com"
WEB_ROOT="/var/www/$SITE"
RELEASES="$WEB_ROOT/releases"
CURRENT="$WEB_ROOT/current"
STAMP="${1:-$(date +%Y-%m-%d-%H%M%S)}"   # you can pass a stamp manually if you want
KEEP="${KEEP:-10}"                       # how many releases to keep
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
STAGE="${STAGE_DIR:-$HOME/builds/$SITE/$STAMP}"

# ── ensure dirs exist ───────────────────────────────────────────────────
echo "▶ Ensure web root"
sudo install -d -m 0755 "$WEB_ROOT"
sudo install -d -m 0755 "$RELEASES"

# ── stage ───────────────────────────────────────────────────────────────
echo "▶ Stage files → $STAGE"
mkdir -p "$STAGE"
# Only ship the static site files we care about
rsync -az --delete \
  --include '/index.html' \
  --include '/css/***' \
  --include '/js/***' \
  --exclude '*' \
  "$PROJECT_DIR"/ "$STAGE"/

echo "▶ Verify staged content"
ls -l "$STAGE"
test -f "$STAGE/index.html" || { echo "✗ index.html missing in stage"; exit 1; }
test -d "$STAGE/css"        || { echo "✗ css/ missing in stage"; exit 1; }
test -d "$STAGE/js"         || { echo "✗ js/ missing in stage";  exit 1; }

# ── publish ─────────────────────────────────────────────────────────────
echo "▶ Publish → $RELEASES/$STAMP"
sudo rsync -az --delete "$STAGE"/ "$RELEASES/$STAMP"/

echo "▶ Verify release contents"
sudo test -f "$RELEASES/$STAMP/index.html" || { echo "✗ index.html missing in release"; exit 1; }
sudo test -d "$RELEASES/$STAMP/css"        || { echo "✗ css/ missing in release"; exit 1; }
sudo test -d "$RELEASES/$STAMP/js"         || { echo "✗ js/ missing in release";  exit 1; }

# ── flip symlink (with rollback trap) ───────────────────────────────────
echo "▶ Flip symlink"
prev="$(readlink -f "$CURRENT" || true)"
sudo ln -nfs "$RELEASES/$STAMP" "$CURRENT"

rollback() {
  echo "⚠️  Rolling back symlink to previous release"
  [[ -n "${prev:-}" ]] && sudo ln -nfs "$prev" "$CURRENT"
}
trap 'rollback' ERR

# ── selinux restore (safe if SELinux is permissive/disabled) ────────────
echo "▶ Restore SELinux context"
sudo restorecon -Rv "$RELEASES/$STAMP" >/dev/null || true
sudo restorecon -v  "$CURRENT"         >/dev/null || true

# ── nginx reload (only if config passes) ────────────────────────────────
echo "▶ Test & reload Nginx"
if sudo nginx -t; then
  sudo systemctl reload nginx
else
  echo "✗ nginx -t failed"; exit 1
fi

# ── prune old releases ──────────────────────────────────────────────────
echo "▶ Prune old releases (keep $KEEP)"
sudo bash -c "ls -1dt $RELEASES/* 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -rf"

echo "✓ Deployed $STAMP → $SITE"