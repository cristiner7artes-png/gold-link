# Gold Link — Base44 Dev Environment

## What this app is
Next.js 15 (App Router) + React 18 affiliate showcase for Mercado Livre products.
Portuguese (pt-BR) UI. Two routes: `/` (public storefront) and `/admin` (admin panel).

## Architecture notes
- **Products** are served from the static `products.json` at the repo root — no database.
  The API route `GET /api/products` reads and sorts this file. Editing the JSON updates the site on next dev reload.
- **Banner** uses `@netlify/blobs` (`getStore`). In local dev without Netlify credentials, `getStore`
  throws; the code catches it and returns a default banner, so the homepage renders fine.
  Banner **save** (`PUT /api/banner`) will fail locally — that's expected, not a bug.
- **Admin auth** uses `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_TOKEN` env vars, all with
  hardcoded defaults (`usergold` / `251831` / `gl_dev_token`). No secrets required to boot.
- `next.config.js` lists `mongodb` in `serverExternalPackages` but MongoDB is not used anywhere in the code.

## Running locally (docker compose)
```
docker compose -f docker-compose.base44.yml up -d --build
```
- Node 22 image, source bind-mounted at `/app`, `node_modules` and `.next` in named volumes.
- Dev server: `yarn dev` (Next dev, 0.0.0.0:3000, webpack polling watch already configured).
- First start runs `yarn install` — give it ~2 min.

## Verifying it works
- `curl -s localhost:3000/` returns the storefront HTML.
- `curl -s localhost:3000/api/products` returns the JSON product array.
- Admin at `/admin` — log in with `usergold` / `251831`.

## No external secrets needed
The app boots fully without any external credentials. The Mercado Livre scrape endpoint
(`/api/admin/scrape`) fetches public ML pages at runtime — no API key required.
