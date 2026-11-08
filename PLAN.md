# Plan del Producto — GrandBrandView

> Documento vivo. Claude y Cursor lo consultan para saber qué viene después.

---

## Visión

Plataforma para publicar y hojear manuales de marca como libros digitales. El público puede hojearlos, buscarlos y compartirlos por enlace (WhatsApp, Telegram, correo). El propietario sube sus manuales, los ordena y decide cuáles comparte.

## Fases

### Fase 1 — Base sólida (en curso)
- Flujo de trabajo: STATE/PLAN, reglas de Cursor y Claude, Playwright, CI.
- Limpieza de UI: header solo con logo, responsive 360×800, modal de borrado propio.
- Tests E2E para galería, visor y compartir.

### Fase 2 — Visor completo
- Controles: mantener para pasar rápido, editar número de página.
- Corrección de sombras al abrir y cerrar.
- Modo lectura a pantalla completa, horizontal en móvil.

### Fase 3 — Compartir mejorado
- Imagen OG por manual (función de servidor que devuelve metaetiquetas por manual).
- Enlace compartido siempre público (`VITE_PUBLIC_APP_URL`).

### Fase 4 — Monetización
- Anuncios (AdSense o Ad Manager, según aprobación del sitio).
- Opción "Quitar anuncios": ver un vídeo o donar para 1 año.
- PayPal: pendiente; no bloquea la fase.

### Fase 5 — Comentarios con audio
- Marcadores en las páginas, grabación con visualizador, transcripción Whisper en backend.
- Reproducción del audio original o de voz sintetizada.
- Requiere backend (funciones de servidor) y claves de Hugging Face/Groq en variables de entorno.

## Decisiones abiertas
- Proveedor de anuncios: AdSense (entrada más fácil) o Ad Manager (vídeo recompensado).
- Backend para transcripción: funciones de Vercel vs. Supabase Edge Functions.
