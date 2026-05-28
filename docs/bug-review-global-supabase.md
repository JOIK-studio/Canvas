# Anexo para issue: bug-review-global-supabase

> Hallazgos listos para anexar al borrador del issue global de bugs + verificación Supabase.

## 1) Credenciales de Supabase expuestas en cliente
- **Afecta:** `Code/js/config.js`
- **Evidencia:** `window.CANVAS_SUPABASE_URL` y `window.CANVAS_SUPABASE_KEY` están hardcodeadas en frontend (`Code/js/config.js:10-11`).
- **Impacto:** Cualquier visitante puede reutilizar la anon key del proyecto; aumenta superficie de abuso si RLS/policies no están cerradas.
- **Siguiente paso:** Rotar la anon key en Supabase y cargar credenciales por entorno (no hardcode en repo).

## 2) Ajustes de Supabase guardados no tienen prioridad real
- **Afecta:** `Code/js/auth.js`, `Code/js/profile.js`, `Code/js/settings.js`, `Code/js/config.js`
- **Evidencia:** `getSupabaseConfig()` prioriza `window.CANVAS_SUPABASE_*` antes de `localStorage` (`auth.js:95-97`, `profile.js:85-87`), mientras Ajustes guarda en `localStorage` (`settings.js:31-33`).
- **Impacto:** El usuario cree cambiar conexión desde Ajustes, pero la app sigue usando la config hardcodeada.
- **Siguiente paso:** Invertir prioridad (localStorage/meta > window) o eliminar configuración hardcodeada.

## 3) Logout incompleto para sesiones Supabase
- **Afecta:** `Code/js/auth-check.js`, `Code/js/auth.js`
- **Evidencia:** `logout()` sólo borra localStorage (`auth-check.js:27-29`) y no ejecuta `supabase.auth.signOut()`. Además elimina `sb-auth-token`, pero Supabase v2 usa claves namespaced por proyecto.
- **Impacto:** Riesgo de sesión remanente; posible reautenticación inesperada en siguientes cargas.
- **Siguiente paso:** Implementar logout real con cliente Supabase y limpieza del storage key correcto del proyecto.

## 4) Persistencia principal de la app sigue local-only (sin escritura a BD)
- **Afecta:** `Code/js/state.js` (+ módulos que consumen Store)
- **Evidencia:** Estado completo en `localStorage` (`state.js:2`, `state.js:404-407`), y operaciones core (`publishCreation`, `likeCreation`, `boostCreation`) sólo mutan estado local (`state.js:503-555`). No existen llamadas `.from(...)` en `Code/js`.
- **Impacto:** Sin sincronización real multi-dispositivo ni persistencia backend para creaciones/likes/boosts/open-canvas.
- **Siguiente paso:** Añadir capa de persistencia Supabase para operaciones de Store y carga inicial desde BD.

## 5) Contraseñas en texto plano en modo local
- **Afecta:** `Code/js/auth.js`
- **Evidencia:** Alta local guarda `password` directo (`auth.js:372-377`) y login compara contra texto plano (`auth.js:289-291`).
- **Impacto:** Exposición de credenciales en localStorage.
- **Siguiente paso:** Evitar almacenamiento de password local (o mínimo hashear con salt); preferir sólo flujo Supabase.

## 6) Inconsistencia de clave de estado (`v3` vs `v4`)
- **Afecta:** `Code/js/state.js`, `Code/ts/store.ts`, `Code/js/auth-check.js`
- **Evidencia:** JS usa `canvas_app_state_v3` (`state.js:2`, `auth-check.js:28`) y TS usa `canvas_app_state_v4` (`store.ts:3`).
- **Impacto:** Riesgo de estados divergentes/migraciones rotas si se usa la capa TS.
- **Siguiente paso:** Unificar storage key + política de migración.

## 7) Verificación operativa Supabase/DB: estado actual
- **Afecta:** Integración global
- **Evidencia de código:** Supabase se usa en auth/profile (`auth.js`, `profile.js`), pero no en la capa de datos principal (`state.js`).
- **Evidencia de ejecución (sandbox):** intento de reachability a `https://rzztmvdllnqmgjefsupa.supabase.co` devolvió error de red del entorno (`curl` con código `000`, exit `6`), por lo que no se pudo validar conectividad real desde este runner.
- **Impacto:** No hay confirmación técnica de “BD funcionando end-to-end” para flujos productivos; actualmente sólo hay acoplamiento parcial a auth.
- **Siguiente paso:** Ejecutar smoke tests desde entorno con salida a internet y validar flujos: signup/login/logout, create/read/update en tablas, políticas RLS y Open Canvas.

## 8) Hallazgo CI relacionado (para seguimiento)
- **Afecta:** GitHub Actions (histórico reciente)
- **Evidencia:**  
  - Run `26526112005` (pages build): fallo Jekyll por `No such file or directory @ dir_chdir0 - /github/workspace/docs` durante `assets/css/style.scss`.  
  - Run `26524611145` (CodeQL): `CodeQL job status was configuration error`.
- **Impacto:** Inestabilidad de pipeline y menor señal de calidad automática.
- **Siguiente paso:** Revisar config de Pages/docs en workflow y ajustes de CodeQL para evitar fallos de configuración.
