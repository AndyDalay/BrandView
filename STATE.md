# Estado del Proyecto — GrandBrandView

> **Claude: lee esto primero.** Es tu memoria entre sesiones. Actualízalo al final de cada respuesta.

---

## 📍 Dónde estamos

- **Sesión (2026-11-09):** Fix de las flechas del visor (`PageArrowButton`, V5b) barra de información del manual (V4) y configuración en el menú de perfil (V9). Pendiente de verificar en navegador. Header, modal de borrado, controles y sombras del visor **cerrados**.
- **Rama:** `diseno`.
- **Flujo de ramas:** `diseno` → `dev` → `produccion`. Vercel publica `produccion`; `dev` y `diseno` generan previews.
- **Puerto de desarrollo:** `3000` fijo (Figma Make y Playwright lo necesitan).
- **Supabase:** cliente único en `src/lib/supabase.ts`, reexportado en `src/lib/supabaseClient.ts`. Variables: `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
- **Pendiente de verificación:** suite E2E en firefox/webkit/mobile; lockfile en CI.

---

## ✅ Qué está hecho

**Galería y visor (app)**
- Galería con arrastre para reordenar (ratón, táctil, teclado Alt+flechas).
- Borrado de manuales (locales en IndexedDB; base ocultables) con modal propio de la app (`ConfirmDeleteModal`, sin `window.confirm`).
- Header solo con logo (desktop y móvil).
- Visor de libro: giro de páginas, portada/contraportada centradas, apertura lenta.
- Visor, controles: mantener pulsado ◀ / ▶ pasa páginas (acelera tras 1,5 s); tocar "3 / 8" permite escribir la página (`page-input`).
- Visor, sombras: sombra de los bordes y franja del lomo animadas solo en giros de portada/contraportada, sincronizadas con el aterrizaje (80–88 % del tiempo). Verificado por el usuario.
- Visor, dobles páginas: en 8/9 la contraportada ocupa el lado derecho; sin papel en blanco estático.
- Compartir: publica en Supabase con sesión anónima; botones WhatsApp, Telegram y correo.

**Flujo de trabajo (Tarea 1)**
- `vite.config.ts`: puerto 3000, `strictPort`, `host`, y alias `@` → `src`.
- `tsconfig.json`: `paths` para `@/*`, así `@/lib/supabaseClient` resuelve.
- `src/lib/supabaseClient.ts`: reexporta el cliente de `src/lib/supabase.ts`. No crea un segundo cliente.
- `package.json`: scripts `lint` (sin `--ext`, que no existe en ESLint 9), `test:e2e` y relacionados; devDependencies `@playwright/test`, `dotenv`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`.
- `eslint.config.js`: configuración plana de ESLint 9.
- `.github/workflows/ci.yml`: ramas `[produccion, dev, diseno]`, usa `VITE_SUPABASE_PUBLISHABLE_KEY`.
- `.claude/SKILL.md`, `.cursor/rules`, `TUTORIAL.md`, `COMMANDS.md`: referencias a `main` sustituidas por el flujo `diseno → dev → produccion`.
- `.gitignore`: `playwright-report`, `test-results`, `.env.test`.

**Tarea 2 — tests y data-testid**
- `data-testid` en galería (`library-page`, `gallery`, `add-manual-button`, `manual-card`, `manual-delete`), visor (`share-button`, `sound-toggle`, `fullscreen-button`, `back-button`), libro (`book-viewer`, `page-indicator`, `prev-page`, `next-page`) y modal (`share-modal`, `share-close`, `share-link`, `share-whatsapp`, `share-telegram`, `share-correo`).
- Tests: `library.spec.ts`, `viewer.spec.ts`, `share.spec.ts`. Eliminados: `home.spec.ts`, `supabase.spec.ts`, `visual.spec.ts` y `HomePage.ts` (eran de la plantilla).
- Script `test:snapshots` eliminado de `package.json`.
- **Chromium (2026-11-07):** `library.spec.ts` 2/2, `viewer.spec.ts` 3/3, `share.spec.ts` 1/1. Hang del visor: `preloadImages()`; timeout de 5 s con `Promise.race`.
- **Lint / tipos (2026-11-07):** `npm run lint` exit 0 (max-warnings 0). `npx tsc --noEmit` exit 0.

**Limpieza de lint (opción 1)**
- `src/lib/masonryLayout.ts` (nuevo): `layoutHorizontal` y los tipos `Pin`, `PlacedPin`, `Lane`. Ya no vive en el componente.
- `src/components/HorizontalMasonry.tsx`: importa esas funciones y reexporta los tipos, así `Library.tsx` no cambia.
- `src/lib/transitionContext.ts` (nuevo): contexto de transición.
- `src/lib/useTransition.ts` (nuevo): hook `useTransition`.
- `src/lib/transition.tsx`: solo `TransitionProvider`.
- `src/pages/Library.tsx` y `src/pages/Viewer.tsx`: importan `useTransition` desde `useTransition.ts`.
- `.env.example`: ya usaba `VITE_SUPABASE_PUBLISHABLE_KEY`; sin cambios.

---

## 🔄 En progreso

- Tarea activa: **Cuentas y perfiles (prerrequisito)** y después **Comentarios con audio y transcripción**. Ver secciones dedicadas abajo. Responsive 360×800 queda en pausa.

---

## 📋 Pendiente (orden de prioridad)

1. ~~**Header:** quitar el texto "GRANDBRANDVIEW", dejar solo el logo.~~ **HECHO.**
2. **Lockfile:** confirmar que `package-lock.json` incluye Playwright/ESLint y está listo para `npm ci` del CI (no se ha hecho commit).
3. **Tests E2E restantes:** firefox, webkit y mobile (`npm run test:e2e`). Chromium ya cubre galería, visor y compartir.
   - [x] **Escrito (Tarea 3):** borrado en galería (`tests/e2e/delete.spec.ts`): cancelar, Escape, confirmar en manual local (siembra IndexedDB).
   - [x] **Escrito (Tarea 3):** controles del visor (`tests/e2e/viewer-controls.spec.ts`): page-indicator → page-input, número válido + Enter, número mayor que el total, mantener pulsado next-page.
   - [ ] **Pendiente de ejecutar en Chromium:** `npx playwright test tests/e2e/delete.spec.ts tests/e2e/viewer-controls.spec.ts --project=chromium`. Sin resultados todavía: no se ha podido correr aquí.
4. **Supabase Auth:** añadir `http://localhost:3000/**` a Redirect URLs (lo hace el usuario en el panel).

### Tareas posteriores (cada una en su propia sesión)

- Revisión responsive 360×800 (en pausa; ver Tareas posteriores).
- Botón "Quitar anuncios" con modal (ver vídeo o donar para 1 año) y visor a pantalla completa con horizontal en móvil.
- Imagen OG por manual (requiere función de servidor).
- Comentarios con audio y transcripción Whisper (requiere backend).
- Revisión responsive 360×800 (en pausa).
- Cuentas y perfiles: P1–P9 (ver sección dedicada).
- Monetización: AdSense (decidido). PayPal: pendiente.

---

---

## 👤 Prerrequisito: cuentas, perfiles y avatar

### Plan aprobado (2026-11-07)

Decisiones del usuario:
- **Ocultar manual compartido:** borrar la fila y los archivos del Storage (irreversible, solo el dueño vía RLS). Los manuales de `/public` siguen ocultándose en `localStorage` (`gbv-ocultos`), porque no están en la BD.
- **Editar perfil:** modal desde el menú del avatar, no página `/cuenta`. Sustituye a P8 como página; `/cuenta` no se crea.
- **Menú:** icono de usuario con Iconify (`solar:user-circle-linear`, misma familia que `solar:add-circle-linear`) → "Editar perfil" y "Cerrar sesión".

Subtareas en orden. Cada una se reporta antes de la siguiente:
- [x] **S1 — Visual (2026-11-07):** masonry de borde a borde (`-mx-5 md:-mx-10` en el contenedor `data-testid="gallery"`) y botón de ocultar alineado: el levantamiento de la card pasa al contenedor raíz `PinCard`, así el botón sube con ella. Archivo: `src/pages/Library.tsx`. Confirmado por el usuario.
- [x] **S1b — Padding lateral del masonry (2026-11-07):** el masonry arranca alineado con los textos (`inset` = 20 px en móvil, 40 px en escritorio, igual que `px-5`/`md:px-10`) y el scroll sigue a borde a borde. `HorizontalMasonry` recibe `inset` y compensa el arrastre (`x - inset`). Archivos: `src/components/HorizontalMasonry.tsx`, `src/pages/Library.tsx`. Pendiente de revisión visual.
- [x] **S2 — Borrado real (código hecho, migración pendiente de aplicar por el usuario) (2026-11-07):** `deleteSharedManual` en `src/lib/share.ts` borra primero los archivos del Storage y luego la fila; si el Storage falla, no borra la fila; si la fila no se borra (RLS), muestra "No tienes permiso". `Manual.remoto` marca los compartidos. `ConfirmDeleteModal` usa `tipo: 'local' | 'remoto' | 'base'`. Migración `supabase/migrations/0005_borrar_compartidos.sql` (política de Storage para borrar solo al dueño). La política de fila ya existía en `0002`.
  - **Pendiente:** el usuario aplica `0005` en el SQL Editor. Probar con un manual propio (borra la card, las páginas del bucket y la fila) y con uno ajeno (debe fallar con mensaje claro).
  - **Riesgo:** los manuales de `/public` siguen con `hideManual` (localStorage). No se borran de ningún sitio.
- [x] **S3 — Base de perfiles (P3) (2026-11-07):** `supabase/migrations/0004_perfiles.sql` aplicada por el usuario (tabla `perfiles`, RLS, trigger de creación, backfill, bucket `avatares` con políticas de carpeta `uid/`).
- [x] **S4 — Imagen, recortador y guardado (P4–P6) (código hecho, sin verificar) (2026-11-07):**
  - `src/lib/avatarImage.ts` (P4): validación (JPG, PNG, WebP, GIF; HEIC rechazado con mensaje; máx. 10 MB de entrada), `limitesEncuadre`, `clampEncuadre`, `computeCropRect` (funciones puras), `procesarAvatar` → 256 px y 96 px, WebP con respaldo JPEG, máx. 80 KB.
  - `src/components/AvatarCropper.tsx` (P5): modal con cuadro fijo, círculo central con máscara, foto arrastrable, zoom (slider, rueda, + y -), flechas para mover, vista previa de 96 px, Escape cancela. No está conectado a ningún botón todavía (eso es S5).
  - `src/lib/perfiles.ts` (P6): `getPerfil`, `validarNombre` (2–40), `guardarNombre`, `guardarAvatar` (sube `uid/256.<ext>` y `uid/96.<ext>`, actualiza `avatar_path` y `avatar_version`), `urlAvatar` (URL pública con `?v=` de la versión).
  - Decisiones: HEIC se rechaza, no se convierte. Los archivos se sobrescriben con `upsert`. Si cambia la extensión (webp a jpg), el archivo anterior queda huérfano en el bucket.
  - **Pendiente:** verificar en navegador (encuadre, peso ≤ 80 KB, subida). P9 para los tests.
- [x] **S2 — corrección (2026-11-07):** `deleteSharedManual` comprueba cuántos archivos borró Storage. Sin la política `0005`, Storage no devolvía error y la app marcaba el borrado como correcto dejando archivos huérfanos. Ahora da error y no borra la fila. **Pendiente:** aplicar `0005` y limpiar huérfanos de `manuales/` del bucket (carpetas cuyo id ya no existe en la tabla).
- [ ] **S4 — Imagen y recortador (P4–P6):** `src/lib/avatarImage.ts`, modal `AvatarCropper` (cuadro fijo, círculo central, arrastre de la foto, zoom opcional), subida y guardado de nombre.
- [x] **S5 — Menú y avatar (P7 + menú) (código hecho, sin verificar) (2026-11-07):**
  - `src/components/UserAvatar.tsx` (P7): foto o icono `solar:user-circle-linear`. Un solo componente.
  - `src/components/Header.tsx`: con cuenta Google, el header muestra el avatar (`user-menu-button`) y un menú (`user-menu`) con "Editar perfil" (`edit-profile-button`) y "Cerrar sesión" (`logout-button`). Cierra con Escape o al pulsar fuera. El marcador `session-state` envuelve ahora el botón del avatar. Sin cuenta Google sigue el botón "Iniciar sesión con Google".
  - `src/components/EditProfileModal.tsx` (P8 en modal, decisión del usuario): nombre (`profile-name-input`, `profile-save-name`) y "Cambiar foto" (`profile-photo-button`), que abre el `AvatarCropper`. Se renderiza en un portal, porque el `backdrop-blur` del header rompe el `position: fixed`.
  - `src/index.css`: `.noise-top` pasa a `top: 0; height: 100vh; z-index: 1` (corrección pedida por el usuario).
- [x] **S5b — Correcciones del header y subida (código hecho, sin verificar) (2026-11-08):**
  - Header `fixed` arriba (`z-40`) con espaciador `h-[72px]`. Antes era `relative` y se movía al hacer scroll.
  - Dropdown propio con la estructura y estilo de shadcn `DropdownMenu`, hecho a mano (sin Radix: no se instala dependencia y no se regenera `package-lock.json`). Abre con clic, cierra con Escape o clic fuera, navegación con flechas y foco al primer elemento. Antes, el `z-index` lo dejaba bajo `<main>`.
  - Avatar: con foto, círculo recortado con anillo fino. Sin foto, icono `solar:user-linear` plano, sin círculo.
  - Botón de usuario con nombre (desde md) y chevron, alineado sin el espacio inferior que tenía.
  - Campana `notifications-button` como placeholder (sin función; notificaciones en una tarea posterior).
  - Subida de foto: `upsert` quitado. `upsert` exige política SELECT en `storage.objects`, que `0004` no tiene. Ahora se borra la versión anterior y se sube de nuevo. El error muestra el mensaje real de Storage.
  - **Pendiente:** switch claro/oscuro (requiere paleta oscura; siguiente subtarea S6).
- [x] **S6 — Modo claro/oscuro y pulidos (código hecho, sin verificar) (2026-11-08):**
  - Tema: `index.html` aplica el tema antes de pintar (`localStorage` `gbv-tema`; si no hay, sigue al sistema). `:root[data-theme="dark"]` en `index.css`: gris carbón `#15171C`, superficie `#1C2029`, textos claros; el azul de marca se mantiene.
  - Superficies blancas fijas de Tailwind (`bg-white`, `bg-white/60`, `bg-white/80`) se sobrescriben en oscuro, así no hace falta tocar los 9 componentes uno a uno.
  - Switch `ThemeToggle` (`theme-switch`, `role="switch"`) entre la campana y el perfil, visible también sin sesión.
  - Hover de campana y perfil en azul de marca (`bg-azul`, texto blanco) en vez del tinte pálido.
  - Nombre del perfil: separación interna de 4 px (foto → nombre → chevron). Con el nombre oculto, foto y chevron quedan a 4 px (corregido 2026-11-08 a petición del usuario).
  - Título del modal centrado verticalmente con la X.
  - **Limitación:** `BookViewer.tsx` no se ha tocado. Si en oscuro el visor se ve mal, habrá que aprobar un cambio de clases ahí.
- [x] **S5e — Botón de cerrar del modal: solo la X (`solar:close-linear`), sin círculo (2026-11-08). Confirmado por el usuario.**
- [x] **S5d — Subida sin colisión, header y botón de añadir (código hecho, sin verificar) (2026-11-08):**
  - Subida: nombre único por subida (`uid/<timestamp>-256.<ext>` y `-96.<ext>`). Así no hay "The resource already exists". Tras guardar, se borra la foto anterior en el mejor esfuerzo. `miniPath` deriva la de 96 px también para rutas antiguas `uid/256.<ext>`.
  - Dropdown: "Cerrar sesión" con borde rojo (`terracota`) en hover y foco. "Editar perfil" sigue con borde azul de marca.
  - Foto y chevron separados 4 px (`gap-1`).
  - Header: el botón "Añadir manual" va en el grupo derecho, a la izquierda de la campana. En móvil dice "Añadir" y en escritorio "Añadir manual".
- [x] **S5c — Pulido del header y modal de perfil (código hecho, sin verificar) (2026-11-08):**
  - Icono de usuario sin foto a 60 % del tamaño del avatar (≈ tamaño de la campana).
  - Dropdown: "Editar perfil" y "Cerrar sesión" con borde azul de marca solo en hover o foco de teclado (sin fondo). Se quitó el foco automático al abrir, que dejaba "Editar perfil" en azul fijo.
  - Header: el nombre se oculta tras 10 s sin interacción con el botón de perfil (`user-menu-name`, transición de `max-width`). Vuelve con hover o al abrir el menú. El chevron queda junto al avatar.
  - Modal `EditProfileModal`: título a la izquierda, sin subtítulo; foto circular con botón de editar (`profile-photo-button`) sobre el borde; nombre centrado en un campo con botón de guardar (`profile-save-name`, icono disquete) que aparece solo al cambiar el nombre. La foto nueva pasa por el recortador.
  - **Pendiente:** verificar en navegador el menú, el modal, el recortador y el cierre de sesión. Las rutas `/cuenta` y la ruta protegida quedan sin efecto; el modal sustituye a la página.

### Objetivo
Iniciar sesión con Google, gestionar la cuenta y editar el perfil (nombre y foto). La foto se recorta en un cuadrado con una guía circular y se optimiza antes de subirla. El avatar aparece en el header (`photo-user-container`) y en las lágrimas de comentarios.

### Decisiones de arquitectura (propuestas, confirmar antes de P1)
| Tema | Propuesta | Por qué |
|---|---|---|
| Login | Google vía Supabase Auth (proveedor OAuth) | Sin contraseñas. El usuario lo configura en Google Cloud y Supabase (ver prompt). |
| Sesión anónima actual | Vincular la identidad de Google al usuario anónimo con `linkIdentity` (mismo ID) | Mantiene manuales compartidos y comentarios ya creados. **Riesgo: probar en un caso real antes de dar por cerrado.** Si el ID cambia, habrá que migrar `owner_id`. |
| Perfil | Tabla `perfiles` (`id` = auth.uid, `nombre`, `avatar_path`, `avatar_version`, `updated_at`). RLS: leer público, escribir solo el propio | Nombre y foto visibles para comentarios sin exponer el email. |
| Imagen | Recorte cuadrado en el navegador, salida de 256 px (perfil) y 96 px (miniatura), WebP con respaldo JPEG, máx. ~80 KB | Sin transformaciones de Supabase en plan gratuito: optimizamos antes de subir. |
| Almacenamiento | Bucket `avatares` público en lectura; escritura solo en `uid/…` del propio usuario | La URL pública es cacheable; el versionado (`avatar_version`) evita caché vieja al cambiar foto. |
| Cuenta | Página `/cuenta`: datos, editar nombre, cambiar foto, cerrar sesión. Borrar cuenta: fase posterior (requiere función de servidor) | Alcance controlado. |

### Requisitos de producto
1. Botón "Iniciar sesión con Google" visible en el header cuando no hay cuenta. Con cuenta: avatar en `photo-user-container` que abre el menú de cuenta.
2. Editar perfil: nombre (2–40 caracteres, validado) y foto.
3. **Recortador de foto** (modal):
   - Cuadrado de recorte con bordes y esquinas marcados.
   - Zona circular central dentro del cuadrado (máscara oscura fuera del círculo) que muestra exactamente cómo quedará el avatar.
   - El usuario arrastra la **foto** debajo del cuadro para encuadrarla. El cuadro no se mueve ni cambia de tamaño.
   - Zoom opcional con deslizador (o rueda en escritorio), con límites para que la foto siempre cubra el círculo.
   - Botón "Subir" → recorta, optimiza y sube. Botón "Cancelar" descarta.
4. Vista previa en vivo del círculo final mientras se encuadra.
5. Estado de carga y error claro (archivo no válido, demasiado pesado, sin conexión).
6. Avatar en comentarios y header usa la misma versión de 96 px; la de 256 px solo en la página de cuenta.

### Microanimaciones y diseño
- Recortador: la máscara oscura se aclara suavemente al empezar a arrastrar; el círculo tiene un borde fino de la marca que pulsa una vez al soltar.
- Avatar: entrada con fade + escala leve; al cambiar la foto, cross-fade de la anterior a la nueva.
- Botón "Subir": estado de carga con anillo azul; al terminar, pequeño check y cierre suave.
- Respeta `prefers-reduced-motion`.

### Subtareas
- [ ] **P1 — Configuración de Google (lo hace el usuario):** Google Cloud (cliente OAuth, URI de redirección de Supabase) y proveedor Google en Supabase. Documentar pasos en `docs/google-login.md`.
- [x] **P2 — Login y vinculación (código hecho, verificación pendiente):** `src/lib/auth.ts` (`signInWithGoogle` con `linkIdentity` si hay sesión anónima o `signInWithOAuth` si no, `signOut`, `getCurrentUser`, `onAuthChange`, `traducirErrorAuth`). Header con `login-google-button`, `session-state` (solo cuenta Google) y `auth-error`. Tests con mock en `tests/e2e/auth.spec.ts` + `tests/fixtures/authMock.ts`.
  - **Verificado por el usuario (2026-11-07):** el login con Google funciona en su entorno.
  - **Pendiente:** confirmar que un manual compartido antes del login conserva el mismo `user.id` después de vincular Google. Si cambia, parar y migrar `owner_id`. `tsc` y Playwright no se han ejecutado en esta sesión (sin `node_modules`).
- [ ] **P3 — Base de datos:** migración `0004_perfiles.sql` (tabla `perfiles`, trigger de creación, RLS) y bucket `avatares` con políticas.
- [ ] **P4 — Procesado de imagen:** `src/lib/avatarImage.ts`: validar tipo y tamaño, recortar a cuadrado según el encuadre, redimensionar a 256 y 96 px, codificar WebP con respaldo JPEG, comprobar peso.
- [ ] **P5 — Recortador:** componente `AvatarCropper` (modal) con cuadro, máscara circular, arrastre de la foto, zoom, vista previa y accesibilidad (teclado para mover y hacer zoom).
- [ ] **P6 — Subida y perfil:** `src/lib/perfiles.ts`: subir ambas versiones, actualizar `avatar_path` y `avatar_version`, guardar nombre.
- [ ] **P7 — Componente `UserAvatar`:** un solo componente para header, comentarios y cuenta, con inicial de respaldo y tamaños.
- [ ] **P8 — Página `/cuenta`:** datos, editar nombre, cambiar foto, cerrar sesión. Ruta protegida: si no hay sesión, redirige al login.
- [~] **P9 — Tests E2E (escritos 2026-11-08, sin ejecutar):** `tests/e2e/perfil.spec.ts` con 2 casos. (1) Editar perfil → elegir foto → arrastrar en el recortador → subir → 2 archivos en `avatares/<uid>/` y `avatar_version` = 1 → tras recargar, el header muestra la foto de 96 px. (2) Nombre: el botón de guardar aparece al cambiar, rechaza 1 carácter y guarda uno válido. Mocks en `tests/fixtures/avatarMock.ts` (PostgREST `perfiles` y Storage `avatares`, con estado en memoria) y `tests/fixtures/avatar-test.png` (imagen generada, 300×200). Login mockeado con `authMock.ts`. **Pendiente:** ejecutar `npx playwright test tests/e2e/perfil.spec.ts --project=chromium`.

### Riesgos
- **Vinculación anónima → Google:** es la parte más delicada. Si no conserva el ID, los manuales y comentarios previos quedan huérfanos. Probar antes de P3.
- **Fotos grandes o HEIC:** iOS puede enviar HEIC. Convertir o rechazar con mensaje claro.
- **Privacidad:** el avatar es público. Informar en la pantalla de edición.
- **Plan gratuito de Supabase:** límites de almacenamiento y de ancho de banda; las miniaturas de 96 px mantienen el consumo bajo.

---

## 🎙️ Tarea activa: Comentarios con audio y transcripción

### Objetivo
Un espectador puede dejar comentarios anclados a una página del manual. Cada comentario es una **lágrima** pequeña con avatar del autor. Puede escribirlo o grabarlo; el audio se transcribe con Whisper en el servidor y el texto queda guardado aunque el usuario salga, cambie de página o vuelva otro día.

### Decisiones de arquitectura (propuestas, confirmar antes de T1)
| Tema | Propuesta | Por qué |
|---|---|---|
| Transcripción | **Groq** (whisper-large-v3-turbo) como principal; **Hugging Face** Inference como respaldo | Rápidos y con capa gratuita. El modelo ya vive en su servidor: no hay nada que precargar en el cliente. |
| Dónde corre | Función serverless en `api/` (Vercel) | Oculta las claves y se despliega con `produccion`. |
| Estado del trabajo | Columna `estado` en `comentarios`: `pendiente → transcribiendo → listo / error` | El proceso corre en servidor; al volver, el cliente lee el estado. |
| Audio | MediaRecorder, `audio/webm;codecs=opus` (o `audio/mp4` en Safari), máx. 60 s, máx. 2 MB | Cabe en el límite de la función; Safari necesita detectar el formato. |
| Almacenamiento | Bucket `comentarios` (Storage), ruta `manual/pagina/uuid.webm`; RLS: insertar solo con sesión | Reutiliza la sesión anónima ya existente. |
| Posición | Página (índice de la página del manual) + `x`, `y` normalizados 0–1 | Se ve bien en cualquier tamaño de pantalla. |
| Voz (texto → audio) | 1.º Web Speech API del navegador (gratis, sin clave). 2.º opcional: TTS de Hugging Face | No depende de una clave para funcionar. |
| Avatar | Inicial + color por defecto. Foto real solo si hay login con proveedor | La sesión anónima no tiene foto. **Decisión abierta.** |
| Precarga de Whisper | **No aplica** con API hospedada. Si más adelante se quiere modelo propio, sería una función con modelo caliente (Modal, Hugging Face Spaces o similar), no Vercel gratuito | Honestidad técnica: el backend gratuito de Vercel no puede mantener un modelo cargado. |

### Requisitos de producto
1. Modo colocar: tocar la página añade una lágrima en ese punto (con la página visible).
2. Lágrima: forma de gota, avatar pequeño del autor, sombra suave. Tooltip con nombre y fecha al pasar.
3. Al lado de la lágrima, una burbuja con icono de micrófono para grabar.
4. Grabación: onda en vivo con barras verticales redondeadas que reaccionan al volumen. Botón para detener. Cancelar descarta.
5. Al detener: la lágrima se fija con spinner de carga mientras sube el audio y se transcribe.
6. Al terminar: el texto aparece en el comentario. Si falla, estado de error con botón reintentar.
7. Persistencia: los comentarios se leen de Supabase al abrir el manual; el estado `transcribiendo` se reconsulta al volver.
8. Expandir la lágrima: panel con texto, autor, fecha, botón ▶ para el audio original y botón "Leer en voz alta" (TTS).
9. Permisos de micrófono denegados: mensaje claro, sin romper el visor.

### Microanimaciones y diseño (misma línea visual que el visor)
- Lágrima: entrada con rebote suave (spring), pulso lento mientras está pendiente.
- Burbuja de micro: halo que respira al grabar; color terracota en grabación.
- Onda: barras redondeadas con altura según el volumen, transición de 80 ms.
- Spinner de transcripción: anillo de trazo fino con el color azul de la marca.
- Panel expandido: escala + fade desde la lágrima; cierre con Escape.
- Todo respeta `prefers-reduced-motion`.
- Tipografía: `font-display` para títulos, `font-label` para etiquetas, mismos tokens de color.

### Dependencias
- Requiere P7 (`UserAvatar`) y P2 (sesión con identidad) antes de T4. Hasta entonces, el comentario muestra la inicial y el nombre escrito.

### Subtareas
- [x] **T1 — Base de datos y storage (2026-11-08):** `supabase/migrations/0003_comentarios.sql` aprobada y guardada. Tabla `comentarios` sin clave foránea a `manuales` (solo manuales compartidos; el autor puede comentar en los suyos). RLS: lectura pública, insertar y borrar solo el autor; sin update de cliente. Bucket `comentarios` público, 2 MB, `audio/webm` y `audio/mp4`. **Pendiente:** el usuario la aplica en el SQL Editor.
- **Nota T4:** el icono de comentarios de la barra de acciones debe ser de la librería Solar (burbuja de chat con cola lateral). Confirmar el nombre exacto del icono al implementar T4.
- [ ] **T2 — API de transcripción:** `api/transcribir.ts` (Vercel). Recibe `comentario_id`, lee el audio de Storage, llama a Groq (fallback HF), guarda texto y estado. Errores tipados y reintentos. Claves solo en variables de entorno del servidor.
- [x] **T3 y T4 de texto (código hecho, sin verificar) (2026-11-08):** `src/lib/comentarios.ts` (listar, crear, borrar; nombre del autor desde `perfiles`). `src/components/CommentLayer.tsx`: capa sobre el libro (sin tocar `BookViewer.tsx`), modo comentar, lágrimas filtradas por página, panel con texto y borrado del autor. Botón `comment-toggle-button` (`solar:chat-round-linear`) en la barra del visor, solo en manuales compartidos. Página actual leída del indicador `page-indicator`.
  - **Riesgo:** la página se lee del texto "n / total" del indicador (sondeo cada 300 ms). Si el indicador cambia de formato, hay que revisarlo. Lo correcto es que `BookViewer` exponga la página por callback (requiere aprobación).
  - **Riesgo:** en páginas dobles, el comentario se guarda con el número de la página izquierda.
  - **Pendiente:** T2 y audio (T5–T7), y probar en el navegador.
- [ ] **T3 — Capa de datos del cliente:** `src/lib/comentarios.ts` (listar por manual, crear, subir audio, disparar transcripción, reconsultar estado).
- [ ] **T4 — Modo colocar y lágrimas:** marcadores sobre las páginas del visor, coordenadas normalizadas, `data-testid` (`comment-pin`, `comment-add-mode`).
- [ ] **T5 — Grabación:** burbuja de micro, MediaRecorder, onda en vivo, cancelar/detener, detección de formato, errores de permiso.
- [ ] **T6 — Estados y transcripción:** pendiente/transcribiendo/listo/error en la lágrima; reconsulta al volver; reintentar.
- [ ] **T7 — Panel expandido:** texto, ▶ audio original, leer en voz alta (Web Speech), cierre.
- [ ] **T8 — Microanimaciones, accesibilidad y móvil:** reduced motion, foco con teclado, 360×800.
- [ ] **T9 — Tests E2E** (Cursor/Playwright): crear comentario de texto, marcador visible tras recargar, panel expandido. La transcripción real no se prueba en CI: se mockea la API.

### Riesgos
- **Claves expuestas:** las claves de Hugging Face y Groq se pegaron en el chat. **Rotadas y antiguas revocadas (2026-11-08, confirmado por el usuario).** Nuevas en `.env.local` (sin `VITE_`, ignorado por git) y en Vercel como variables de servidor (pendiente de confirmar en Vercel antes de T2).
- **Abuso:** cualquiera con el enlace puede comentar. Limitar tamaño, duración y frecuencia; moderación más adelante.
- **Límite de la capa gratuita:** Groq y HF tienen cuotas. Mostrar error claro si se agotan.
- **Safari y formatos:** probar grabación en iOS antes de dar por cerrado T5.
- **Extensión de WhatsApp:** se usa solo como referencia de código. No se edita ni se copian claves de ella.

## 🐛 Problemas conocidos

- Precarga del visor: Chrome limita conexiones concurrentes; páginas `09.jpg`–`39.jpg` de `manuales/local-mw4iy7lo-bvj7k/` y `/ads/banner-add-01.svg` + `banner-add-02.svg` quedan pending. Mitigado con timeout de 5 s en `preloadImages()` (el libro puede mostrarse antes de que todas las páginas estén en caché).
- La consulta `GET .../rest/v1/manuales` llegó a tardar ~16 s en la traza; puede hacer flaky el `beforeEach` si se acerca al timeout de 30 s.
- Visor (sombras): verificado por el usuario en escritorio. Pendiente de revisar en móvil, porque el visor en móvil no usa la franja del lomo ni las sombras animadas.
- Escape con modal ocupado (borrando) no está cubierto por tests: el estado `busy` no se puede forzar de forma fiable sin un mock de red.
- El test de mantener pulsado depende de la duración del giro; por eso solo comprueba que se avanzan más de 2 páginas.
- Las claves de Hugging Face y Groq se han pegado en el chat: deben rotarse y guardarse como variables de entorno en el backend.
- P2: el prompt de la tarea menciona una sección "Estado real del código de cuentas" que no existe en este STATE.md. Se usó el código real como fuente.
- P2: el bloque de login en el header no está revisado en 360×800; puede apretar el logo y la barra de visor en móvil.
- P2: `/cuenta` aún no existe (P8). El `redirectTo` cae en la ruta `*` hasta entonces.

---

## 🗺️ Decisiones tomadas

| Decisión | Por qué |
|---|---|
| Ramas `diseno` → `dev` → `produccion` | Así está configurado en GitHub y Vercel. |
| Puerto 3000 fijo | Figma Make y Playwright lo necesitan. |
| `BrowserRouter` | Rutas limpias para `/manual/:id`. |
| Cliente Supabase único | Evita instancias duplicadas; la skill importa desde `@/lib/supabaseClient`. |
| Sesión anónima para compartir | Evita pedir correo y el límite de envíos. |
| Cursor solo revisa y planifica | Claude implementa; Cursor valida con Playwright. |
| AdSense (no Ad Manager) para empezar | Entrada más sencilla para un sitio pequeño. |
| Sombras del visor solo en portada/contraportada | Los giros centrales no deben animar la sombra; la animación solo tiene sentido al inicio y al fin del libro. |
| Tiempos de sombra según el easing del giro (33 % / 80–88 %) | El 15 % y 95 % del movimiento visual no coinciden con el 15 % y 95 % del tiempo por la curva de aceleración. |
| Login: `linkIdentity` si hay sesión anónima, `signInWithOAuth` si no (P2) | Conserva el `user.id` de los manuales compartidos. Pendiente de prueba real. |
| "Sin cuenta" en el header = sin sesión o sesión anónima (P2) | La sesión anónima de "Compartir" no es una cuenta; el botón de Google sigue visible para vincularla. |
| `redirectTo` de login = `origin + /cuenta` (P2) | Así lo pide la subtarea. Hasta P8 la ruta `/cuenta` no existe y cae en `*`. |
| Ocultar manual compartido = borrado real en BD y Storage (2026-11-07) | Decisión del usuario. Irreversible; solo el dueño (RLS). La política de Storage va en `0005`. |
| Editar perfil en modal desde el menú, no en `/cuenta` (2026-11-07) | Decisión del usuario. Sustituye a P8 como página. |
| Icono de usuario: `solar:user-circle-linear` (2026-11-07) | Misma familia de Iconify que el resto de la app. |

---

## 📦 Cómo continuar en un nuevo chat

```
Continuación de GrandBrandView. Lee STATE.md primero.
Stack: Vite 5 + React 18 + TS + Supabase + React Router v6 + Tailwind + Iconify.
Ramas: diseno → dev → produccion (Vercel publica produccion).
Puerto de desarrollo: 3000.
Cursor es el QA con Playwright. Claude implementa.

Tarea de esta sesión: [descripción]
```

## Ajustes de comentarios y compartir (T4 pulido)
- Comentarios: la lágrima muestra la foto del autor (miniatura 96 px) y cae en la inicial si no hay foto o no carga (`fotoFallida` por id).
- Panel: avatar 32 px junto al nombre, fecha pequeña debajo del nombre, texto debajo; borrar como icono de papelera visible al pasar el ratón (`group-hover`).
- `comentarios.ts`: `autorAvatar` se rellena desde `perfiles` (`urlAvatar(perfil,'mini')`).
- Compartir: bloque de progreso con altura fija (60 px) y padding, igual que el campo del enlace.
- WhatsApp: móvil → `whatsapp://send?text=`, con `wa.me` de respaldo a 1,5 s si la app no se abre. Escritorio → copia el texto al portapapeles, abre/reutiliza la pestaña `gbv-whatsapp` de WhatsApp Web y avisa de pegar con Ctrl+V.
- Limitación: WhatsApp Web no permite precargar el mensaje en un chat elegido por el usuario sin número de teléfono; el texto va por portapapeles.
- Pendiente de verificar en local: `tsc` y prueba manual de hover, foto en la lágrima y flujo de WhatsApp.

## Comentarios con voz (T2, T5, T6) — implementado
- `api/transcribir.ts` (Vercel): POST `{comentario_id}` con token del usuario. Verifica el usuario, comprueba que el comentario es suyo, descarga el audio del bucket `comentarios` con la clave de servicio, transcribe con Groq (`whisper-large-v3-turbo`, español) y, si falla, con Hugging Face. Guarda `estado`/`texto`/`error_msg`. Máx. 500 caracteres.
- Variables de servidor en Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `HF_TOKEN`.
- `src/lib/comentarios.ts`: `crearComentarioVoz` (sube el audio y hace INSERT con id y `audio_path` en estado `pendiente`; el cliente no tiene UPDATE), `transcribirComentario` (llama a `/api/transcribir`), `listarComentarios` devuelve `audioUrl`, `estado`, `errorMsg`.
- `src/components/GrabadorVoz.tsx` (T5): MediaRecorder, onda en vivo, temporizador, límite 60 s, cancelar, permiso denegado con mensaje. Formato: webm/opus, o mp4 en Safari.
- `CommentLayer`: botón de micro en el borrador; lágrima con spinner mientras `pendiente`/`transcribiendo`; error en terracota; reintentar (solo autor); reconsulta cada 3 s mientras haya notas en proceso; panel con reproductor del audio original.
- Pendiente: T7 (leer en voz alta, Web Speech).
- Para probar en local hace falta `vercel dev` (Vite no sirve `/api`).
- Sin verificar: `tsc`, iconos `solar:microphone-linear` y el endpoint HF `router.huggingface.co`.

## Manejo de errores en transcripción (2026-11-08)
- Causa del "Transcribiendo" fijo: si la petición fallaba o tardaba, la UI no mostraba nada útil y la fila quedaba en `pendiente`/`transcribiendo`.
- Cliente: contador de segundos mientras la petición está abierta; a partir de 45 s, "Tarda más de lo normal" y botón Reintentar; fallos de red, de respuesta no JSON (falta `vercel dev`) y errores del servidor se muestran con su motivo.
- Notas sin petición activa y con más de 90 s se marcan como atascadas y ofrecen Reintentar.
- Servidor: tiempo máximo por proveedor 20 s (Groq y HF); cliente aborta a los 50 s; `console.error('[transcribir]')` en los logs de Vercel con código de error.
- Códigos de error: `config`, `sesion`, `peticion`, `bd`, `no_encontrado`, `sin_audio`, `audio`, `groq`, `hf`, `proveedores`, `interno`, `red`, `timeout`.

## Diagnóstico de login con Google (2026-11-08)
- El proyecto se restauró desde el zip subido (`4a05196a-grandbrandvielast-update.zip`) como fuente de verdad. Copia previa de seguridad en la carpeta de scratchpad `backup-previo/gbv`.
- Síntoma: al pulsar el botón, la página vuelve a la inicial y el perfil nunca aparece.
- Aviso temporal (`data-testid="auth-toast"`): muestra el `redirectTo` usado, el error de Supabase con estado y código, y lo que llega en la URL al volver de Google. Se retira cuando se encuentre la causa.
- Botón renombrado a "Iniciar Sesión".
- Comprobaciones pendientes en Supabase: Google activado con Client ID/Secret; "Allow manual linking" activo; Redirect URLs con `https://<dominio-vercel>/**` (la ruta `/cuenta` cae en la ruta `*`).
- Comentarios: el botón solo aparece dentro de un manual compartido (`remoto`), no en los manuales locales.

## Comentarios en manuales locales (2026-11-08)
- El botón de comentarios y la capa ya no dependen de `remoto`: cualquier manual abierto puede tener comentarios. Los manuales locales usan su `id` de galería como `manual_id` (la tabla no tiene clave foránea).

## Borrado de manual compartido y T7 (2026-11-08)
- Borrado: el error ahora indica cuántos archivos se borraron de cuántos y el motivo de Storage. Diagnóstico en Supabase SQL: `select id, owner_id, nombre from manuales;` y `select policyname, cmd from pg_policies where schemaname='storage' and tablename='objects';`. Si `owner_id` no coincide con el id del usuario actual (Authentication → Users), la fila pertenece a otra sesión.
- T7: botón "Leer en voz alta" en el panel del comentario (Web Speech API, es-ES), se calla al cerrar el panel o al desmontar la capa.

## T8 — Accesibilidad y movimiento (parcial, 2026-11-08)
- Lágrima y spinner respetan `prefers-reduced-motion` (`motion-reduce:`), también la onda y el punto de grabación.
- Foco por teclado visible en lágrimas y papelera. El estado de transcripción se anuncia con `role="status"`.
- Pendiente: revisión a 360×800 en navegador.
- Limpieza del manual huérfano "ALTA" (owner de otra sesión): en el SQL Editor, `delete from storage.objects where bucket_id='manuales' and (storage.foldername(name))[1]='manual-alta';` y luego `delete from manuales where id='manual-alta';`.

## Botón de voz en el panel (2026-11-08)
- Se quitó el reproductor nativo del panel. "Leer en voz alta" reproduce la nota de voz original si el comentario tiene audio; si es solo texto, lee el texto con Web Speech.

## T9 — Tests E2E de comentarios de texto (2026-11-08)
- Archivo: `tests/e2e/comentarios.spec.ts`. Mockea PostgREST en memoria (`comentarios`, `perfiles`, `manuales`) y usa el manual local `ejemplo-marca`.
- Casos: crear comentario y verlo tras recargar; panel con autor y texto; error del servidor sin lágrima.
- Requiere `VITE_SUPABASE_URL` en `.env.local` (lo usa `seedSession`).
- Estado: escrito, pendiente de ejecutar en Windows con `npx playwright test tests/e2e/comentarios.spec.ts --project=chromium`.

## T8 — Revisión 360×800 (2026-11-08)
- Archivo: `tests/e2e/movil.spec.ts`. Comprueba que la biblioteca y el visor no tienen scroll horizontal a 360 px y que el botón de comentarios y el de compartir se ven.
- Pendiente: ejecutar en Windows con `npx playwright test tests/e2e/movil.spec.ts --project=chromium`. Si la cabecera del visor se desborda a 360 px, habrá que reducir los botones o pasarlos a un menú.

## Lote de tareas nuevo
- Especificaciones y casillas en `TAREAS.md`. Al resolver un punto se borra su especificación y se marca.
- Hecho en esta sesión: M1, M2, M3.

## D1 — Tokens de diseño (2026-11-08)
- Tokens en `src/index.css` y mapeo a Tailwind en `tailwind.config.ts`. Documentación en `DISENO.md`.
- Valores iguales a los de Tailwind por defecto: sin cambio visual.
- Pendiente: migrar los valores sueltos de los componentes (se hará junto con D2/D3).
- Quitado el aviso "access_token recibido" del diagnóstico de login.

## D2 — Componentes base de botones (2026-11-08)
- `src/components/ui/Button.tsx`: `Button` (variantes primaria, secundaria, fantasma; tamaños sm, md, lg; iconos Solar a izquierda o derecha; estado `cargando` con spinner CSS), `IconButton` (solo icono, `label` obligatorio) y `CloseButton` (solo cruz).
- Migrados los botones de cerrar de AddManualModal, ShareModal y EditProfileModal. Conservan sus `data-testid`.
- Pendiente: migrar el resto de botones (cabecera del visor, CommentLayer, GrabadorVoz, Header, Library) a estos componentes. Se hará en D3.

## D3 — Migración de botones (2026-11-08, parcial)
- Migrados a `IconButton`/`Button`/`CloseButton`: visor, campana de la cabecera, comentarios y grabador. Auditoría y lista pendiente en `DISENO.md`.
- D3 (siguiente tramo): biblioteca y modal de borrar migrados; variante `peligro` y prop `pill` en `Button`.

## V1–V3 — Modal de configuración (2026-11-08)
- `src/lib/ajustes.ts`: volumen (0–200 %) y notificaciones en localStorage, con evento de cambio y hook `useAjustes`.
- `src/lib/sound.ts`: el sonido de página pasa a Web Audio para llegar al 200 %. 100 % = nivel original (0.7).
- `src/components/SettingsModal.tsx`: tema (switch), notificaciones (switch, preferencia guardada) y volumen (slider). Se abre con el engranaje de la cabecera.
- Quitados de la cabecera: bocina (el silencio es volumen 0) y switch de tema.
- Pendiente de prueba: que el sonido suene al 200 % en navegadores móviles (iOS exige un gesto del usuario para iniciar Web Audio).

## C1 — Adjuntar en el editor (2026-11-08, parcial)
- Botón de clip con menú "Hacer foto" (cámara) y "Subir archivo" (imagen o PDF). Valida tipo y tamaño (10 MB) y muestra el nombre con opción de quitarlo.
- Pendiente: guardar el adjunto con el comentario (migración 0006: columna `adjunto_path` y reutilizar el bucket `comentarios`).
- Iconos Solar nuevos usados: `solar:paperclip-linear`, `solar:camera-linear`, `solar:upload-linear`. Comprobar que existen en el bundle.

## S1–S2 — Aviso de compartido y valoraciones (2026-11-08)
- Migración nueva: `supabase/migrations/0006_valoraciones.sql` (tabla `valoraciones`, un voto por usuario y manual; lectura pública, votar solo con sesión). **Aplicar en el SQL Editor.**
- `src/lib/valoraciones.ts`: listar y votar. `src/components/ShareNotice.tsx`: foto y nombre de quien comparte, fecha, y botones me gusta / no me gusta. Tras votar, los botones desaparecen y queda el contador.
- Solo aparece en manuales compartidos (`remoto`).
- Pendiente: cambiar el voto (no está en esta versión).

## C3 — Formato del texto en comentarios (2026-11-08)
- Migración nueva: `supabase/migrations/0007_comentarios_formato.sql` (columna `texto_html`). **Aplicar en el SQL Editor.**
- `src/lib/formatoTexto.ts`: sanitizador con lista blanca (b, i, u, br, a con http/https). `htmlATexto` para el texto plano.
- `src/components/EditorFormato.tsx`: editor contenteditable; barra flotante al seleccionar (negrita, cursiva, subrayado, enlace, quitar enlace). Borrar dentro de un enlace lo quita primero y deja el texto seleccionado.
- Se guarda `texto` (plano) y `texto_html` (solo si hay formato). El panel muestra el HTML sanitizado.
- Pendiente de prueba: `comentarios.spec.ts` usa `fill()` sobre el editor; Playwright admite contenteditable, pero conviene confirmarlo.

## C2 — Redactar con IA (2026-11-08, parcial)
- `api/redactar.ts`: POST `{prompt, adjunto?}` con token de sesión. Modelo `llama-3.1-8b-instant` (texto) y `meta-llama/llama-4-scout-17b-16e-instruct` (imagen), vía `GROQ_API_KEY`. Máx. 500 caracteres de salida.
- `src/components/AnimacionIA.tsx`: visor animado provisional (gradiente en el contorno, brillo eléctrico, fondo radial, estrellas de 4 puntas). Estados: reposo, escribiendo, pensando, subiendo.
- `src/components/IaComentarioModal.tsx`: título "Comentar con IA", frases sugeridas, adjunto de imagen o PDF, resultado con negritas de `**…**` y botón "Usar este texto", que inserta en el editor.
- PDF: `api/redactar.ts` extrae el texto con `pdfjs-dist/legacy/build/pdf.mjs` (import diferido; hasta 15 páginas y 6000 caracteres) y lo pasa al modelo de texto como material. Un PDF sin texto (escaneado) responde 400 con `codigo: 'adjunto'`. Máx. 3 MB. No probado aún: hay que comprobar en Vercel que pdf.js carga en Node sin worker.
- Pendiente: revisar el diseño final de la animación.
- Los iconos `solar:magic-stick-3-linear` y `solar:paperclip-linear` deben existir en el bundle.

## D3 — Cierre (2026-11-08)
- Colores fijos y tamaños con corchetes sustituidos por tokens (ver `DISENO.md`). Pendiente en una tarea aparte: menú de perfil de la cabecera (`Button` fantasma) y un `Switch` del sistema para el tema.

## C1 — Adjuntos en comentarios (2026-11-08)
- Migración `0008_comentarios_adjuntos.sql` (pendiente de aplicar en Supabase): columnas `adjunto_path`, `adjunto_nombre`, `adjunto_tipo` y bucket público `comentarios-adjuntos` (10 MB; imágenes y PDF). Subida solo a la carpeta `auth.uid()`.
- `src/lib/comentarios.ts`: `crearComentario` acepta `adjunto?: File`, lo sube antes de insertar y lo borra si el insert falla. Un comentario puede ser solo adjunto (sin texto). `listarComentarios` devuelve `adjuntoUrl` y `adjuntoNombre`.
- `src/components/CommentLayer.tsx`: el panel muestra el adjunto como enlace (`comment-attachment-link`). Se corrigieron dos errores de compilación: un `{` dentro de paréntesis en el panel y un import de `Button` duplicado.
- Al borrar un comentario se limpian su audio y su adjunto del bucket (best-effort). La migración 0008 añade permisos de borrado en Storage para la carpeta propia, que también usa el rollback.

## Login Google: decisión (2026-11-08)
- Se elige limpiar la identidad de prueba en Supabase (Authentication > Users) en lugar de cambiar `signInWithGoogle`. Sin cambios de código. Pendiente de verificar: que el `user.id` se conserve tras entrar con Google.

## Estado 2026-11-09 — migraciones pendientes y tests
- Tests Playwright en Windows: comentarios (3/3), móvil T8 (2/2), login P2 (3/3), galería, perfil y compartir pasan. Quedan `viewer-controls` "mantener pulsado next-page" (falla siempre: el avance al mantener no arranca; pendiente de diagnóstico con captura o `elementFromPoint`) y `viewer.spec` "abre el manual" (intermitente bajo carga; pasa en solitario).
- Supabase: la tabla `comentarios` NO tiene aún `texto_html`, `adjunto_path`, `adjunto_nombre` ni `adjunto_tipo`. Hay que aplicar `0007_comentarios_formato.sql` y `0008_comentarios_adjuntos.sql` en este orden. Sin ellas la lista de comentarios falla ("No se pudieron cargar los comentarios.").
- `valoraciones` (0006): por confirmar con `select * from public.valoraciones limit 1;`.

## Lote de tareas nuevas y arreglos (2026-11-09)
- Especificaciones de V4–V11 (visor y cabecera) y C4–C7 (comentarios, incluido panel de incidencias) añadidas a `TAREAS.md`. Cada una lleva su bloque de especificación, que se borra al resolverla.
- Arreglado ya: S3 (el aviso de compartido no sale en manuales propios), V8 (logo +20 %, `h-[38px]`), V7a (hover de notificaciones igual que el resto).
- Pendiente de decisión: C7 necesita migración 0009 (tabla de incidencias y permiso de administrador). Admin inicial: `andyydalay4@gmail.com`.
- V10: la conversión de volumen en `gbv-ajustes` debe hacerse al leer (interno / 2).
- Skill `.claude/SKILL.md` actualizado: leer `TAREAS.md` al empezar y borrar el bloque de especificación al cerrar una tarea.

## V5 y V6 (2026-11-09)
- V5: `BookViewer` ignora el inicio del mantener pulsado cuando no hay página en esa dirección, y el botón deshabilitado no muestra hover ni cursor de pulsable.
- V6: el botón atrás pasa a ser el primero de la barra del visor, solo icono (`solar:undo-left-round-linear`, data-testid `back-button`). Pendiente de confirmar que el icono existe en el bundle de Solar; si no, usar `solar:arrow-left-linear`.

## V5b — Flechas del visor como componente (2026-11-09)
- Nuevo `src/components/ui/PageArrowButton.tsx`: componente de React con dos estados separados.
  - **Inactivo** (portada en ◀, contraportada en ▶): sin fondo blanco ni sombra, trazo `text-gris-txt` (más claro que el azul activo en claro y oscuro), cursor `default`. Usa `aria-disabled`.
  - **Girando:** el botón no cambia de aspecto ni de cursor. Las pulsaciones durante el giro las ignora el visor.
- `BookViewer.tsx`: se usa el componente en los dos lados. Se separan `hayPrev`/`hayNext` (hay página, para el aspecto) de `canPrev`/`canNext` (se puede iniciar un giro). Se quitan `disabled` y `disabled:cursor-not-allowed`.
- Causa del cursor cancelado al mantener pulsado: `disabled={!canNext}` se activaba durante cada giro. Al deshabilitarse el botón, el navegador dejaba de enviar eventos de puntero y el cursor se quedaba bloqueado. Ya no ocurre, porque el botón no se deshabilita durante el giro.
- Limpieza de lint en `BookViewer.tsx`: se quitaron `Icon` (ya no se usa) y `rightOn` (variable sin uso, ya estaba en el original).
- Verificado en esta sesión: `tsc --noEmit` exit 0; `eslint` sobre `BookViewer.tsx` y `PageArrowButton.tsx` exit 0. Sin verificar en navegador.
- **Pendiente de verificar (Windows):** flechas en portada y contraportada (sin fondo, trazo gris, cursor normal); mantener pulsado ▶ durante varias páginas sin que el cursor cambie; en tema oscuro, contraste del trazo inactivo. Ejecutar `npx playwright test tests/e2e/viewer-controls.spec.ts --project=chromium` (el caso «mantener pulsado next-page» debería empezar a pasar).
- **Riesgo:** `Button.tsx` (base) sigue con `disabled:cursor-not-allowed`. Afecta a los botones `Button`/`IconButton` deshabilitados. No se tocó porque no lo pidió esta tarea; decidir si se aplica el mismo criterio.
- **Lint (2026-11-09):** resuelto. Se quitaron los imports sin uso de `CommentLayer.tsx` (`TEXTO_MAX`), `ConfirmDeleteModal.tsx` y `GrabadorVoz.tsx` (`Icon`), y la directiva `eslint-disable` sobrante de `GrabadorVoz.tsx`. `npm run lint` pasa en 0 (verificado en Windows por el usuario: 4 errores antes del fix).

**▶ Siguiente:** comprobar las flechas en navegador (Windows) y, si va bien, seguir con el siguiente punto de `TAREAS.md`.

## V4 — Barra de información del manual (2026-11-09)
- Nuevo `src/components/TopInfoManual.tsx`, sustituye a `ShareNotice` (eliminado) en `Viewer.tsx`. Se muestra en todos los manuales, también en los propios.
- Izquierda: avatar (`UserAvatar`, 36 px), «Subido por NOMBRE» y fecha y hora debajo. Derecha: contador de me gusta (`share-like-count`) y, al acercar el cursor, los pulgares (`vote-like`, `vote-dislike`). Tras votar, los pulgares desaparecen y el contador resalta tu voto.
- Ocultación: los pulgares se ocultan 1,5 s después de salir del cursor si no se ha votado. Con foco de teclado se muestran igual. El temporizador se limpia al desmontar.
- Autor: «ti» si el manual es tuyo (compartido por ti o local en este equipo); «GrandBrandView» en los de `/public`; si no, el nombre del perfil que lo compartió.
- Ancho: una página del libro, centrado. Se calcula con `anchoPagina` en `src/lib/bookSize.ts`, que comparte la fórmula de `bookSize` con `BookViewer`. Por eso `bookSize` y `anchoPagina` salieron de `BookViewer.tsx` (el lint de React Refresh no admite exportar funciones junto a componentes).
- `gallery.ts`: `Manual.subidoEn` (fecha de subida de los manuales locales, desde `createdAt` de IndexedDB).
- Decisiones a confirmar: (1) los manuales de `/public` no tienen fecha, así que solo muestran autor; (2) en manuales que no son compartidos también se puede votar. La tabla `valoraciones` no tiene clave foránea a `manuales`, así que el voto se guarda igual. Si no lo quieres, se oculta el voto cuando `!remoto`.
- Verificado: `tsc --noEmit` exit 0; lint de los archivos tocados exit 0. Sin verificar en navegador.
- **Pendiente de verificar:** alineación de la fila con una página en escritorio (1024 px) y móvil (360×800); que la fecha se vea en la zona horaria local; aplicar `0006_valoraciones.sql` en Supabase antes de probar los votos.
- **Test a actualizar:** si algún test esperaba `share-notice`, ya no existe. Ninguno lo usa ahora.

**▶ Siguiente:** verificar la barra en navegador (escritorio y móvil) y decidir si el voto se permite en manuales no compartidos.

## V9 — Configuración desde el perfil (2026-11-09)
- `src/components/Header.tsx`: se quita el engranaje (`settings-button`). «Configuración» (`settings-menu-button`) está en el menú de perfil (`user-menu-button`).
- Con cuenta Google: `session-state` con Editar perfil, Configuración, separador y Cerrar sesión (sin cambios de testid).
- Sin cuenta: se muestra un menú de perfil con solo Configuración (`guest-menu`). Antes, sin cuenta no había forma de abrir Configuración desde el header. Así no quedó sin acceso. El botón de Iniciar Sesión sigue igual.
- Cambio interno: el menú busca sus elementos por `role="menuitem"` (sustituye al array `itemsRef`), así que las flechas funcionan con cualquier número de opciones.
- Verificado: `tsc --noEmit` exit 0; lint de `Header.tsx` exit 0. Sin verificar en navegador.
- **Pendiente de verificar:** con cuenta Google (editar, configuración, cerrar sesión, flechas) y sin cuenta (solo configuración; sin errores en consola); móvil 360×800 con el menú abierto.

**▶ Siguiente:** verificar el menú de perfil en navegador. Después, siguiente pendiente de `TAREAS.md`.

## Diagnóstico «mantener pulsado next-page» (2026-11-09)
- Causa: el test, no la app. En ventana de 1280×720, el botón ▶ queda en `y = 744`, fuera de la pantalla. `mouse.down()` sobre esa coordenada no entrega el `pointerdown` al botón, así que el avance nunca arrancaba. `click()` sí desplaza la página, por eso los demás tests pasaban.
- Fix: `viewer.nextPage.scrollIntoViewIfNeeded()` antes de leer la posición en `tests/e2e/viewer-controls.spec.ts`.
- Resultado en sandbox (chromium, 1 worker): `viewer-controls.spec.ts` 4/4 pasan. En Windows, con 1 worker, 3/4 pasaban antes del fix; el 4.º era este caso.
- Con 4 workers en Windows, los 4 casos fallaban por carga (el indicador no se estabilizaba). Usar `--workers=1` para esta suite hasta revisar la carga.
- **Pendiente de decisión (UX):** en pantallas de 720 px de alto, las flechas del visor quedan bajo el pliegue. Hay que bajar la página para pasar páginas. Decidir si el libro se ajusta al alto de la ventana o si las flechas van a los laterales.
- **Pendiente de verificar en Windows:** `npx playwright test tests/e2e/viewer-controls.spec.ts --project=chromium --workers=1`.

## V5c — Flechas laterales en tablet (2026-11-09)
- Decisión del usuario: en tablet, las flechas van a los lados del libro. Motivo: en pantallas bajas, debajo del libro quedan fuera de la vista.
- Rango tablet: `TABLET_QUERY = (min-width: 768px) and (max-width: 1279px)` (`src/lib/bookSize.ts`). Fuera de ese rango, las flechas siguen debajo.
- El libro en tablet ocupa `calc(100vw - 220px)` como máximo (`vwEscritorio`), dejando 110 px a cada lado. `anchoPagina` (barra de información) usa el mismo ancho, así que cuadran.
- `BookViewer.tsx`: `flechaAnterior` y `flechaSiguiente` se definen una vez y se renderizan en un lugar u otro según `lateral`. Con `display: contents` fuera de tablet, el layout no cambia.
- Verificado en sandbox (chromium, 1024×768): ◀ en x=54, ▶ en x=926, libro en x=110–914, sin solape. Captura revisada: portada con ◀ apagado (trazo gris, sin fondo).
- Verificado: `tsc` exit 0; lint exit 0.
- **Pendiente de verificar en Windows:** tablet real (iPad 768×1024 y 1024×768) en vertical y horizontal; que la portada desplazada no tape la flecha; que el giro con la flecha lateral y con mantener pulsado sigue funcionando.
- **Pendiente de decisión:** en portátil 1280×720 las flechas siguen debajo, fuera de la vista. Sin cambios hasta que lo decidas.

## V11, cabecera sticky y campana duplicada (2026-11-09)
- **V11 — Mostrar anuncios:** nuevo ajuste `mostrarAnuncios` en `src/lib/ajustes.ts`, desactivado por defecto. En `SettingsModal` aparece como switch (`ads-switch`). En `Viewer.tsx` el banner solo se renderiza si está activado. El spec anterior de V11 decía lo contrario; se cambió por petición del usuario.
- **Cabecera:** `Header.tsx` pasa de `fixed` a `sticky top-0 z-40 w-full`, y se elimina el espaciador `h-[72px]`. Así el contenido empieza siempre debajo del header (sin depender de una altura duplicada a mano) y, al hacer scroll, el header queda encima.
- **Campana duplicada:** había dos `notifications-button` idénticos en `Header.tsx`. Se deja uno.
- **Banner «tapado»:** no lo reproduje en el sandbox (360×800 y 1024×768: el banner empieza en y=88, debajo del header en y=72). La causa probable era el `fixed` con el espaciador, ahora eliminados. Pendiente de confirmar en Windows.
- Verificado en sandbox (chromium): sin ajuste, no hay banner y el título está en y=209; con ajuste, el banner está en y=88; con scroll en 360×500, el header está en top=0 y es el elemento que recibe el clic en la parte superior. `tsc` y lint exit 0.
- **Pendiente de verificar en Windows:** el switch de Configuración (activar y desactivar el banner); el header al hacer scroll en la biblioteca y en el visor; móvil 360×800.
- **Riesgo conocido, no causado por este cambio:** `library.spec.ts` › «muestra la galería y el botón de añadir» falla en el sandbox por timeout de 5 s al cargar la galería en frío. Falla igual con la cabecera anterior. Revisar en Windows; si persiste, subir el timeout de espera de `gallery` o esperar a `manifest.json`.
