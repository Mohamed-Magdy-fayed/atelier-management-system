#!/usr/bin/env bash
# Logical backup of one client database.
#   DATABASE_URL=postgres://... ./scripts/backup-db.sh [output-dir]
# Writes <dir>/atelier-<UTC timestamp>.dump (pg_dump custom format).
# Restore into an EMPTY database with:
#   pg_restore --no-owner --clean --if-exists -d "$TARGET_URL" <file>
# Run a restore into a scratch Neon branch at least once per client before they
# go live, and again after any schema migration you are nervous about.
set -euo pipefail

: "${DATABASE_URL:?set DATABASE_URL to the client database}"
dir="${1:-backups}"
mkdir -p "$dir"
out="$dir/atelier-$(date -u +%Y%m%dT%H%M%SZ).dump"

pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" --file "$out"
echo "wrote $out ($(du -h "$out" | cut -f1))"
