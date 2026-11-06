# Guía: GitHub, Supabase y Vercel para GrandBrandView

> Pensada para leer despacio. Cada sección tiene **qué es**, **comandos** y **casos reales** con lo que verás en la terminal.

---

## 0. Antes de empezar: seguridad (importante)

En el chat has compartido **la clave secreta de Supabase** (`sb_secret_…`) y **el token de Vercel** (`vcp_…`).
Aunque digas que son temporales, cualquiera que los vea puede actuar en tu proyecto.

1. **Revoca/rota** ambos hoy:
   - Supabase → *Project Settings → API Keys* → regenera la *secret key*.
   - Vercel → *Account Settings → Tokens* → borra el token y crea uno nuevo.
2. **Nunca** metas claves secretas en el código, en `.env` versionado ni en variables con prefijo `VITE_` (esas se envían al navegador).
3. Lo único que puede ir al frontend es la **publishable key** (`sb_publishable_…`) y la URL del proyecto.

---

## 1. Conceptos mínimos

| Concepto | Qué es, en una frase |
|---|---|
| **Repositorio (repo)** | La carpeta del proyecto + todo su historial. En GitHub vive en la nube. |
| **Commit** | Una "foto" guardada del proyecto con un mensaje. |
| **Rama (branch)** | Una línea de trabajo paralela. Cada rama tiene sus propios commits. |
| **Remote (`origin`)** | La dirección del repo en GitHub, para subir y bajar cambios. |
| **Push / Pull** | Subir tus commits al remoto / traer los del remoto. |
| **Pull request (PR)** | Propuesta para fusionar una rama en otra, con revisión. |
| **Deploy** | Publicar una versión de la web. Vercel lo hace automáticamente al recibir un push. |

### Las tres ramas de este proyecto

```
produccion  ← lo que ve el público (Vercel publica esta rama en tu dominio)
   ▲
   │  (Pull Request, revisado)
   │
  dev       ← integración: aquí se juntan las pruebas de funcionalidad
   ▲
   │  (Pull Request o merge)
   │
 diseno     ← TU rama de trabajo diario: estilos, textos, prototipos
```

**Flujo diario:** trabajas en `diseno` → subes (`push`) → pasas a `dev` cuando algo está listo para probar → a `produccion` cuando está validado.

---

## 2. Subir el proyecto a tu repo por primera vez

Te preparé el repo ya inicializado con las tres ramas (carpeta `grandbrandview/`, con `.git` dentro).
Desde tu ordenador, dentro de esa carpeta:

```bash
# 1. Comprueba que estás en el proyecto y que git ve las ramas
cd grandbrandview
git branch -a
```
Salida esperada:
```
  dev
  diseno
* produccion
```

```bash
# 2. Cambia el nombre/correo al tuyo real (solo la primera vez en este equipo)
git config user.name "Tu Nombre"
git config user.email "tu@correo.com"
git commit --amend --reset-author --no-edit   # reescribe el autor del commit inicial

# 3. Conecta con GitHub
git remote add origin https://github.com/AndyDalay/BrandView.git
git remote -v
```
Salida esperada de `git remote -v`:
```
origin  https://github.com/AndyDalay/BrandView.git (fetch)
origin  https://github.com/AndyDalay/BrandView.git (push)
```

```bash
# 4. Sube las TRES ramas de una vez
git push -u origin --all
```
- Te pedirá usuario y **token** (no la contraseña). Crea un token en GitHub: *Settings → Developer settings → Personal access tokens → Fine-grained*, con permiso *Contents: Read and write* sobre el repo BrandView.
- Si macOS/Windows te lo pregunta, elige guardar credenciales.

Salida típica:
```
To https://github.com/AndyDalay/BrandView.git
 * [new branch]      dev -> dev
 * [new branch]      diseno -> diseno
 * [new branch]      produccion -> produccion
branch 'produccion' set up to track 'origin/produccion'.
```

> Caso: **"Support for password authentication was removed"** → estás usando la contraseña. Usa el token.

---

## 3. Comandos que usarás a diario

| Comando | Para qué sirve |
|---|---|
| `git status` | Ver qué archivos cambiaste y en qué rama estás. **El comando que más usarás.** |
| `git branch` | Lista las ramas locales. La activa lleva `*`. |
| `git switch diseno` | Cambiar a la rama `diseno` (si ya existe). |
| `git switch -c nueva-rama` | Crear una rama nueva y cambiarte a ella. |
| `git diff` | Ver las líneas exactas que cambiaron (sin preparar). |
| `git add archivo.tsx` | Preparar un archivo para el próximo commit. |
| `git add -A` | Preparar **todos** los cambios. |
| `git commit -m "mensaje"` | Guardar los cambios preparados como commit. |
| `git log --oneline -n 10` | Ver los últimos 10 commits, resumidos. |
| `git push` | Subir tus commits a GitHub (rama actual). |
| `git push -u origin diseno` | Igual, pero la primera vez (enlaza la rama local con la remota). |
| `git pull` | Traer cambios del remoto a tu rama actual. |
| `git fetch` | Descargar info del remoto **sin tocar tus archivos**. Útil para ver qué hay. |
| `git stash` | Guardar cambios sin commitear para cambiar de rama. |
| `git stash pop` | Recuperar lo guardado con `stash`. |
| `git restore archivo` | Descartar cambios de un archivo (⚠️ se pierden). |
| `git merge dev` | Traer lo de `dev` a la rama actual. |
| `git checkout -- .` / `git restore .` | Descartar **todos** los cambios no guardados (⚠️ irreversible). |

---

## 4. Casos de uso (qué puedes ver y qué hacer)

### Caso A — Modifico estilos en `diseno` y quiero guardarlos

```bash
git switch diseno
git status
#   modified:   src/index.css
#   modified:   src/components/Header.tsx

git diff                       # revisas qué cambió
git add -A
git commit -m "Ajuste de color del header y sombras de tarjetas"
git push
```
Lo que verás: `[diseno 9f2c1ab] Ajuste de color…` y en GitHub la rama actualizada.

### Caso B — Git dice "Changes not staged for commit" y no me deja cambiar de rama

```
error: Your local changes to the following files would be overwritten by checkout:
        src/index.css
Please commit your changes or stash them before you switch branches.
```
Significa que tienes cambios sin guardar que colisionan con la otra rama.
- **Opción 1 (guardar):** `git add -A && git commit -m "WIP"` y luego `git switch dev`.
- **Opción 2 (temporal):** `git stash`, cambias de rama, y luego `git stash pop`.

### Caso C — Quiero llevar lo que ya validé de `diseno` a `dev`

Opción simple (merge local):
```bash
git switch dev
git pull                       # siempre antes de integrar
git merge diseno
git push
```
Opción profesional (recomendada cuando trabajas con alguien más): **Pull Request** en GitHub: *Compare & pull request*, base `dev` ← compare `diseno`. Revisas los cambios en la web y pulsas *Merge*.

Si sale **conflicto**:
```
Auto-merging src/index.css
CONFLICT (content): Merge conflict in src/index.css
Automatic merge failed; fix conflicts and then commit the result.
```
Abre el archivo: verás
```
<<<<<<< HEAD
  --azul: #2757E0;
=======
  --azul: #1E5BFF;
>>>>>>> diseno
```
Decide cuál vale (o mezcla), borra las marcas `<<<<`, `====`, `>>>>`, y luego:
```bash
git add src/index.css
git commit -m "Resuelve conflicto de color azul"
```

### Caso D — Subí cambios a `produccion` por error

Lo ideal: no hacer push directo a `produccion`. Protege la rama en GitHub: *Settings → Branches → Add rule* → `produccion` → *Require a pull request before merging*. Así sólo entra por PR.

Si ya pasó y **aún no ha publicado nadie**, puedes deshacer el último commit (sin borrar tus archivos):
```bash
git switch produccion
git reset --soft HEAD~1       # deshace el commit, mantiene los cambios
git switch diseno
git add -A && git commit -m "Cambio movido a diseno"
git push
git push --force-with-lease origin produccion   # ⚠️ reescribe el remoto; úsalo con cuidado
```

### Caso E — "Hice cambios en el ordenador de casa y no los veo en el de la oficina"

```bash
git switch diseno
git pull
```
Si el pull dice `Your branch is behind 'origin/diseno' by 3 commits` y avanza, todo bien.
Si dice `Your branch and 'origin/diseno' have diverged`, tienes commits locales no subidos y remotos nuevos. Solución limpia:
```bash
git pull --rebase
git push
```

### Caso F — Borré un archivo sin querer

```bash
git restore src/components/Header.tsx      # si NO lo habías commiteado
# o, si ya estaba en un commit:
git log --oneline -- src/components/Header.tsx
git restore --source=3568f17 src/components/Header.tsx
```

### Caso G — Quiero ver qué cambió en un commit concreto

```bash
git show 9f2c1ab
git log -p -- src/index.css     # historial de cambios de un archivo
```

### Caso H — Quiero crear una rama para probar una idea grande

```bash
git switch diseno
git switch -c experimento-viewer-3d
# …trabajas…
git add -A && git commit -m "Prueba: visor 3D"
git push -u origin experimento-viewer-3d
```
Si no sale bien: `git switch diseno` y la rama queda ahí sin afectar nada. Si sale bien: PR hacia `dev`.

### Caso I — `git push` dice "rejected … fetch first"

```
! [rejected]        diseno -> diseno (fetch first)
```
Alguien (o tú desde otro equipo) subió antes. Haz `git pull --rebase` y luego `git push`.

---

## 5. Supabase (qué hacer hoy y qué habrá después)

**Hoy la app no necesita Supabase:** los manuales se guardan en el navegador (IndexedDB).
Cuando quieras que los manuales se vean desde cualquier sitio:

1. **Crear proyecto** (ya lo tienes: `udeoedbisvuhheoglypq`).
2. **Ejecutar la migración** `supabase/migrations/0001_manuales.sql` en *SQL Editor* → *New query* → pegar → *Run*.
   - Crea la tabla `manuales` con **RLS** (solo lectura pública).
   - Crea el bucket `manuales` de Storage (público en lectura).
3. **Claves:** en el frontend usa solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (copia `.env.example` a `.env.local`).
4. **Subir imágenes:** las subes al bucket desde el panel o desde el backend con la clave secreta (nunca desde el navegador sin login).

Ejemplo de consulta desde la app (cuando lo conectemos):
```ts
const { data, error } = await supabase
  .from('manuales')
  .select('id, nombre, portada, paginas, portada_w, portada_h')
  .order('orden');
```
> Si algún día quieres que cualquiera pueda **subir** manuales desde la web, habrá que añadir autenticación (Supabase Auth) y políticas de escritura. No lo hagas con la clave secreta en el navegador.

---

## 6. Vercel: publicar la web

### 6.1 Primera vez (desde el panel, lo más sencillo)

1. Entra en **vercel.com → Add New… → Project**.
2. **Import** el repo `AndyDalay/BrandView` (si no aparece: *Adjust GitHub App Permissions* y dale acceso al repo).
3. Configuración que te pedirá:
   - **Framework Preset:** Vite (lo detecta solo).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Root Directory:** `./` (raíz del repo).
   - **Production Branch:** `produccion`  ← importante (*Project Settings → Git*).
4. **Environment Variables** (solo si ya usas Supabase):
   - `VITE_SUPABASE_URL` = `https://udeoedbisvuhheoglypq.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = tu `sb_publishable_…`
   - **No** pongas la secreta aquí si el front no la necesita.
5. **Deploy.**

`vercel.json` ya incluye la regla de reescritura para que `/manual/:id` funcione al recargar la página.

### 6.2 Cómo funciona después

| Acción | Resultado |
|---|---|
| `git push` a `produccion` | Deploy a **producción** (tu dominio). |
| `git push` a `dev` o `diseno` | Deploy de **preview** con URL propia, sin tocar producción. |
| Pull request | Vercel comenta en el PR con la URL de preview. |

### 6.3 Desde la terminal (opcional)

```bash
npm i -g vercel
vercel login
vercel link          # enlaza la carpeta con el proyecto de Vercel
vercel               # preview
vercel --prod        # producción
```

### 6.4 Errores típicos de build

| Mensaje | Causa y solución |
|---|---|
| `Cannot find module …` | Falta una dependencia: revisa que `package.json` y `package-lock.json` estén en el repo. |
| `tsc: error TS…` | El build corre `tsc --noEmit` antes de Vite. Corrige el tipo indicado en el log. |
| La página sale en blanco / 404 al entrar en `/manual/…` | Revisa `vercel.json` (reescritura a `index.html`). |
| Galería vacía en producción | Las carpetas de `public/galeria` deben estar **en el repo** (no ignoradas). |

---

## 7. Lo que he dejado listo en el proyecto

- `supabase/migrations/0001_manuales.sql` — tabla + RLS + bucket.
- `.env.example` — variables que necesita el frontend.
- `.gitignore` — ignora `node_modules`, `dist`, `.env` y `.env.local`.
- Repo git con las ramas `produccion`, `dev` y `diseno`.

Lo que **no** puedo hacer desde aquí: subir a GitHub (no hay acceso a github.com desde mi entorno) ni desplegar en Vercel (tampoco hay acceso a vercel.com). Los pasos de arriba son los que te permiten hacerlo en 10 minutos.
