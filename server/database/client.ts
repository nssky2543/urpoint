import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

let db: ReturnType<typeof drizzle> | undefined

export function useDb() {
  if (db) {
    return db
  }

  const { databaseUrl } = useRuntimeConfig()

  if (!databaseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_DATABASE_URL is not configured',
    })
  }

  // ponytail: one process-wide client is enough for local/dev; add pool options if concurrency grows
  const client = postgres(databaseUrl, { max: 1 })
  db = drizzle(client)
  return db
}
