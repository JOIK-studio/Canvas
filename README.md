# Canvas

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
- **Autenticación:** Email/contraseña + OAuth (Google, GitHub, etc.) vía Supabase; modo prototipo funcional social como fallback sin backend remoto

---

## Modo funcional

Canvas actualmente cuenta con servidores en linea para el usuario (vinculadas con Supabase)

---

## Despliegue en GitHub Pages

Este repositorio está preparado para publicar en GitHub Pages **sin GitHub Actions** (modo **Deploy from a branch**).

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

### beta0.1 — Primer prototipo funcional social

Lanzado el **29 de abril de 2026**. Primera versión pública del prototipo funcional social de Canvas. Incluye:

- Editor de pixel art 16 × 16 (ampliable hasta 32 × 32)
- Open Canvas colaborativo 500 × 500
- Galería compartida con likes, boosts, comentarios y remix
- Tienda de recursos con economía de monedas
- Perfil de usuario con vínculos a cuentas sociales (Google, Discord)
- Panel de administración para moderación
- Modo prototipo funcional social como fallback (sin backend remoto)

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
