# Política de seguridad

## Versiones soportadas

| Versión | Soporte de seguridad |
|---|---|
| `beta0.1` (29 de abril de 2026) | ✅ Activo |

---

## Reportar una vulnerabilidad

Si descubres un fallo de seguridad en Canvas, **no abras un issue público**. Sigue estos pasos:

1. Envía un correo a **jaimegamingpro@gmail.com** con el asunto `[SECURITY] Canvas — descripción breve`.
2. Incluye:
   - Descripción del problema y su impacto potencial.
   - Pasos para reproducirlo (o prueba de concepto mínima).
   - Versión o commit donde se detectó.
3. Recibirás confirmación en un plazo de **72 horas** y una resolución estimada en **14 días** para vulnerabilidades críticas.

No publicaremos la vulnerabilidad hasta que haya un parche disponible o se llegue a un acuerdo de divulgación responsable.

---

## Modelo de seguridad

### Autenticación

- **Modo Supabase (online):** autenticación gestionada íntegramente por Supabase Auth. Las contraseñas nunca llegan al frontend; el backend las hashea con bcrypt. Se admite OAuth (Google, Discord, etc.) para inicio de sesión sin contraseña.

### Autorización (Base de datos)

Todas las tablas de Supabase tienen **Row Level Security (RLS)** habilitado. Las políticas garantizan:

| Operación | Restricción |
|---|---|
| Leer perfiles y creaciones públicas | Cualquier visitante |
| Crear / editar / eliminar creaciones | Solo el autor (`auth.uid() = author_id`) |
| Editar perfil | Solo el propio usuario (`auth.uid() = id`) |
| Ver órdenes de tienda | Solo el propietario de la orden |
| Crear boosts y comentarios | Solo usuarios autenticados |

### Credenciales de Supabase

- La **clave anónima** (`anon key`) es de solo lectura y está diseñada para ser pública; las RLS protegen los datos. Aun así, **no la expongas innecesariamente**.
- La **clave de servicio** (`service_role key`) no debe usarse ni almacenarse en el frontend bajo ninguna circunstancia.
- En producción, inyecta las credenciales mediante variables de entorno del servidor o meta tags generados en el servidor — nunca las incluyas en código fuente commiteado.

### Almacenamiento local

- El estado de la aplicación (`canvas_app_state_v4`) se persiste en `localStorage`. No almacenes datos sensibles adicionales en él.
- El optimizador de almacenamiento (`storage-optimizer.js`) limpia entradas antiguas para evitar desbordamientos.

### Carga de recursos externos

- La librería de Supabase se carga dinámicamente desde `cdn.jsdelivr.net`. Considera añadir un hash de integridad de subrecurso (SRI) si tu despliegue lo permite, para detectar manipulaciones de la CDN.

### Cabeceras HTTP recomendadas

Para un despliegue en producción, configura las siguientes cabeceras en tu servidor:

```
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; connect-src 'self' https://*.supabase.co; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

---

## Limitaciones conocidas

| Limitación | Contexto | Mitigación |
|---|---|---|
| Sin rate-limiting en el frontend | El control de cargas es del lado cliente | Implementar rate-limiting en funciones de Supabase Edge o RLS restrictiva |
| Política `"users create open events"` abierta (`check (true)`) | Cualquier usuario autenticado puede insertar eventos | Revisar si debe restringirse a autores de creaciones activas |

---

## Actualizaciones de seguridad

Las correcciones de seguridad se publican como commits en `main` con el prefijo `fix(security):` en el mensaje de commit. Se recomienda seguir la rama `main` para recibir parches de forma inmediata.

---

## Alcance

Esta política aplica al código del repositorio `JOIK-studios/canvas`. No cubre vulnerabilidades en dependencias de terceros (Supabase, CDN) — repórtalas directamente a sus respectivos equipos de seguridad.
