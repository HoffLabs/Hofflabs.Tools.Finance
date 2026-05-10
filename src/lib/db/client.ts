import { getCloudflareContext } from '@opennextjs/cloudflare'

export type D1Database = ReturnType<typeof getD1Sync>

function getD1Sync() {
  // This is a type helper — actual usage is always via getDb()
  return null as unknown as import('@cloudflare/workers-types').D1Database
}

// Get the D1 database binding from Cloudflare context
export async function getDb() {
  const { env } = await getCloudflareContext({ async: true })
  const db = (env as Record<string, unknown>).DB as import('@cloudflare/workers-types').D1Database
  if (!db) {
    throw new Error('D1 database binding "DB" not found. Check wrangler.jsonc configuration.')
  }
  return db
}

// Helper to generate UUIDs for primary keys
export function generateId(): string {
  return crypto.randomUUID()
}

// Helper to get current ISO timestamp string
export function now(): string {
  return new Date().toISOString()
}

// Helper to build SQL placeholders for IN clauses
export function sqlPlaceholders(count: number): string {
  return Array(count).fill('?').join(', ')
}
