# Tutorial: Tu flujo completo de diseño y producto

Este es tu sistema de trabajo de principio a fin. Léelo una vez con calma
y tenlo como referencia. No es un tutorial genérico — describe exactamente
cómo funcionan juntas tus herramientas.

---

## 1. Las herramientas y sus roles

```
┌─────────────────────────────────────────────────────────────────┐
│  FIGMA DESIGN                                                    │
│  → Diseñas pantallas, sistemas de diseño, componentes, estados  │
│  → Usas el plugin de Figma para pasar diseños a Claude/Cursor   │
│  → Motion para animar SVGs de loading screens y transiciones    │
└──────────────────────────────┬──────────────────────────────────┘
                               │ exportas diseño / tokens / animación
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  CLAUDE (implementador principal)                                │
│  → Lee STATE.md primero en cada sesión                          │
│  → Implementa lo que le pides                                   │
│  → Escribe data-testid en todos los elementos clave             │
│  → Actualiza STATE.md al final de cada respuesta                │
│  → Genera el prompt de continuidad cuando se acaban créditos    │
└───────────────┬────────────────────────┬────────────────────────┘
                │ push rama              │ entrega ZIP
                ▼                        ▼
┌──────────────────────┐    ┌────────────────────────────────────┐
│  CURSOR (QA)         │    │  GITHUB (fuente de verdad)         │
│  → Corre Playwright  │    │  → produccion protegido                  │
│  → Encuentra errores │    │  → ramas por feature               │
│  → NO los arregla    │    │  → PR con CI automático            │
│  → Prepara prompts   │    │  → Vercel escucha produccion             │
│    de continuidad    │    └──────────────────┬─────────────────┘
└──────────────────────┘                       │ deploy automático
                                               ▼
                                   ┌───────────────────────┐
                                   │  VERCEL (producción)  │
                                   │  → produccion → producción  │
                                   │  → ramas → previews   │
                                   └───────────────────────┘

FIGMA MAKE (exploración lateral)
→ Clonas el repo para explorar ideas rápido
→ Vibe-codeas sin miedo a romper producción
→ Si algo vale, Claude lo implementa en el repo real
```

---

## 2. Setup inicial del proyecto (una sola vez)

### 2.1 Descomprime y sube a GitHub
```bash
# Descomprime el ZIP en tu máquina
# Abre la carpeta en tu terminal

git init
git add .
git commit -m "feat: initial project structure"
git branch -M produccion
git remote add origin https://github.com/tu-usuario/tu-repo.git
git push -u origin produccion
```

### 2.2 Configura Vercel
1. Ve a [vercel.com](https://vercel.com) → "Add New Project"
2. Importa tu repo de GitHub
3. Framework: **Vite** (lo detecta automáticamente)
4. Añade las variables de entorno:
   - `VITE_SUPABASE_URL` → tu URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` → tu anon key
5. Deploy

A partir de aquí, cada push a `produccion` despliega automáticamente.
Cada rama nueva genera una URL de preview única.

### 2.3 Configura GitHub Secrets para CI
```bash
# Con GitHub CLI (recomendado)
gh secret set VITE_SUPABASE_URL -b "https://xxxx.supabase.co"
gh secret set VITE_SUPABASE_ANON_KEY -b "eyJ..."

# O en GitHub → tu repo → Settings → Secrets and variables → Actions
```

### 2.4 Instala dependencias y Playwright
```bash
npm install
npx playwright install
```

### 2.5 Configura tu .env local
```bash
cp .env.example .env
# Edita .env con tus credenciales reales de Supabase
```

### 2.6 Genera los snapshots visuales de referencia
```bash
npm run dev  # en una terminal
npm run test:snapshots  # en otra terminal
git add tests/e2e/__snapshots__/
git commit -m "chore: initial visual snapshots"
git push
```

### 2.7 Pon la skill en tus instrucciones de Claude
1. Abre Claude → Settings (ícono tuyo) → Custom Instructions
2. Copia el contenido de `.claude/SKILL.md`
3. Pégalo en el campo de instrucciones
4. Guarda

Desde ahora, **todos tus Claudes** saben que deben leer `STATE.md` primero
y actualizar al final, sin que tengas que decírselo.

---

## 3. El día a día — cómo usar los comandos

Los comandos de `COMMANDS.md` son atajos. En vez de escribir una instrucción larga,
pegas el comando y Claude/Cursor sabe exactamente qué hacer.

### Empezar una nueva tarea con Claude
```
/start Quiero añadir un formulario de login con email y contraseña usando Supabase Auth
```

### Continuar en un chat nuevo (cuando se acaban los créditos)
1. Abre nuevo chat de Claude
2. Adjunta el ZIP del proyecto (descárgalo o usa el último que tengas)
3. Pega:
```
/continue
```
Claude lee `STATE.md` y te dice dónde quedó exactamente.

### Pedir a Cursor que valide lo que hizo Claude
```
/validate
```
Cursor corre lint + TypeScript + Playwright y te reporta qué falló,
sin arreglar nada.

### Cuando Claude implementó algo y quieres que Cursor prepare el PR
```
/pre-merge
```

---

## 4. Flujos típicos de trabajo

### Flujo A: De Figma Design a código

1. **Figma Design**: diseñas la pantalla/componente
2. **Plugin de Figma** (Figma to Code, o copies el diseño): exportas el diseño
3. **Claude**: `/figma-import [adjuntas imagen o pegas el código del plugin]`
   - Claude implementa respetando los tokens CSS de `src/index.css`
   - Añade `data-testid` a los elementos
4. **Cursor**: `/validate` → confirma que no se rompió nada
5. **GitHub**: rama → PR → merge → Vercel despliega

### Flujo B: Vibe-coding rápido con Figma Make

1. **Figma Make**: clonas el repo → exploras ideas rápido con la IA de Make
   - Los cambios de Make van a una rama, no a produccion
   - Make gasta créditos solo cuando le pides al agente que haga algo
   - Solo ver el preview no gasta créditos
2. Si la idea vale: le describes a **Claude** lo que exploraste
3. **Claude**: lo implementa limpiamente en el repo real
4. **Cursor**: `/validate`
5. PR → merge → Vercel

### Flujo C: Animación de Figma Motion

1. **Figma Motion**: creas la animación del SVG (loading screen, transición)
2. Exportas como código CSS/JS o lo describes
3. **Claude**: `/animation [descripción o código exportado]`
   - Claude crea `src/components/[Nombre]Animation.tsx`
   - Componente puro, sin lógica de negocio
4. **Cursor**: `/validate`
5. PR → merge

### Flujo D: Cuando Claude se queda sin créditos a mitad de una tarea

1. Claude actualiza `STATE.md` (siempre lo hace antes de terminar)
2. Descargas el ZIP del proyecto (o haces commit/push si Cursor está disponible)
3. Abres nuevo chat de Claude
4. Adjuntas el ZIP
5. Pegas `/continue`
6. Claude lee `STATE.md` y continúa exactamente donde quedó

### Flujo E: Cursor encuentra un bug

1. Cursor: `/find-bug [descripción del comportamiento raro]`
2. Cursor identifica el archivo y la línea — no lo arregla
3. Tú decides: ¿lo arregla Claude (lógica compleja) o Cursor (sintaxis simple)?
4. Si Claude: le describes el bug con la ubicación exacta que dio Cursor
5. Si Cursor: lo arregla y corre `/validate` para confirmar

---

## 5. Gestión del ZIP entre sesiones de Claude

Cuando no tienes Cursor disponible o prefieres ir por ZIP:

```
Claude sesión 1
  → implementa algo
  → actualiza STATE.md
  → "descarga el ZIP y en el próximo chat pega /continue"

Tú:
  → descargas el ZIP (botón Download en el chat de Claude)
  → abres nuevo chat
  → adjuntas el ZIP
  → /continue

Claude sesión 2:
  → lee STATE.md del ZIP
  → continúa
```

Cuando Cursor está disponible, es mejor hacer commit/push en vez de ZIP:
```bash
git add .
git commit -m "wip: [descripción de dónde quedó]"
git push origin [tu-rama]
```
Así el próximo Claude puede clonar el repo en vez de necesitar el ZIP.

---

## 6. Reglas que nunca se rompen

| Regla | Por qué |
|-------|---------|
| Puerto 3000 siempre | Figma Make y Playwright hardcoded |
| BrowserRouter siempre | Figma Make y Vercel necesitan rutas limpias |
| `.figma/make/` no se toca | Si se rompe, Figma Make no arranca |
| `.env` nunca al repo | Tus keys de Supabase son secretas |
| `data-testid` en elementos clave | Playwright no depende de clases que Figma/Make cambian |
| STATE.md siempre actualizado | Es la memoria entre sesiones de Claude |
| Nunca push directo a produccion | Vercel despliega automáticamente — un push malo rompe producción |
| Cursor reporta, no arregla | Ahorra tokens de Claude para lo importante |

---

## 7. Referencia rápida de archivos importantes

| Archivo | Para qué sirve |
|---------|---------------|
| `STATE.md` | Estado actual del proyecto — Claude lo lee primero siempre |
| `PLAN.md` | Roadmap y fases — Claude y el usuario lo consultan para priorizar |
| `COMMANDS.md` | Lista de `/comandos` — atajos para Claude y Cursor |
| `.claude/SKILL.md` | Va en Custom Instructions de Claude — base para todas las sesiones |
| `.cursor/rules` | Instrucciones de rol para Cursor |
| `src/index.css` | Tokens de diseño CSS — Claude los actualiza cuando Figma exporta tokens |
| `vercel.json` | Config de Vercel — no tocar a menos que cambies el framework |
| `.figma/make/` | Scripts para Figma Make — no tocar |

---

## 8. Checklist de lanzamiento de una feature

Antes de mergear cualquier rama a `produccion`:

- [ ] `npm run lint` → sin warnings
- [ ] `npx tsc --noEmit` → sin errores de tipos
- [ ] `npm run test:e2e` → todos los tests pasan
- [ ] Si hubo cambios visuales intencionales: `npm run test:snapshots` y commit de snapshots
- [ ] `npm run build` → compila sin errores
- [ ] `STATE.md` actualizado
- [ ] PR abierto con descripción de qué hace la feature
- [ ] CI pasa en GitHub Actions

---

## 9. Troubleshooting frecuente

**Figma Make no arranca el preview**
→ Verifica que `.figma/make/` existe y los scripts tienen permisos de ejecución
→ Verifica que el puerto 3000 está libre: `lsof -ti:3000 | xargs kill -9`

**Tests visuales fallan después de cambio de diseño intencional**
→ Es correcto — Playwright detectó el cambio
→ Si el cambio es intencional: `npm run test:snapshots` → commit snapshots

**Vercel falla en deploy pero localmente funciona**
→ Primero sospecha de env vars: comprueba que están en Vercel Dashboard
→ Segundo: `npm run build` local para ver el error exacto

**Claude del nuevo chat no sabe dónde estaba**
→ `STATE.md` no se actualizó antes de cerrar la sesión anterior
→ Revisa el último mensaje de la sesión anterior en el historial

**Supabase da error 42P01**
→ Es normal si la tabla no existe — significa que la conexión funciona
→ Solo es error real si el código no maneja ese caso

---

## 10. Cuando quieras añadir algo al sistema

¿Necesitas una integración nueva, un nuevo tipo de test, o cambiar el workflow?
Dile a Claude:
```
/start Quiero añadir [descripción]. Actualiza STATE.md, PLAN.md y COMMANDS.md 
si hace falta añadir algo, y dime si hay que cambiar algo en .cursor/rules 
o en .claude/SKILL.md.
```
Claude actualiza todos los archivos de configuración del sistema, no solo el código.
