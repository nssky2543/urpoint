const databaseUrl = process.env.NUXT_DATABASE_URL
const lineCredentialKey = process.env.NUXT_LINE_CREDENTIAL_KEY
const appUrl = process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000'

function getViteServerConfig() {
  const server: {
    allowedHosts: true | string[]
    origin?: string
    headers?: Record<string, string>
    hmr?: false | {
      protocol: 'ws' | 'wss'
      host: string
      clientPort: number
    }
  } = {
    allowedHosts: true,
  }

  try {
    const url = new URL(appUrl)
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    if (!isLocal) {
      server.origin = url.origin
      server.headers = { 'Cache-Control': 'no-store' }
      // Cloudflare tunnel does not reliably proxy Vite HMR websockets.
      // Keep the page interactive (theme toggle, forms) instead of live reload.
      server.hmr = false
    }
  }
  catch {
    // keep local Vite defaults when NUXT_PUBLIC_APP_URL is invalid
  }

  return server
}

function isLocalAppUrl() {
  try {
    const { hostname } = new URL(appUrl)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  }
  catch {
    return true
  }
}

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
  devtools: { enabled: isLocalAppUrl() },
  runtimeConfig: {
    databaseUrl,
    lineCredentialKey,
    googleClientId: process.env.NUXT_GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.NUXT_GOOGLE_CLIENT_SECRET || '',
    public: {
      appUrl,
    },
  },
  vite: {
    server: getViteServerConfig(),
  },
})
