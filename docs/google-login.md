# Iniciar sesión con Google (P1)

Esto lo configuras tú, en dos paneles (Google Cloud y Supabase). El código no lleva ningún valor real: el Client ID y el Client Secret se pegan **solo en el panel de Supabase**, nunca en el repo, ni en `.env.local`, ni con prefijo `VITE_`.

> Los nombres de los menús pueden variar un poco según la versión del panel.

## Valores que vas a necesitar (los nombres, no los valores)

| Nombre | De dónde sale | Dónde se pega |
|---|---|---|
| `SUPABASE_PROJECT_REF` | Supabase → Project Settings → General (Reference ID) | Se usa para armar la URL de callback |
| `SUPABASE_CALLBACK_URL` | `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback` (Supabase también la muestra en el proveedor Google) | Google Cloud → URI de redirección autorizado |
| `GOOGLE_CLIENT_ID` | Google Cloud, al crear el cliente OAuth | Supabase → proveedor Google |
| `GOOGLE_CLIENT_SECRET` | Google Cloud, al crear el cliente OAuth | Supabase → proveedor Google |
| `SITE_URL_PRODUCCION` | Tu dominio de Vercel de la rama `produccion` | Supabase → URL Configuration |

## 1. Google Cloud Console

1. Crea o elige un proyecto.
2. **APIs y servicios → Pantalla de consentimiento de OAuth**
   - Tipo de usuario: **Externo**.
   - Nombre de la app, correo de soporte y correo de contacto.
   - Permisos (scopes): solo `openid`, `email` y `profile`.
   - Mientras esté en modo "Pruebas", añade tu correo (y el de quien pruebe) como **usuarios de prueba**.
   - Antes de lanzar, pulsa **Publicar la app** (pasa a "En producción") para que cualquier cuenta de Google pueda entrar. Con scopes básicos no hace falta verificación.
3. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**
   - Tipo: **Aplicación web**.
   - **Orígenes de JavaScript autorizados**:
     - `http://localhost:3000`
     - `https://<SITE_URL_PRODUCCION>`
   - **URI de redirección autorizados**:
     - `<SUPABASE_CALLBACK_URL>` (una sola; es la de Supabase, no la de tu app).
4. Copia `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.

## 2. Supabase

1. **Authentication → Sign In / Providers → Google**: activar, pegar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`, guardar.
2. **Authentication → Sign In / Providers**: comprueba que **Allow anonymous sign-ins** sigue activo (ya lo usa "Compartir").
3. **Authentication → Sign In / Providers (ajustes generales)**: activa **Allow manual linking**. Sin esto, `linkIdentity` falla y no se puede conservar el ID de la sesión anónima. **Es imprescindible para P2.**
4. **Authentication → URL Configuration**
   - Site URL: `https://<SITE_URL_PRODUCCION>`
   - Redirect URLs (una por línea):
     - `http://localhost:3000/**`
     - `https://<SITE_URL_PRODUCCION>/**`
     - el patrón de previews de Vercel de tus ramas `dev` y `diseno`, por ejemplo `https://*-<TU_EQUIPO>.vercel.app/**`

## 3. Comprobación rápida (después de P2)

- [ ] En `localhost:3000`, el botón de Google abre la pantalla de Google y vuelve a la app.
- [ ] Antes de iniciar sesión, comparte un manual (sesión anónima). Anota el `id` del usuario (Supabase → Authentication → Users).
- [ ] Inicia sesión con Google. **El mismo usuario debe pasar a tener la identidad Google** (mismo `id`, ya no anónimo) y el manual sigue siendo suyo.
- [ ] Si Supabase responde `identity_already_exists`, esa cuenta de Google ya estaba vinculada a otro usuario: ver "Riesgos" en `STATE.md`.

## Seguridad

- `GOOGLE_CLIENT_SECRET` solo vive en Supabase. Si se filtra, se regenera en Google Cloud y se vuelve a pegar en Supabase.
- En el frontend solo existen `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
