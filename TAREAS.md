# Lote de tareas (nov 2026)

Lista viva. Cada punto tiene su especificación. Al resolverlo, **borra el bloque de especificación** y marca la casilla. Lo que quede aquí es lo pendiente. Contexto técnico y decisiones: `STATE.md`.

## Hecho
- [x] **M1 — Biblioteca móvil:** menú ⋯ en cada manual (Compartir / Eliminar), botón Añadir flotante abajo a la derecha, borrar del escritorio solo en pantallas sm+.
- [x] **M2 — Visor móvil:** se quitó el botón de pantalla completa.
- [x] **S1–S2 — Aviso de compartido y valoraciones:** aviso con foto, nombre, fecha y hora encima del libro; me gusta / no me gusta con contador (migración 0006 pendiente de aplicar).
- [x] **C1 — Adjuntar:** icono de clip en el editor; menú "Hacer foto" / "Subir archivo"; valida tipo (imagen o PDF) y tamaño (10 MB), y el adjunto se guarda con el comentario en el bucket `comentarios-adjuntos` (migración 0008 pendiente de aplicar). Se muestra como enlace en el panel.
- [x] **V1–V3 — Configuración:** modal con tema, notificaciones y volumen 0–200 %. La bocina y el switch de tema salen de la cabecera.
- [x] **M3 — Cerrar:** botones de cerrar con solo la cruz (`solar:close-linear`) en ShareModal y AddManualModal.
- [x] **S3 — Aviso de compartido solo en manuales ajenos:** `ShareNotice` no se muestra si `manual.ownerId` es el usuario actual.
- [x] **V8 — Logo del header +20 %:** de `h-8` (32 px) a `h-[38px]`.
- [x] **V5 — Flechas deshabilitadas:** la anterior en portada y la siguiente en contraportada quedan `disabled` sin hover ni cursor de pulsable; el mantener pulsado no arranca en esos casos.
- [x] **V6 — Botón atrás:** primero de la barra, solo icono `solar:undo-left-round-linear`, sin texto. **Verificar en Windows que el icono carga**; si no, cambiar a `solar:arrow-left-linear`.
- [x] **V4 — Barra de información del manual:** `TopInfoManual` (`src/components/TopInfoManual.tsx`) sustituye al aviso de compartido en todos los manuales. Autor y fecha a la izquierda; contador de me gusta a la derecha. Al acercar el cursor aparecen los pulgares; se ocultan 1,5 s después de salir si no se ha votado, y desaparecen al votar. Ancho de una página del libro, centrado (`anchoPagina` en `src/lib/bookSize.ts`). Migración 0006 pendiente de aplicar.
- [x] **V9 — Configuración desde el perfil:** el engranaje sale de la cabecera. «Configuración» está en el menú de perfil (`user-menu-button`, `settings-menu-button`), con y sin cuenta. Sin cuenta, el menú tiene solo esa opción; el botón de Iniciar Sesión se mantiene.
- [x] **V5c — Flechas laterales en tablet:** en 768–1279 px de ancho, ◀ y ▶ se colocan a los lados del libro (centradas en vertical) en vez de debajo. Fuera de ese rango no cambia nada. `TABLET_QUERY` y `vwEscritorio` en `src/lib/bookSize.ts`.
- [x] **V11 — Mostrar anuncios:** nueva opción en Configuración (`ads-switch`), desactivada por defecto. Si está desactivada, el banner no sale en el visor. Guardado en `ajustes` como `mostrarAnuncios`. Nota: el spec anterior decía lo contrario (activar ocultaba); se cambió por petición del usuario.
- [x] **Cabecera sticky:** el header pasa a `sticky` dentro del flujo y se elimina el espaciador. El contenido empieza debajo del header y, al hacer scroll, el header queda encima. Se quitó una de las dos campanas de notificaciones duplicadas.
- [x] **V5b — Flechas del visor como componente:** `PageArrowButton` (`src/components/ui/PageArrowButton.tsx`). Sin página en esa dirección: sin contenedor blanco ni sombra, trazo en `gris-txt` y cursor normal (sin símbolo de cancelado). Durante un giro no cambian de aspecto y el mantener pulsado ya no se corta. Usa `aria-disabled`, no `disabled`.
- [x] **V7a — Hover de notificaciones:** quitado el hover propio (fondo azul y trazo blanco); usa el mismo hover que el resto de `IconButton`. **Falta** comprobar el resto de botones de cabecera.

## Pendiente

### Sistema de diseño
- [ ] **D1 — Tokens:** espaciados, tamaños de texto, colores, radios y sombras como variables (`:root` y modo oscuro) y en `tailwind.config.ts`. Detectar valores sueltos (`px`, colores fijos) y migrarlos.
- [ ] **D2 — Componentes base:** `Button` con variantes primaria y secundaria, tamaños (sm, md, lg), estados (hover, focus, disabled, loading) e icono opcional; `IconButton` para acciones de cabecera; `CloseButton` (solo cruz) para todos los modales.
- [x] **D3 — Auditoría de incoherencias (cerrada):** revisar dónde se repiten estilos a mano en lugar de usar componentes, y dónde falta React (props, composición, datos en lugar de copias).

### Comentarios
- [x] **C2 — Redactar con IA:** botón junto al editor; modal con visor animado, frases sugeridas, adjunto de imagen o PDF (texto extraído en el servidor) y Groq. **Pendiente de revisión:** diseño final de la animación y prueba del PDF en Vercel (pdfjs-dist en Node).
- [x] **C3 — Formato en comentarios:** negrita, cursiva, subrayado y enlaces desde una barra al seleccionar. Migración 0007 pendiente de aplicar.
### Visor y cabecera
- [ ] **V7b — Hover unificado de acciones de cabecera:** todos los botones de acción usan el mismo `IconButton` y el mismo efecto hover. Revisar comentarios, compartir, atrás y configuración.
- [ ] **V10 — Volumen en porcentaje de usuario:** el slider va de 0 % a 100 % (lo que hoy es 0–200). Por defecto 50 % (equivale a la ganancia 1,0 interna). Ganancia = `valorMostrado / 50`, así el 100 % mostrado es el doble de volumen para ambientes ruidosos. Convertir los ajustes guardados en `gbv-ajustes` al leerlos (volumen interno / 2).

### Comentarios
- [ ] **C4 — Reintentar transcripción de notas de voz:**
  - Si la transcripción falla y el audio sigue en el bucket, mostrar el botón «Reintentar subir».
  - Reintento automático en segundo plano hasta que se transcriba. Máximo 10 intentos.
  - Tras el intento 10 sin éxito, crear una incidencia y enviarla al panel de administrador (C7).
- [ ] **C5 — Modo comentario:**
  - El botón de comentarios activa el modo. Cualquier punto del manual permite crear un comentario.
  - La barra de acciones muestra: cerrar modo comentarios, abrir el listado (C6).
  - Botón guardar con icono de check, no de casete. Al pulsarlo, mostrar animación de envío y no volver al modo inicial hasta que termine.
- [ ] **C6 — Listado de comentarios en drawer lateral:**
  - Buscador por nombre de usuario y por texto.
  - Filtros: página (dropdown pequeño); orden (cronológico o por página); agrupar por usuario (grupos en orden alfabético de nombre); switch de icono para más recientes o más antiguos (por defecto, más recientes).
  - Filas en una sola columna, en orden cronológico. Cada fila: número de página (pequeño), miniatura de la página, card con foto pequeña, nombre de usuario y dos líneas de texto truncadas, y fecha y hora debajo.
  - Pulsar una fila lleva a la página y abre el comentario para leerlo.
- [ ] **C7 — Panel de incidencias (solo administrador):**
  - Visible solo para `andyydalay4@gmail.com`. Se activa desde las opciones de perfil de administrador.
  - Otros usuarios solo lo ven si el administrador les concede permiso de administrador desde la configuración de la app.
  - Lista incidencias de transcripción (C4) y otras, con usuario, comentario, código de error y fecha.
  - Requiere tabla nueva (migración 0009) con permisos de lectura solo para administradores.

## Pendientes de otros frentes (ya en STATE.md)
- Limpiar el manual huérfano "ALTA" (SQL: borrar la fila; los archivos sueltos se borran desde Storage).
- Ejecutar en Windows: `comentarios.spec.ts` (T9, ya pasa) y `movil.spec.ts` (T8).
- P2: comprobar que el `user.id` se conserva tras iniciar sesión con Google.
