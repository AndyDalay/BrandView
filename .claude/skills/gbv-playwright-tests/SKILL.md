---
name: gbv-playwright-tests
description: Usar al escribir, corregir o ejecutar tests E2E de Playwright en GrandBrandView (auth, perfil, avatar, galería, mocks de Supabase). Evita los errores que se repiten: ESM, variables VITE_ en .env.local, rutas de mock de PostgREST y Storage, upsert y políticas, inputs de archivo ocultos.
---

# Tests E2E en GrandBrandView

Objetivo: que el test pase a la primera. Antes de entregar, repasa la lista de comprobación.

## Entorno (ya comprobado en Windows)

- El proyecto es **ESM**. No uses `__dirname` ni `require`. Usa `dirname(fileURLToPath(import.meta.url))` desde `node:url`.
- Las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` viven en `.env.local` (y en `.env.test` si existe). `playwright.config.ts` debe cargar `.env.local` con dotenv. Si un test lee `process.env.VITE_*` y falla con "Falta VITE_...", revisa primero la carga de dotenv, no el test.
- Se ejecuta en Windows con `npx playwright test <archivo> --project=chromium`. Los reportes van a `playwright-report/` y los artefactos a `test-results/`.
- Antes de dar por bueno un test, ejecútalo (o pide al usuario la salida exacta). No entregues tests sin ejecutar sin marcarlo como pendiente en STATE.md.

## Mocks de Supabase

- **Auth:** nunca llames a Google. Siembra la sesión en `localStorage` con la clave `sb-<primer segmento del host>-auth-token` y `user.is_anonymous` según el caso. Intercepta `**/auth/v1/**`. `linkIdentity` llega a `/user/identities/authorize`; `signInWithOAuth` llega a `/authorize`. Distingue ambos por la ruta.
- **PostgREST (`/rest/v1/tabla`):** `maybeSingle()` pide `Accept: application/vnd.pgrst.object+json` y espera un objeto. `select()` sin maybeSingle espera un array. Un `update().select()` devuelve array. Responde según la cabecera `accept`.
- **Storage:** `upload` es `POST /storage/v1/object/<bucket>/<ruta>`. `remove` es `DELETE /storage/v1/object/<bucket>` con cuerpo `{prefixes}`. La lectura pública es `GET /storage/v1/object/public/<bucket>/<ruta>`. Sirve bytes reales de imagen (`image/png`) en la lectura pública.
- Guarda el estado del mock en un objeto en memoria dentro del test. Así una recarga (`page.reload()`) ve los cambios, como en producción.
- Usa globs con `**` (por ejemplo `**/rest/v1/perfiles**`). Si una ruta no es tuya, llama a `route.fallback()`.

## Supabase en producción: lo que hay que saber

- `upsert` en Storage exige política SELECT además de INSERT y UPDATE. Si falta, la subida falla. Prefiere un nombre de archivo único por subida y no uses upsert.
- Storage sin política de borrado no devuelve error: simplemente no borra. Compara el número de archivos borrados con los pedidos.
- Las políticas RLS de `storage.objects` usan `storage.foldername(name)[1]` para la carpeta del dueño.

## Interacción con la UI

- Inputs de archivo ocultos (`className="hidden"`): usa `setInputFiles(ruta)` sobre el `data-testid`. No intentes hacer clic en el botón que lo abre.
- Arrastrar: `page.mouse.move` → `down` → `move` con `steps` → `up`. Mide con `boundingBox()` antes y después.
- Modales con `createPortal` en `document.body`: busca por `data-testid`, no por jerarquía.
- Elementos con `backdrop-filter` crean un contexto de apilamiento: un modal dentro de ellos no se posiciona bien. Por eso el modal va en portal.
- Evita `waitForTimeout`. Usa `expect(...).toBeVisible()` / `toBeHidden()` / `toHaveText()` con timeout.

## Lista de comprobación antes de entregar

1. ¿Hay `__dirname` o `require`? Si sí, cámbialo.
2. ¿El test lee variables `VITE_`? ¿`playwright.config.ts` carga `.env.local`?
3. ¿Todos los endpoints que toca el flujo están mockeados (auth, rest, storage)? ¿Algún endpoint no mockeado llega a la red real?
4. ¿Los `data-testid` del test existen en el componente? Búscalos uno a uno con grep.
5. ¿Las aserciones de `src` o de texto usan regex o `toContainText` cuando el texto puede variar?
6. ¿Se ejecutó? Si no, márcalo en STATE.md como pendiente con el comando exacto.

## Cuando falla

- Lee primero el error y el `error-context.md` de `test-results/`.
- Un "Falta VITE_..." es de entorno. Un timeout en un `toBeVisible` suele ser un `data-testid` distinto o un mock que no responde.
- Corrige la causa, no subas el timeout.
