import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

function createMigration(name?: string) {
  // Generate timestamp in YYYYMMDDHHMMSS format
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/[T.]/g, '')
    .slice(0, 14)

  const migrationsDir = join(process.cwd(), 'migrations')

  // Ensure migrations directory exists
  mkdirSync(migrationsDir, { recursive: true })

  // Create filename
  const filename = `${timestamp}.sql`
  const filepath = join(migrationsDir, filename)

  // Create migration file with optional description
  const content = name
    ? `-- Migration: ${name}\n-- Timestamp: ${timestamp}\n\n`
    : `-- Timestamp: ${timestamp}\n\n`

  writeFileSync(filepath, content)
  console.log(`✅ Created migration file: ${filename}`)
}

// Get optional name argument
const name = process.argv[2]
createMigration(name)
