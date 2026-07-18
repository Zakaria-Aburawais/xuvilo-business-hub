---
name: api-server typecheck baseline & drizzle-zod pitfall
description: Typecheck baseline is green; Express 5 type quirks, drizzle-zod pitfall, admin-token recipe.
---

- Baseline is now GREEN (July 2026): `pnpm run typecheck` passes with zero errors from the root. Treat any new typecheck failure as a real regression from your own work.
- Express 5 types (`@types/express-serve-static-core` v5): `req.params` values are `string | string[]` — always coerce with `String(req.params.id ?? "")` before drizzle `eq()`. Module augmentation of `"express-serve-static-core"` fails under pnpm strict node_modules (TS2664, it's not a direct dep); use `declare global { namespace Express { interface Request {...} } }` instead.
- In route files that call `fetch`, don't import express's `Response` under that name — it shadows the fetch `Response` and causes confusing type errors. Import as `ExpressResponse` and use `globalThis.Response` for fetch.
- `drizzle-zod` ^0.8 emits zod v4-shaped types, but the workspace catalog pins zod 3.x — `z.infer<typeof createInsertSchema(...)>` fails TS2344. Prefer `typeof table.$inferInsert` / hand-written zod schemas in route files instead of drizzle-zod in `lib/db`.
- To mint an admin token for API testing: the auth token is `b64url(JSON{email,exp}) + "." + HMAC-SHA256` keyed by `AUTH_SIGNING_SECRET` or `derived::$DATABASE_URL`. Users live in table `app_users` (not `users`); `id` is a required varchar (no default). Run helper scripts from `lib/db/` so `pg` resolves (pnpm strict node_modules).
