import { defineConfig } from 'drizzle-kit'

const databaseUrl = process.env.NUXT_DATABASE_URL

if (!databaseUrl) {
  throw new Error('NUXT_DATABASE_URL is required')
}

export default defineConfig({
  out: './drizzle',
  schema: './server/database/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
})
