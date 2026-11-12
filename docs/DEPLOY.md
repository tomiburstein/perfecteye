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

Desde ese momento, cada vez que se suba un cambio a la rama principal de GitHub, Cloudflare vuelve a publicar la web automáticamente.

## Paso 3 (opcional) — Dominio propio

Cuando compres un dominio (por ejemplo `perfecteye.app`), en Cloudflare Pages ve a tu proyecto → **Custom domains** → **Set up a custom domain** y sigue las instrucciones.
Después agrega la variable de entorno `VITE_SITE_URL` = `https://tu-dominio` y vuelve a publicar. Así los mensajes para compartir siempre muestran tu dominio.

## Antes de lanzar

- **Número del desafío:** `LAUNCH_DAY` en `src/games/classic/config.ts` define qué día es el desafío #1 (hoy está en `2026-11-12`). Si quieres que el día del lanzamiento sea el #1, pídele a Claude que lo cambie a esa fecha **antes** de publicar.
- La imagen para redes (`public/og-image.png`) se ve mejor con una URL absoluta. Cuando tengas el dominio definitivo, se puede actualizar en `index.html`.

## Alternativa sin GitHub (más simple, pero manual)

En Cloudflare: **Workers & Pages → Create → Pages → Upload assets**, y arrastra la carpeta `dist/` (se genera con `npm run build`). Funciona, pero cada actualización hay que subirla a mano.
