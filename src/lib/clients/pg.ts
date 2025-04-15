import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL, {
  // We use supabase transaction pooler url to connect to the database
  // Hence we disable prepared statements to avoid compatibility issues
  prepare: false,
})

export default sql
