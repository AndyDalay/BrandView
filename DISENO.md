# Sistema de diseño (tokens)

Los valores viven en `src/index.css` (`:root` y modo oscuro) y se usan como utilidades de Tailwind en `tailwind.config.ts`.

| Grupo | Variables CSS | Utilidades Tailwind |
|---|---|---|
| Espaciado | `--space-1` … `--space-12` (4 px base) | `p-s4`, `gap-s2`, `m-s6` … (`s1`, `s2`, `s3`, `s4`, `s5`, `s6`, `s8`, `s10`, `s12`) |
| Radios | `--radius-sm` … `--radius-full` | `rounded-sm` … `rounded-full` |
| Sombras | `--shadow-sm` … `--shadow-xl` | `shadow-sm` … `shadow-xl` |
| Tipografía | `--text-xs` … `--text-3xl` | `text-xs` … `text-3xl` |
| Colores | `--azul`, `--terracota`, `--superficie`, grises… | `azul`, `terracota`, `superficie`, `gris-*` |

Regla: no escribir valores sueltos (`px`, `#hex`) en componentes nuevos; usar un token. Los valores existentes se migran en D2/D3.

## Auditoría D3 (incoherencias detectadas)
- Botones de icono hechos a mano con `grid h-N w-N ...` repetidos en visor, cabecera, comentarios y grabador. Migrados a `IconButton` en: visor (comentarios, compartir, sonido, volver), cabecera (campana), comentarios (cerrar, borrar, cancelar, guardar) y grabador (terminar, cancelar).
- Pendiente de migrar: `Header` (botón de perfil y menú), `Library` (botón Añadir y menú ⋯), `ThemeToggle`, `ConfirmDeleteModal` y `AddManualModal` (botón de guardar).
- Colores fijos fuera de tokens: `text-red-700`, `text-red-800`, `border-red-300` (aviso de login) y `bg-[#...]` en el degradado del hover de la biblioteca. Deberían usar `terracota`.
- Tamaños de texto con corchetes (`text-[11px]`, `text-[8px]`): fuera de la escala de tokens. Decidir si se añade un token `--text-2xs`.
- Valores de espaciado en píxeles fijos (`h-[72px]`, `h-[60px]`, `w-[min(92vw,460px)]`): aceptables cuando son dimensiones de layout, pero conviene nombrarlos.

## Estado tras la migración (actualizado)
- Migrados: biblioteca (Añadir y Añadir flotante), modal de borrar (Cancelar y Borrar con variante `peligro`).
- `Button` añade variante `peligro` y prop `pill` (forma de píldora).
- Pendiente: menú de perfil de la cabecera (se rehace en V1), selector de tema (se mueve a Ajustes), botones de tarjeta de AddManualModal (son tarjetas, no botones de acción; decidir si son un componente propio).

## Cierre de D3 (2026-11-08)
- Resuelto: colores de error del aviso y de la cabecera pasan a `terracota`; el degradado de la biblioteca usa `negro`; los textos de 11 px y 8 px pasan a la escala (`text-xs`, `text-[10px]`). La etiqueta "PÁGINAS" sube de 8 a 10 px por legibilidad: es el único cambio visual.
- Pendiente real: el menú de perfil de la cabecera sigue como estaba (no lo tocó V1). Se migra a `Button` fantasma en una tarea aparte.
- Pendiente real: el selector de tema ya está en el modal de Configuración, pero el componente `ThemeToggle` aún se usa desde allí; decidir si se convierte en un `Switch` del sistema.
- Las tarjetas de AddManualModal se quedan como componente propio de selección.
