# Chess Club Registration — Production Build

## What this ZIP includes
- `server.js` — Express server (enroll, admin auth, manual payment update).
- `public/` — Your v9 frontend as provided, plus **payments.js** which handles DB save + Meshulam redirect.
- `sql/init.sql` — (optional) schema reference if needed later.
- `package.json` — Node app.

## Environment vars (Render → Environment)
- `DATABASE_URL` = **Supabase Session Pooler URI** (port 6543) + `?sslmode=require`
  Example: `postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:6543/postgres?sslmode=require`
- `JWT_SECRET` = any 16–32 random chars

## Deploy
1. `npm install` (only locally) — Render will auto-install from package.json.
2. In Render, set **Start command** to `node server.js` (or keep default).
3. Ensure **Build command** is empty (not required).
4. Deploy.

## Manual admin flow (until Meshulam API webhook is added)
```js
// 1) create user (once)
fetch('/api/admin/create-user',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@rishon-chess.org',password:'StrongPass!2025'})})

// 2) login
const { token } = await (await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@rishon-chess.org',password:'StrongPass!2025'})})).json()

// 3) list enrollments
const list = await (await fetch('/api/admin/enrollments',{headers:{Authorization:`Bearer ${token}`}})).json()

// 4) mark paid
await fetch('/api/admin/mark-paid',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({id:list[0].id,ref:'Manual approval'})})
```
