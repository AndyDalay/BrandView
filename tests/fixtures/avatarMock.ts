import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Page, type Route, type Request } from '@playwright/test'

// Proyecto en ESM: no hay __dirname; se calcula desde import.meta.url.
const DIR = dirname(fileURLToPath(import.meta.url))

// Mock de la tabla `perfiles` (PostgREST) y del bucket `avatares` (Storage) para P9.
// El estado vive en memoria del test: una recarga de página ve la foto subida, como en producción.

export interface PerfilRow {
  id: string
  nombre: string
  avatar_path: string | null
  avatar_version: number
}

export interface AvatarMock {
  perfil: PerfilRow
  uploads: string[]
  patches: Record<string, unknown>[]
}

function supabaseUrl(): string {
  const url = process.env.VITE_SUPABASE_URL
  if (!url) throw new Error('Falta VITE_SUPABASE_URL para los tests de perfil.')
  return url.replace(/\/$/, '')
}

const TEST_PNG = readFileSync(join(DIR, 'avatar-test.png'))

/** Instala las rutas de perfiles y storage. Devuelve el estado para hacer aserciones. */
export async function mockPerfilesApi(page: Page, inicial: PerfilRow): Promise<AvatarMock> {
  const base = supabaseUrl()
  const mock: AvatarMock = { perfil: { ...inicial }, uploads: [], patches: [] }

  // Tabla perfiles: GET (object si pide maybeSingle, array si no) y PATCH (update)
  await page.route(`${base}/rest/v1/perfiles**`, async (route: Route, request: Request) => {
    if (request.method() === 'PATCH') {
      const body = request.postDataJSON() as Record<string, unknown>
      mock.patches.push(body)
      Object.assign(mock.perfil, body)
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: mock.perfil.id }]) })
    }
    const accept = request.headers()['accept'] ?? ''
    const payload = accept.includes('pgrst.object') ? mock.perfil : [mock.perfil]
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) })
  })

  // Storage: subida (POST), borrado (DELETE o POST de remove) y lectura pública (GET)
  await page.route(`${base}/storage/v1/**`, async (route: Route, request: Request) => {
    const url = new URL(request.url())
    const method = request.method()
    if (url.pathname.startsWith('/storage/v1/object/public/avatares/')) {
      return route.fulfill({ status: 200, contentType: 'image/png', body: TEST_PNG })
    }
    if (url.pathname.startsWith('/storage/v1/object/avatares/') && method === 'POST') {
      mock.uploads.push(decodeURIComponent(url.pathname.replace('/storage/v1/object/', '')))
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: 'avatares/ok' }) })
    }
    if (url.pathname === '/storage/v1/object/avatares' || url.pathname.startsWith('/storage/v1/object/avatares/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    }
    return route.fallback()
  })

  return mock
}

export const TEST_IMAGE_PATH = join(DIR, 'avatar-test.png')
