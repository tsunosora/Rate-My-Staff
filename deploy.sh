#!/usr/bin/env bash
#
# Deploy Rate-My-Staff di homelab (PM2).
# Jalankan dari root repo:  ./deploy.sh
#
# Idempoten & aman: git pull -> install -> migrasi DB -> build -> (re)start PM2.
# Berhenti pada error pertama; tak akan restart app bila build gagal.
#
# Konfigurasi opsional (env):
#   DEPLOY_BRANCH   branch yang di-deploy (default: main)
#
set -euo pipefail

# Selalu bekerja dari lokasi skrip (root repo), apa pun cwd pemanggil.
cd "$(dirname "$0")"

BRANCH="${DEPLOY_BRANCH:-main}"

echo "==> [1/5] Ambil kode terbaru (origin/$BRANCH)"
git fetch origin "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> [2/5] Install dependency (npm ci)"
# --include=dev: build butuh devDependencies (typescript, dsb) walau NODE_ENV=production.
npm ci --include=dev

echo "==> [3/5] Migrasi database (prisma migrate deploy)"
npm run db:deploy

echo "==> [4/5] Build produksi (prisma generate && next build)"
npm run build

echo "==> [5/5] (Re)start PM2 dari ecosystem.config.cjs"
# startOrReload: start bila belum jalan, zero-downtime reload bila sudah.
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

echo "==> Selesai."
pm2 status ratemystaff || true
