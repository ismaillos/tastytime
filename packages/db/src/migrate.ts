import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import path from 'path'

const sql = postgres(process.env.DATABASE_URL!, { max: 1 })
const db = drizzle(sql)

async function main() {
  console.log('Running migrations...')
  await migrate(db, { migrationsFolder: path.join(__dirname, 'migrations') })
  console.log('Migrations complete.')
  await sql.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
