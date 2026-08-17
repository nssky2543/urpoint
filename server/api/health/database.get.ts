import { sql } from 'drizzle-orm'
import { useDb } from '../../database/client'

export default defineEventHandler(async () => {
  try {
    const db = useDb()
    await db.execute(sql`SELECT 1`)
    return { status: 'ok' as const }
  } catch (error) {
    console.error('database health check failed', error)
    throw createError({
      statusCode: 503,
      statusMessage: 'Database unavailable',
    })
  }
})
