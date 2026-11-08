import { type Page } from '@playwright/test'

// Mismos nombres que usa src/lib/db.ts. Si cambian allí, cambian aquí.
const DB_NAME = 'grandbrandview'
const STORE = 'manuales'

/**
 * Inserta un manual local en IndexedDB para poder probar el borrado real.
 * Hay que llamarlo estando ya en el origen de la app (p. ej. tras page.goto('/')).
 */
export async function seedLocalManual(page: Page, id: string, nombre: string) {
  await page.evaluate(
    async ({ id, nombre, DB_NAME, STORE }) => {
      const db: IDBDatabase = await new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1)
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(STORE)) {
            req.result.createObjectStore(STORE, { keyPath: 'id' })
          }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      const svg = (fill: string) =>
        new Blob(
          [`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420"><rect width="300" height="420" fill="${fill}"/></svg>`],
          { type: 'image/svg+xml' },
        )
      const paginas = [
        { blob: svg('#225dff'), w: 300, h: 420 },
        { blob: svg('#ffffff'), w: 300, h: 420 },
        { blob: svg('#ffffff'), w: 300, h: 420 },
      ]
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).put({ id, nombre, createdAt: Date.now(), paginas })
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()
    },
    { id, nombre, DB_NAME, STORE },
  )
}

/** Borra el manual local sembrado. Tolerante a errores: se usa en afterEach. */
export async function removeLocalManual(page: Page, id: string) {
  await page.evaluate(
    async ({ id, DB_NAME, STORE }) => {
      try {
        const db: IDBDatabase = await new Promise((resolve, reject) => {
          const req = indexedDB.open(DB_NAME, 1)
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })
        if (db.objectStoreNames.contains(STORE)) {
          await new Promise<void>((resolve) => {
            const tx = db.transaction(STORE, 'readwrite')
            tx.objectStore(STORE).delete(id)
            tx.oncomplete = () => resolve()
            tx.onerror = () => resolve()
          })
        }
        db.close()
      } catch {
        /* sin IndexedDB disponible: nada que limpiar */
      }
    },
    { id, DB_NAME, STORE },
  )
}
