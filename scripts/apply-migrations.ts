import postgres from 'postgres'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

const connectionString = process.env.POSTGRES_URL_NON_POOLING

if (!connectionString) {
  console.error('❌ POSTGRES_URL_NON_POOLING is not set')
  process.exit(1)
}

const sql = postgres(connectionString)

async function applyMigrations() {
  const migrationsDir = join(process.cwd(), 'migrations')
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  console.log(`Found ${files.length} migration(s) to apply:\n`)

  for (const file of files) {
    const filePath = join(migrationsDir, file)
    const content = readFileSync(filePath, 'utf-8')

    console.log(`⏳ Applying ${file}...`)
    try {
      await sql.unsafe(content)
      console.log(`✅ Applied ${file}`)
    } catch (err: any) {
      if (
        err.message.includes('already exists') ||
        err.message.includes('duplicate')
      ) {
        console.log(`⏭️  Skipped ${file} (already applied)`)
      } else {
        console.error(`❌ Failed on ${file}: ${err.message}`)
        await sql.end()
        process.exit(1)
      }
    }
  }

  console.log('\n🎉 All migrations applied successfully!')
  await sql.end()
}

applyMigrations()
