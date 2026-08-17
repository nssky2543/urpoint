const databaseUrl = process.env.NUXT_DATABASE_URL
const lineCredentialKey = process.env.NUXT_LINE_CREDENTIAL_KEY
const appUrl = process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000'

if (!databaseUrl) {
  throw new Error('NUXT_DATABASE_URL is required')
}

if (!lineCredentialKey || !/^[0-9a-fA-F]{64}$/.test(lineCredentialKey)) {
  throw new Error('NUXT_LINE_CREDENTIAL_KEY must be a 64-character hex string (32 bytes)')
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  css: ['~/assets/css/main.css'],
  devtools: { enabled: true },
  runtimeConfig: {
    databaseUrl,
    lineCredentialKey,
    googleClientId: process.env.NUXT_GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.NUXT_GOOGLE_CLIENT_SECRET || '',
    public: {
      appUrl,
    },
  },
})
