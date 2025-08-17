#!/usr/bin/env bash
set -Eeuo pipefail
umask 022

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
  --include '/favicon.ico' \
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

# show release contents for debugging
echo "▶ Release contents:"
sudo ls -la "$RELEASES/$STAMP"

# ── harden perms & preflight readability (as nginx user) ────────────────
echo "▶ Fix ownership/permissions and preflight readability"
sudo chown -R root:root "$RELEASES/$STAMP"
sudo find "$RELEASES/$STAMP" -type d -exec chmod 0755 {} +
sudo find "$RELEASES/$STAMP" -type f -exec chmod 0644 {} +

# If the nginx user is different on your system, adjust here
NGINX_USER="nginx"
if id "$NGINX_USER" >/dev/null 2>&1; then
  sudo -u "$NGINX_USER" test -r "$RELEASES/$STAMP/index.html" || { echo "✗ nginx user cannot read index.html"; exit 1; }
else
  echo "! Warn: nginx user '$NGINX_USER' not found; skipping readability check"
fi

# ── flip symlink (with rollback trap) ───────────────────────────────────
echo "▶ Flip symlink"
# Save previous target for potential rollback
prev="$(readlink -f "$CURRENT" 2>/dev/null || true)"
if [[ -n "$prev" ]]; then
  echo "  Previous release: $prev"
fi

# FIXED: Remove old symlink first, then create new one atomically
if [[ -L "$CURRENT" ]]; then
  sudo rm -f "$CURRENT"
fi
sudo ln -sfn "$RELEASES/$STAMP" "$CURRENT"

# Verify the symlink is correct
echo "▶ Verify symlink"
if [[ ! -L "$CURRENT" ]]; then
  echo "✗ $CURRENT is not a symlink"
  exit 1
fi

LINK_TARGET="$(readlink -f "$CURRENT")"
echo "  Current → $LINK_TARGET"

# Ensure the symlink points to the right place
if [[ "$LINK_TARGET" != "$RELEASES/$STAMP" ]]; then
  echo "✗ Symlink points to wrong location"
  echo "  Expected: $RELEASES/$STAMP"
  echo "  Got: $LINK_TARGET"
  exit 1
fi

# Ensure the flipped target is actually valid
if ! sudo test -f "$CURRENT/index.html"; then
  echo "✗ current release missing index.html; rolling back"
  if [[ -n "${prev:-}" ]] && [[ -d "$prev" ]]; then
    sudo ln -sfn "$prev" "$CURRENT"
  fi
  exit 1
fi

# Setup rollback function
rollback() {
  echo "⚠️  Rolling back symlink to previous release"
  if [[ -n "${prev:-}" ]] && [[ -d "$prev" ]]; then
    sudo ln -sfn "$prev" "$CURRENT"
    echo "  Rolled back to: $prev"
  else
    echo "  No previous release to rollback to"
  fi
}
trap 'rollback' ERR

# ── selinux restore (safe if SELinux is permissive/disabled) ────────────
echo "▶ Restore SELinux context"
sudo restorecon -Rv "$RELEASES/$STAMP" >/dev/null 2>&1 || true
sudo restorecon -v  "$CURRENT" >/dev/null 2>&1 || true

# ── quick health check (non-fatal) ─────────────────────────────────────
if command -v curl >/dev/null 2>&1; then
  echo "▶ Health check: GET https://$SITE/"
  if curl -fsS -o /dev/null -w "  Status: %{http_code}\n" "https://$SITE/" --max-time 5; then
    echo "  ✓ Site responding"
  else
    echo "  ⚠ Site health check failed (non-fatal)"
  fi
fi

# ── nginx reload (only if config passes) ────────────────────────────────
echo "▶ Test & reload Nginx"
if sudo nginx -t 2>/dev/null; then
  sudo systemctl reload nginx
  echo "  ✓ Nginx reloaded"
else
  echo "✗ nginx -t failed"
  exit 1
fi

# ── prune old releases ──────────────────────────────────────────────────
echo "▶ Prune old releases (keep $KEEP)"
# FIXED: Exclude the current release from pruning
CURRENT_RELEASE="$(basename "$(readlink -f "$CURRENT")")"
OLD_RELEASES=$(sudo bash -c "ls -1dt $RELEASES/* 2>/dev/null | grep -v '$CURRENT_RELEASE' | tail -n +$((KEEP+1))" || true)
if [[ -n "$OLD_RELEASES" ]]; then
  echo "$OLD_RELEASES" | while read -r old_release; do
    echo "  Removing: $(basename "$old_release")"
  done
  echo "$OLD_RELEASES" | sudo xargs -r rm -rf
else
  echo "  No old releases to prune"
fi

echo "✓ Deployed $STAMP → $SITE"
echo "  Live at: https://$SITE/"