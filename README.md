# Canvas

> [!IMPORTANT]
> **Proyecto archivado — agosto de 2026.**
> Este repositorio ya no recibe mantenimiento: no se aceptan issues ni pull requests y los flujos de trabajo programados (CodeQL) dejaron de ejecutarse.
> El sitio de GitHub Pages sigue publicado en **https://joik-studio.github.io/Canvas/**, pero la aplicación depende del backend de Supabase (que puede pausarse por inactividad en el plan gratuito).
> La web muestra un aviso descartable de «Proyecto archivado» en sus páginas de entrada. **Para eliminarlo:** borra `Code/js/archived-notice.js` y la línea `<script>` que lo carga en `Code/index.html` y `Code/app.html`.
> Para exportar o restaurar la base de datos, consulta **[`docs/respaldo-supabase.md`](docs/respaldo-supabase.md)**.

**Canvas** es una plataforma social de pixel art estilo r/Place, donde los usuarios crean piezas de arte en cuadrícula, las publican en una galería compartida y compiten por visibilidad en el **Open Canvas** — un mural colaborativo de 500 × 500 píxeles.

---

## Características principales

| Módulo | Descripción |
|---|---|
| **Editor** | Cuadrícula configurable (16 – 32 × 16 – 32) con paleta de 35 colores |
| **Open Canvas** | Mural global colaborativo de 500 × 500, actualización en tiempo real |
| **Galería** | Feed de creaciones públicas con likes, boosts, comentarios y remix |
| **Tienda** | Compra de paquetes de píxeles con las monedas de la cuenta |
| **Perfil** | Historial de creaciones, estadísticas y configuración de usuario |
| **Economía** | Sistema de monedas, inventario de píxeles y cargas de publicación |
| **Temas** | Modo claro y oscuro con persistencia por usuario |

---

## Tecnologías

- **Frontend:** HTML5, CSS3 y JavaScript vanilla (sin frameworks)
- **Tipos:** TypeScript (`Code/ts/`) para definiciones de interfaces y store
- **Backend:** [Supabase](https://supabase.com/) — PostgreSQL, Auth y Row Level Security
- **Autenticación:** Email/contraseña + OAuth (Google, Discord, etc.) vía Supabase

---

## Modo funcional

Canvas actualmente cuenta con servidores en linea para el usuario (vinculadas con Supabase)

---

## Página pública

Canvas está disponible en: **https://joik-studio.github.io/Canvas/**

---

## Despliegue en GitHub Pages

Este repositorio está preparado para publicar en GitHub Pages usando **Deploy from a branch**.

Para activarlo:

1. Ve a **Settings → Pages** en el repositorio.
2. En **Source**, selecciona **Deploy from a branch**.
3. Elige la rama `main` y carpeta `/ (root)`.
4. Guarda la configuración. La raíz del repositorio redirige automáticamente a `Code/index.html`.

---

## Versiones y lanzamientos

| Versión | Fecha | Estado |
|---|---|---|
| **beta0.1** | 29 de abril de 2026 | ✅ Disponible — soporte activo |

### beta0.1 — Primera beta pública

Lanzado el **29 de abril de 2026**. Primera versión pública de Canvas. Incluye:

- Editor de pixel art 16 × 16 (ampliable hasta 32 × 32)
- Open Canvas colaborativo 500 × 500
- Galería compartida con likes, boosts, comentarios y remix
- Tienda de recursos con economía de monedas
- Perfil de usuario con vínculos a cuentas sociales (Google, Discord)
- Panel de administración para moderación
- Operación online con Supabase como backend principal

> **Soporte:** La beta0.1 recibe parches de seguridad y correcciones de errores. Reporta fallos abriendo un issue o siguiendo la [política de seguridad](./SECURITY.md).

---

## Soporte dentro del GitHub

1. Crea un fork del repositorio.
2. Trabaja en una rama descriptiva: `feature/nombre-del-cambio`.
3. Abre un Pull Request contra `main` con descripción clara de los cambios.
4. Para cambios en el esquema de BD, actualiza también `supabase_schema.sql`.

---

## Licencia

Distribuido bajo la licencia **MIT**. Consulta el archivo [LICENSE](./LICENSE) para más detalles.
