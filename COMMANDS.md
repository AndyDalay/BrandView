# Comandos del Proyecto

Pega cualquiera de estos en el chat de Claude o Cursor para activar el comportamiento descrito.
No tienes que escribir todo — el comando es suficiente.

---

## Comandos de sesión de Claude

### `/continue`
```
Lee STATE.md y dime en 3 líneas dónde quedamos y qué toca hacer ahora.
No hagas nada todavía — primero confirma que lo entendiste.
```

### `/start [descripción de la tarea]`
```
Nueva tarea: [descripción].
Lee STATE.md y PLAN.md, luego implementa.
Al terminar actualiza STATE.md con lo que hiciste y qué sigue.
```

### `/state`
```
Actualiza STATE.md con el estado actual de lo que hemos hecho en esta sesión.
Incluye qué está hecho, qué está en progreso, qué falta y cualquier problema conocido.
```

### `/handoff`
```
Genera el prompt de continuidad para pegar en el próximo chat de Claude.
Incluye: qué se hizo hoy, en qué estado quedó, qué es lo siguiente,
y qué archivos son importantes leer primero.
```

### `/plan`
```
Lee PLAN.md y STATE.md. Dime en qué fase estamos, qué falta en la fase actual
y qué deberíamos priorizar en esta sesión.
```

---

## Comandos de implementación de Claude

### `/new-page [NombrePagina]`
```
Crea una nueva página llamada [NombrePagina]:
- src/pages/[NombrePagina].tsx con data-testid en elementos clave
- Añade la ruta en App.tsx
- Crea tests/e2e/[nombre].spec.ts con tests base
- Crea tests/fixtures/[NombrePagina]Page.ts con Page Object
- Actualiza STATE.md
```

### `/new-component [NombreComponente]`
```
Crea un componente reutilizable llamado [NombreComponente]:
- src/components/[NombreComponente].tsx con props tipadas y data-testid
- Estilo inline o módulo CSS según la complejidad
- Exporta nombrado, no default
- Actualiza STATE.md
```

### `/new-hook [nombreHook]`
```
Crea un custom hook llamado [nombreHook]:
- src/hooks/[nombreHook].ts
- Tipos explícitos para parámetros y retorno
- Sin dependencias de UI — solo lógica y datos
- Actualiza STATE.md
```

### `/figma-import [descripción del diseño]`
```
Tengo este diseño de Figma: [descripción / imagen adjunta].
Impleméntalo respetando el sistema de diseño existente en src/index.css.
Usa los tokens de color y spacing ya definidos.
Añade data-testid a los elementos interactivos.
Actualiza STATE.md al terminar.
```

### `/design-tokens [lista de tokens]`
```
Actualiza el sistema de diseño en src/index.css con estos tokens de Figma:
[lista].
No rompas los tokens existentes — solo añade o actualiza.
Actualiza PLAN.md sección "Sistema de diseño".
```

### `/animation [descripción]`
```
Implementa esta animación exportada de Figma Motion: [descripción / código adjunto].
Colócala en src/components/[Nombre]Animation.tsx.
Debe ser un componente puro sin lógica de negocio.
```

### `/auth`
```
Implementa autenticación básica con Supabase:
- Login con email/password
- Logout
- Hook useAuth en src/hooks/useAuth.ts
- Protección de rutas privadas en App.tsx
- Página Login en src/pages/Login.tsx
- Actualiza STATE.md y PLAN.md
```

---

## Comandos de QA para Cursor

### `/validate`
```
Corre los tests de Playwright y reporta:
1. Qué tests pasan
2. Qué tests fallan (nombre del test + error exacto, sin arreglarlo)
3. Si los tests visuales tienen diferencias (adjunta screenshot)
4. Cualquier error de TypeScript (tsc --noEmit)
No arregles nada — solo reporta.
```

### `/validate-feature [nombre]`
```
Corre solo los tests relacionados con [nombre]:
npx playwright test [nombre].spec.ts
Reporta resultado sin arreglar nada.
```

### `/snapshot-update`
```
Actualiza los snapshots visuales de referencia:
npx playwright test tests/e2e/visual.spec.ts --update-snapshots
Haz commit de los nuevos snapshots con mensaje:
"chore: update visual snapshots after [descripción del cambio]"
```

### `/pre-merge`
```
Checklist antes de mergear a produccion:
1. npm run lint → sin errores
2. npx tsc --noEmit → sin errores de tipos
3. npm run test:e2e → todos los tests pasan
4. Verifica que vercel.json está correcto
5. Reporta resultado — NO hagas merge tú, solo di si está listo
```

### `/find-bug [descripción del bug]`
```
Busca dónde está el bug: [descripción].
Busca en el código fuente, identifica el archivo y línea probable.
NO lo arregles — reporta exactamente dónde está y por qué crees que es ahí.
El usuario decide si lo arregla Claude o lo arregla aquí.
```

---

## Comandos de despliegue

### `/deploy-check`
```
Verifica que el proyecto está listo para producción:
1. npm run build → sin errores
2. Revisa vercel.json → configuración correcta
3. Revisa que .env.example tiene todos los vars necesarios
4. Confirma que las env vars están en Vercel dashboard
Reporta qué falta, si falta algo.
```

### `/branch [nombre-rama]`
```
Crea una rama nueva para la siguiente feature:
git checkout -b [nombre-rama]
Actualiza STATE.md con la rama activa.
```

---

## Comandos de Figma Make

### `/figma-make-clone`
```
Instrucciones para clonar este repo en Figma Make:
1. Abre Figma Beta desktop app
2. Crea archivo Make → "Clone a repository"
3. URL del repo: [el usuario pone la URL de GitHub aquí]
4. Make detecta .figma/make/ automáticamente
5. Puerto 3000 — no cambiar nada
El preview carga la app en tiempo real.
Los cambios de Make van a rama → PR, igual que los de Claude.
```
