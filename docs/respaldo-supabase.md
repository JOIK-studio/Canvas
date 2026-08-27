# Respaldo de los datos de Supabase (plan gratuito)

Esta guía explica cómo exportar **todo** el contenido del proyecto de Supabase vinculado a Canvas y cómo restaurarlo más adelante, sin necesidad de un plan de pago.

> **¿Por qué hace falta?** En el plan gratuito Supabase **no genera respaldos automáticos descargables** (esa función es de planes de pago), y además **pausa los proyectos tras ~7 días de inactividad**. Un proyecto pausado se puede restaurar durante **90 días**; pasado ese plazo solo queda la opción de *descargar* el último respaldo lógico. Si el proyecto llega a borrarse, **todos los datos se pierden definitivamente**.

---

## Qué contiene el proyecto

| Elemento | Ubicación |
|---|---|
| 10 tablas de datos: `profiles`, `creations`, `creation_likes`, `comments`, `boosts`, `pixel_shop_orders`, `creation_views`, `open_canvas_events`, `open_canvas_pixels`, `app_config` | esquema `public` |
| Políticas RLS, funciones, triggers y la vista `profile_stats` | esquema `public` |
| Usuarios registrados (email, hash de contraseña, identidades OAuth) | esquema `auth` (`auth.users`) |
| Configuración de Auth (proveedores OAuth, URLs de redirección) | **no está en la base de datos** — solo en el dashboard |

El esquema SQL de referencia también está versionado en [`Code/supabase_schema.sql`](../Code/supabase_schema.sql).

---

## Opción A — `pg_dump` completo (recomendada)

Captura esquema + datos + políticas + usuarios en un solo archivo.

### 1. Obtén la cadena de conexión

En el dashboard de Supabase: **Connect → pestaña "Session pooler"** (URI con puerto `5432`). Tiene esta forma:

```
postgresql://postgres.<REF-DEL-PROYECTO>:<CONTRASEÑA>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

- En el plan gratuito la conexión *directa* (`db.<ref>.supabase.com`) solo funciona con IPv6; el **session pooler** funciona sobre IPv4 desde cualquier PC.
- La contraseña es la de la base de datos (si se olvidó, se puede restablecer en **Project Settings → Database**).
- Si la contraseña tiene caracteres especiales, hay que codificarlos como URL (p. ej. `@` → `%40`).

### 2. Ten `pg_dump` instalado

Comprueba con `pg_dump --version`. Si no está:

- **Windows:** instalador de PostgreSQL (elige solo "Command Line Tools").
- **macOS:** `brew install libpq` (o `postgresql@16`).
- **Linux:** `sudo apt install postgresql-client`.

### 3. Ejecuta el respaldo

```bash
# Formato comprimido (recomendado, se restaura con pg_restore)
pg_dump "<URI-DE-CONEXIÓN>" -Fc -f canvas-supabase-2026-08.backup

# Alternativa en SQL plano (fácil de abrir e inspeccionar con un editor de texto)
pg_dump "<URI-DE-CONEXIÓN>" --no-owner --no-privileges -f canvas-supabase-2026-08.sql
```

Este volcado incluye los esquemas `public` **y** `auth`, es decir, también los usuarios registrados.

### 4. Verifica

```bash
pg_restore --list canvas-supabase-2026-08.backup | grep TABLE
```

Deben aparecer las 10 tablas (`profiles`, `creations`, …). Guarda el archivo en un lugar seguro (disco externo, nube personal).

---

## Opción B — Supabase CLI (requiere Docker)

```bash
supabase login
supabase link --project-ref <REF-DEL-PROYECTO>

supabase db dump -f respaldo/schema.sql             # esquema
supabase db dump --data-only -f respaldo/data.sql   # datos
supabase db dump --role-only -f respaldo/roles.sql  # roles
```

⚠️ Por diseño, `supabase db dump` **excluye los esquemas `auth` y `storage`**: con esta opción los usuarios **no** quedan respaldados. Combínala con la exportación de usuarios del siguiente apartado.

---

## Opción C — CSV desde el dashboard (sin instalar nada)

1. **Table Editor** → abrir cada tabla → botón de **exportar / Export to CSV**. Repetir con las 10 tablas.
2. Para los usuarios, en **SQL Editor** ejecutar y exportar como CSV:

```sql
select id, email, created_at, last_sign_in_at, raw_user_meta_data
from auth.users
order by created_at;
```

Limitaciones: los CSV no incluyen políticas RLS, funciones, vistas ni secuencias — sirven como respaldo de datos, no para reconstruir el proyecto completo.

---

## Exportar la configuración de Auth (hacerlo siempre)

Estos ajustes **no viajan en ningún dump** de base de datos. Si planeas revivir la app, anota o captura desde **Authentication** en el dashboard:

- Proveedores OAuth habilitados (Google, Discord…) y sus claves.
- **Site URL** y **Redirect URLs** (p. ej. `https://joik-studio.github.io/Canvas/`).
- Plantillas de correo, si se personalizaron.

---

## Si el proyecto ya se pausó

- **Antes de 90 días:** botón **Restore** en la página principal del proyecto (Project Overview). Al restaurar, conviene hacer de inmediato el respaldo de la Opción A.
- **Después de 90 días:** la restauración queda bloqueada, pero desde el **Project Overview** todavía se puede **descargar el respaldo lógico** (tomado justo antes de la pausa) y los objetos de Storage. Esa es la última oportunidad: al borrarse el proyecto, todo desaparece.

---

## Cómo restaurar más adelante

1. Crea un proyecto nuevo en [database.new](https://database.new).
2. Restaura el volcado:

```bash
psql "<URI-DEL-PROYECTO-NUEVO>" -f canvas-supabase-2026-08.sql
```

   Es normal que aparezcan errores tipo *already exists* (el proyecto nuevo ya trae los esquemas por defecto de Supabase); pueden ignorarse.
   Alternativa: crear el esquema con `Code/supabase_schema.sql` y volcar solo datos (`pg_dump --data-only`).
3. Reconfigura Auth: proveedores OAuth, Site URL y Redirect URLs del paso anterior.
4. Si revives el frontend: haz un **fork** del repositorio (los repos archivados sí se pueden bifurcar), copia `js/canvas-env.example.js` como `js/canvas-env.js` con la URL y la anon key del proyecto nuevo, y vuelve a activar GitHub Pages en el fork.

---

## ¿Mantener la app viva tras archivar el repo?

El sitio de GitHub Pages **sigue publicado** aunque el repositorio esté archivado, pero dejará de funcionar en cuanto Supabase pause el proyecto por inactividad. Opciones:

- **Dejarlo morir:** no hacer nada; ya tienes el respaldo completo.
- **Mantenerlo vivo:** mantener actividad en el proyecto (cualquier petición real a la API cuenta). Por ejemplo, un ping programado externo (cron-job.org o similar) a la URL REST del proyecto cada pocos días.
