# Lote de tareas (nov 2026)

Lista viva. Cada punto tiene su especificación. Al resolverlo, **borra el bloque de especificación** y marca la casilla. Lo que quede aquí es lo pendiente. Contexto técnico y decisiones: `STATE.md`.

## Hecho
- [x] **M1 — Biblioteca móvil:** menú ⋯ en cada manual (Compartir / Eliminar), botón Añadir flotante abajo a la derecha, borrar del escritorio solo en pantallas sm+.
- [x] **M2 — Visor móvil:** se quitó el botón de pantalla completa.
- [x] **M3 — Cerrar:** botones de cerrar con solo la cruz (`solar:close-linear`) en ShareModal y AddManualModal.

## Pendiente

### Sistema de diseño
- [ ] **D1 — Tokens:** espaciados, tamaños de texto, colores, radios y sombras como variables (`:root` y modo oscuro) y en `tailwind.config.ts`. Detectar valores sueltos (`px`, colores fijos) y migrarlos.
- [ ] **D2 — Componentes base:** `Button` con variantes primaria y secundaria, tamaños (sm, md, lg), estados (hover, focus, disabled, loading) e icono opcional; `IconButton` para acciones de cabecera; `CloseButton` (solo cruz) para todos los modales.
- [ ] **D3 — Auditoría de incoherencias:** revisar dónde se repiten estilos a mano en lugar de usar componentes, y dónde falta React (props, composición, datos en lugar de copias).

### Visor
- [ ] **V1 — Modal de configuración:** botón de ajustes en la cabecera (móvil, tablet y escritorio). Contiene: notificaciones (activar/desactivar), tema claro/oscuro (switch), volumen 0–200 %.
- [ ] **V2 — Quitar la bocina de la cabecera del visor** y moverla al modal de configuración con el control de volumen.
- [ ] **V3 — Quitar el switch de tema del header** y dejarlo solo en el modal de configuración.

### Comentarios
- [ ] **C1 — Adjuntar en el editor de comentarios:** icono de clip; al pulsarlo, elegir "Hacer foto" o "Subir archivo".
- [ ] **C2 — Redactar con IA:** botón pequeño solo icono junto al área de texto. Abre un modal encima de todo con título "Comentar con IA".
  - Visor animado (SVG) que cambia según estado: escribiendo, pensando, subiendo documento.
  - Animación sencilla inspirada en iconos Solar que parezcan flotar. Trazo con gradiente que recorre el contorno: gris suave 60 %, azul principal 30 %, azul eléctrico 10 % con glow que aparece, se desplaza y desaparece, y reaparece en otro punto.
  - Fondo con gradiente radial azul y gris con ruido, suave.
  - Pequeñas estrellas de IA de 4 puntas que salen del centro, crecen un poco y se encogen al alejarse.
  - Debajo: campo de texto para pedir lo que se quiere, 2–3 chips de frases base (comentario sobre un trabajo documentado), adjuntar PDF o foto que la IA usa como contexto.
  - Se envía a una IA gratuita (mismo patrón que ya usamos) y devuelve una redacción breve.
  - La IA puede resaltar palabras con formato.
- [ ] **C3 — Formato en comentarios:** al seleccionar texto de un comentario aparece una barra con negrita, cursiva, subrayado y enlace.
  - Enlace: se pega una URL sobre el texto seleccionado.
  - Quitar enlace: al borrar la palabra enlazada, el resaltado azul se pierde a la primera; no hace falta borrar letra a letra.

### Compartidos
- [ ] **S1 — Aviso de manual compartido:** encima del libro, con un espacio entre el libro y el aviso, aparece una foto + nombre y un subtítulo pequeño "te ha compartido este documento", con fecha y hora.
- [ ] **S2 — Valoración:** en ese aviso, botones pequeños de me gusta y no me gusta (manitos). Al tocar uno, desaparecen los dos y se muestra el contador de me gusta de ese manual.

## Pendientes de otros frentes (ya en STATE.md)
- Limpiar el manual huérfano "ALTA" (SQL: borrar la fila; los archivos sueltos se borran desde Storage).
- Ejecutar en Windows: `comentarios.spec.ts` (T9, ya pasa) y `movil.spec.ts` (T8).
- P2: comprobar que el `user.id` se conserva tras iniciar sesión con Google.
