#!/bin/bash
set -e
echo "=== FlowBoard Deploy ==="
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RELEASE_DIR="/opt/projects/flowboard/releases/v${TIMESTAMP}"
cd /opt/projects/flowboard
git clone git@github-autoveoup:honvu93/flowboard.git --branch main --single-branch --depth 1 "$RELEASE_DIR"
cd "$RELEASE_DIR"
npm install --omit=dev
npx prisma generate
npx prisma db push --accept-data-loss
cd web && pnpm install && pnpm build && cd ..
ln -sfn "$RELEASE_DIR" /opt/projects/flowboard/current
pm2 reload ecosystem.flowboard.config.cjs --update-env
echo "=== Deploy complete: $TIMESTAMP ==="
