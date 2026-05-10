#!/usr/bin/env node
/**
 * Migrate finance data from MongoDB (JSON export) into local D1.
 *
 * Usage:
 *   node scripts/migrate-mongo-to-d1.mjs
 *
 * Expects:
 *   - /tmp/mongo_export_clean.json  (produced by the mongosh export step)
 *   - An existing D1 user in the local database
 */
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';

const WRANGLER_CFG = 'wrangler.jsonc';
const DB_NAME = 'finance-monitor-db';
const EXPORT_PATH = '/tmp/mongo_export_clean.json';
const SQL_OUT = '/tmp/migrate_to_d1.sql';

// ── Load data ──
const data = JSON.parse(readFileSync(EXPORT_PATH, 'utf-8'));
const { user: mongoUser, accounts, transactions, merchants } = data;

console.log(`Loaded: 1 user, ${accounts.length} accounts, ${transactions.length} transactions, ${merchants.length} merchant categories`);

// ── Resolve existing D1 user ──
const d1UserRaw = execSync(
  `npx wrangler d1 execute ${DB_NAME} --local --command "SELECT id FROM users LIMIT 1;" --config ${WRANGLER_CFG} --json`,
  { encoding: 'utf-8' }
);
const d1Result = JSON.parse(d1UserRaw);
const d1UserId = d1Result[0]?.results?.[0]?.id;
if (!d1UserId) {
  console.error('No existing user found in D1. Register first, then run this script.');
  process.exit(1);
}
console.log(`D1 user id: ${d1UserId}`);

// ── Build ID mappings (Mongo ObjectId → new UUID) ──
const accountIdMap = new Map();
for (const acct of accounts) {
  accountIdMap.set(acct.mongo_id, randomUUID());
}

// ── SQL helpers ──
function esc(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  return "'" + String(v).replace(/'/g, "''") + "'";
}

const stmts = [];

// 1. Update existing user: copy encryption_key, username, timestamps from Mongo
stmts.push(
  `UPDATE users SET encryption_key = ${esc(mongoUser.encryption_key)}, username = ${esc(mongoUser.username)}, two_factor_enabled = ${mongoUser.two_factor_enabled}, two_factor_secret = ${esc(mongoUser.two_factor_secret)}, zip_code = ${esc(mongoUser.zip_code)}, created_at = ${esc(mongoUser.created_at)}, updated_at = ${esc(mongoUser.updated_at)} WHERE id = ${esc(d1UserId)};`
);

// 2. Bank accounts
for (const a of accounts) {
  const id = accountIdMap.get(a.mongo_id);
  stmts.push(
    `INSERT INTO bank_accounts (id, user_id, plaid_item_id, plaid_account_id, plaid_access_token, name, type, subtype, mask, balance, available_balance, currency, last_transaction_sync, initial_sync_complete, sync_cursor, earliest_transaction, total_transactions, created_at, updated_at) VALUES (${esc(id)}, ${esc(d1UserId)}, ${esc(a.plaid_item_id)}, ${esc(a.plaid_account_id)}, ${esc(a.plaid_access_token)}, ${esc(a.name)}, ${esc(a.type)}, ${esc(a.subtype)}, ${esc(a.mask)}, ${a.balance ?? 'NULL'}, ${a.available_balance ?? 'NULL'}, ${esc(a.currency)}, ${esc(a.last_transaction_sync)}, ${a.initial_sync_complete}, ${esc(a.sync_cursor)}, ${esc(a.earliest_transaction)}, ${a.total_transactions}, ${esc(a.created_at)}, ${esc(a.updated_at)});`
  );
}

// 3. Transactions
for (const t of transactions) {
  const newAccountId = accountIdMap.get(t.account_id);
  if (!newAccountId) {
    console.warn(`Skipping txn ${t.plaid_transaction_id}: unknown account_id ${t.account_id}`);
    continue;
  }
  const id = randomUUID();
  stmts.push(
    `INSERT INTO transactions (id, account_id, plaid_transaction_id, name, amount, currency, category, date, pending, created_at, updated_at) VALUES (${esc(id)}, ${esc(newAccountId)}, ${esc(t.plaid_transaction_id)}, ${esc(t.name)}, ${t.amount}, ${esc(t.currency)}, ${esc(t.category)}, ${esc(t.date)}, ${t.pending}, ${esc(t.created_at)}, ${esc(t.updated_at)});`
  );
}

// 4. Merchant categories
for (const m of merchants) {
  const id = randomUUID();
  stmts.push(
    `INSERT INTO merchant_categories (id, user_id, merchant_name, category, created_at, updated_at) VALUES (${esc(id)}, ${esc(d1UserId)}, ${esc(m.merchant_name)}, ${esc(m.category)}, ${esc(m.created_at)}, ${esc(m.updated_at)});`
  );
}

console.log(`Generated ${stmts.length} SQL statements`);

// Write SQL file
writeFileSync(SQL_OUT, stmts.join('\n'), 'utf-8');
console.log(`SQL written to ${SQL_OUT}`);

// Execute against local D1
console.log('Executing migration against local D1...');
try {
  const result = execSync(
    `npx wrangler d1 execute ${DB_NAME} --local --file ${SQL_OUT} --config ${WRANGLER_CFG}`,
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
  );
  console.log(result);
  console.log('✅ Migration complete!');
} catch (err) {
  console.error('Migration failed:', err.stderr || err.message);
  console.error('SQL file preserved at', SQL_OUT, 'for manual inspection.');
  process.exit(1);
}
