# Cómo publicar PerfectEye en internet (gratis)

PerfectEye se publica en **Cloudflare Workers**: la web, el ranking mundial y su base de datos. El plan gratuito alcanza de sobra y no requiere tarjeta.

| Qué | Límite gratuito |
|---|---|
| Archivos de la web (páginas, imágenes, código del juego) | Ilimitados, no cuentan para los límites |
| Peticiones al ranking (`/api/...`) | 100.000 por día |
| Base de datos D1 del ranking | 5 GB, 5 millones de lecturas y 100.000 escrituras por día |

Si un día se superara el límite, el juego seguiría funcionando; solo el ranking dejaría de responder hasta el día siguiente.

## Paso 1 — Cuenta de Cloudflare

Crea una cuenta gratuita en https://dash.cloudflare.com/sign-up.

## Paso 2 — Conectar el repositorio de GitHub

1. Menú izquierdo: **Compute → Workers & Pages → Create application**.
2. Elige **Continue with GitHub** (o "Import a repository"). Autoriza a Cloudflare y dale acceso al repositorio **tomiburstein/perfecteye** ("Only select repositories").
3. Selecciona **perfecteye**.

## Paso 3 — Configuración ("Set up your application")

| Campo | Qué poner |
|---|---|
| Project name | `perfecteye` (tiene que coincidir con `name` en `wrangler.jsonc`) |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` (viene puesto) |
| Non-production branch deploy command | dejar el que viene |
| Path (en Advanced settings) | `/` |
| API token | dejar "Create new token" (Cloudflare lo crea solo) |
| Build variables (Advanced settings) | nombre `NODE_VERSION`, valor `22` |

Pulsa **Deploy**. En 2 o 3 minutos la web queda en `https://perfecteye.<tu-subdominio>.workers.dev`.

**La base de datos del ranking se crea sola** en la primera publicación (se llama `perfecteye-ranking`) y se reutiliza en las siguientes. La tabla también se crea sola.

Desde ese momento, cada cambio que se suba a la rama `main` de GitHub se publica automáticamente.

### Si la publicación falla al crear la base de datos

Algunos tokens automáticos no tienen permiso para crear bases de datos. En ese caso:
1. **Storage & Databases → D1 SQL Database → Create**, con el nombre `perfecteye-ranking`.
2. Copia su **Database ID**, que no es secreto, y pásaselo a Claude para que lo agregue en `wrangler.jsonc`.
3. Vuelve a publicar (**Deployments → Retry**, o sube cualquier cambio).

## Paso 4 (opcional) — Dominio propio

En el proyecto: **Settings → Domains & Routes → Add → Custom domain**. El dominio tiene que estar en Cloudflare (se puede comprar ahí mismo a precio de costo). Después, opcionalmente, agrega la variable de compilación `VITE_SITE_URL` = `https://tu-dominio` para que los mensajes para compartir usen esa dirección.

## Antes de lanzar

- **Número del desafío:** `LAUNCH_DAY` en `src/games/classic/config.ts` define qué día es el desafío #1.
- Para probar localmente con el ranking: `npm run build` y luego `npx wrangler dev` (http://localhost:8787).
