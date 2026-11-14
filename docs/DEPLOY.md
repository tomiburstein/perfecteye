# Cómo publicar PerfectEye en internet (gratis)

PerfectEye se publica en **Cloudflare Pages**. El plan gratuito alcanza de sobra: no tiene límite de visitas para sitios estáticos y no requiere tarjeta de crédito.

## Paso 1 — Subir el código a GitHub

1. Crea una cuenta gratuita en https://github.com si no tienes una.
2. Crea un repositorio nuevo (botón **New**). Nombre sugerido: `perfecteye`. Puede ser **Private**. No marques ninguna opción de "Initialize".
3. Avísale a Claude el nombre del repositorio (por ejemplo `tu-usuario/perfecteye`). Claude le pedirá acceso a la plataforma y subirá el código. **No hace falta que pegues ninguna contraseña ni token en el chat.**

## Paso 2 — Conectar Cloudflare Pages

1. Crea una cuenta gratuita en https://dash.cloudflare.com/sign-up.
2. En el panel, entra a **Workers & Pages** → **Create** → pestaña **Pages** → **Connect to Git**.
3. Autoriza a Cloudflare a leer tu GitHub y elige el repositorio `perfecteye`.
4. Configura la compilación así:
   - **Framework preset:** `Vite` (o `None`)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Environment variables** → agregar `NODE_VERSION` = `22`
5. Pulsa **Save and Deploy**. En 1 o 2 minutos tendrás una dirección pública como `https://perfecteye.pages.dev`.

## Paso 2b — Activar la base de datos del ranking (gratis)

El ranking mundial y los porcentajes ("mejor que el X% de los jugadores") usan **Cloudflare D1**, una base de datos gratuita (hasta 5 GB, 5 millones de lecturas y 100.000 escrituras por día).

1. En el panel de Cloudflare, ve a **Storage & Databases → D1 SQL Database → Create**. Nombre: `perfecteye`. Pulsa **Create**.
2. Ve a **Workers & Pages →** tu proyecto **perfecteye → Settings → Bindings → Add → D1 database**.
   - **Variable name:** `DB` (exactamente así, en mayúsculas)
   - **D1 database:** `perfecteye`
   - Guarda.
3. Ve a **Deployments** y, en el último despliegue, elige **Retry deployment** para que tome la base de datos.

No hace falta crear tablas: el servidor las crea solo la primera vez. Si no se hace este paso, el juego funciona igual, pero la sección "Hoy en el mundo" dirá que el ranking no está disponible.

Desde ese momento, cada vez que se suba un cambio a la rama principal de GitHub, Cloudflare vuelve a publicar la web automáticamente.

## Paso 3 (opcional) — Dominio propio

Cuando compres un dominio (por ejemplo `perfecteye.app`), en Cloudflare Pages ve a tu proyecto → **Custom domains** → **Set up a custom domain** y sigue las instrucciones.
Después agrega la variable de entorno `VITE_SITE_URL` = `https://tu-dominio` y vuelve a publicar. Así los mensajes para compartir siempre muestran tu dominio.

## Antes de lanzar

- **Número del desafío:** `LAUNCH_DAY` en `src/games/classic/config.ts` define qué día es el desafío #1 (hoy está en `2026-11-12`). Si quieres que el día del lanzamiento sea el #1, pídele a Claude que lo cambie a esa fecha **antes** de publicar.
- La imagen para redes (`public/og-image.png`) se ve mejor con una URL absoluta. Cuando tengas el dominio definitivo, se puede actualizar en `index.html`.

## Alternativa sin GitHub (más simple, pero manual)

En Cloudflare: **Workers & Pages → Create → Pages → Upload assets**, y arrastra la carpeta `dist/` (se genera con `npm run build`). Funciona, pero cada actualización hay que subirla a mano.
