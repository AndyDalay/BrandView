import { type Page, type Route } from '@playwright/test'

// Mock de Supabase Auth para P2. No hay login real de Google ni llamadas a Google.
// La URL de Supabase sale de VITE_SUPABASE_URL (cargada por playwright.config.ts con dotenv).

export type MockUser = { id: string; is_anonymous: boolean }

function supabaseUrl(): string {
  const url = process.env.VITE_SUPABASE_URL
  if (!url) throw new Error('Falta VITE_SUPABASE_URL para los tests de auth.')
  return url.replace(/\/$/, '')
}

/** Clave que usa supabase-js para guardar la sesión: sb-<primer segmento del host>-auth-token. */
function storageKey(): string {
  const host = new URL(supabaseUrl()).hostname
  return `sb-${host.split('.')[0]}-auth-token`
}

/** Siembra una sesión (anónima o con Google) antes de cargar la app. */
export async function seedSession(page: Page, user: MockUser) {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600
  const session = {
    access_token: 'mock.access.token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: expiresAt,
    refresh_token: 'mock-refresh',
    user: {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      is_anonymous: user.is_anonymous,
      app_metadata: { provider: user.is_anonymous ? 'anonymous' : 'google' },
      user_metadata: {},
      identities: [],
      created_at: new Date().toISOString(),
    },
  }
  const key = storageKey()
  await page.addInitScript(
    ({ key, value }) => {
      try {
        window.localStorage.setItem(key, value)
      } catch {
        /* sin localStorage no hay sesión sembrada */
      }
    },
    { key, value: JSON.stringify(session) },
  )
}

export type AuthCalls = { oauth: string[]; link: string[] }

/**
 * Intercepta /auth/v1/** y registra a qué endpoint llega cada login:
 * - `authorize` (signInWithOAuth) → calls.oauth
 * - `user/identities/authorize` (linkIdentity) → calls.link
 * Responde con una página vacía para no navegar a Google.
 */
export async function mockAuthEndpoints(page: Page): Promise<AuthCalls> {
  const calls: AuthCalls = { oauth: [], link: [] }
  const base = supabaseUrl()

  await page.route(`${base}/auth/v1/**`, async (route: Route) => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/user/identities/authorize')) {
      calls.link.push(url.toString())
    } else if (url.pathname.endsWith('/authorize')) {
      calls.oauth.push(url.toString())
    }
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>mock</body></html>' })
  })

  return calls
}
