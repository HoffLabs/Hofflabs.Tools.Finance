#!/usr/bin/env bash
set -euo pipefail

# Migrate the local D1 dev database, then start Next.js dev server
echo "🗄️  Migrating local D1 database..."
npx wrangler d1 execute finance-monitor-db --local --file=./migrations/0001_initial.sql 2>&1

echo "✅ Migration complete"
echo ""

# Load secrets from .dev.vars into the Next.js dev server
export $(grep -v '^#' .dev.vars | xargs)
exec npx next dev "$@"
