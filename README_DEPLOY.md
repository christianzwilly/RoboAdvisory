# Public deployment quick-start (Vercel)

This repo is configured for easy deployment of the frontend to **Vercel** while calling the **additiv** sandbox API. If the sandbox has CORS restrictions, use the included serverless proxy.

## 1) Environment variables
Create the following in Vercel (Project Settings → Environment Variables):

- `VITE_API_BASE` **or** `NEXT_PUBLIC_API_BASE` **or** `REACT_APP_API_BASE` → your additiv sandbox base, e.g. `https://sandbox.additiv.example.com/api`
- Optional (if using the proxy):
  - `TARGET_API_BASE` → same as above; the proxy forwards to this URL.

> Use the env that matches your build tool: Vite uses `VITE_*`, Next.js uses `NEXT_PUBLIC_*`, CRA uses `REACT_APP_*`.

## 2) Using the built-in API proxy (recommended if CORS blocks)
The function at `api/proxy.ts` forwards any request under `/api/proxy/*` to your target API.

Example browser call:
```ts
fetch('/api/proxy/portfolios')
```
This will forward to `"${TARGET_API_BASE}/portfolios"`.

## 3) Frontend configuration
Point your app to either:
- **Direct**: `VITE_API_BASE = https://sandbox.additiv.example.com/api` (ensure CORS allows your Vercel domain)
- **Proxy**: call `/api/proxy/...` from the browser and set `TARGET_API_BASE` in Vercel.

## 4) Deploy
1. Import this repo at https://vercel.com/new
2. Set env vars as above (Preview + Production).
3. Deploy. Vercel should auto-detect your framework. If needed, set:
   - Build command (Vite/CRA): `npm run build`
   - Output dir: `dist` (Vite) or `build` (CRA)

## 5) Local dev
Create a `.env.local` with the same variable and run your dev server.

## 6) Notes
- If your app uses absolute `/api/...` paths already, you can rename `api/proxy.ts` to match, or update your client to call `/api/proxy/...`.
- Secrets (API keys) must not be exposed in client-side env vars; inject them only in serverless functions.
