import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Parse .env.local manually since dotenv isn't installed
const envPath = resolve(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const match = envContent.match(/MONGODB_URI=["']?([^"'\n]+)["']?/)
const uri = match?.[1] || process.env.MONGODB_URI

if (!uri) {
  console.error('MONGODB_URI not found in .env.local')
  process.exit(1)
}

async function main() {
  const client = new MongoClient(uri!)
  await client.connect()
  const db = client.db()
  const collections = await db.listCollections().toArray()
  if (collections.length === 0) {
    console.log('No collections found — database is already empty.')
  } else {
    for (const col of collections) {
      await db.dropCollection(col.name)
      console.log('Dropped:', col.name)
    }
    console.log(`Done — dropped ${collections.length} collections.`)
  }
  await client.close()
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
