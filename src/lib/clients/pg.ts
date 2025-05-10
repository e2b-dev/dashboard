import 'server-cli-only'

import postgres from 'postgres'

// Enhance globalThis to include our custom pg client type for TypeScript
declare global {
  // eslint-disable-next-line no-var
  var pgClient: postgres.Sql | undefined
}

let sql: postgres.Sql

if (process.env.NODE_ENV === 'production') {
  sql = postgres(process.env.DATABASE_URL, {
    // We use supabase transaction pooler url to connect to the database
    // Hence we disable prepared statements to avoid compatibility issues
    prepare: false,
    ssl: {
      rejectUnauthorized: false,
    },
    connect_timeout: 10000,
  })
} else {
  if (!global.pgClient) {
    global.pgClient = postgres(process.env.DATABASE_URL, {
      prepare: false,
      ssl: {
        rejectUnauthorized: false,
      },
    })
  }
  sql = global.pgClient
}

export default sql
