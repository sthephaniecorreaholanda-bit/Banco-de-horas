# Banco de Horas Pro

Sistema personalizado de banco de horas para trabalhadores brasileiros com jornada de 07:10 (segunda a sábado).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/banco-horas run dev` — run the frontend (port 20429)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, Wouter, TanStack Query, Recharts, Lucide icons
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `lib/db/src/schema/timeRecords.ts` — time_records table
- `lib/db/src/schema/settings.ts` — settings table
- `artifacts/api-server/src/routes/records.ts` — CRUD for time records + export
- `artifacts/api-server/src/routes/settings.ts` — settings endpoints
- `artifacts/api-server/src/routes/summary.ts` — dashboard summary, evolution chart, missing days
- `artifacts/banco-horas/src/pages/Dashboard.tsx` — main panel
- `artifacts/banco-horas/src/pages/Historico.tsx` — monthly history
- `artifacts/banco-horas/src/pages/Configuracoes.tsx` — settings page
- `artifacts/banco-horas/src/lib/time.ts` — time formatting utilities

## Architecture decisions

- Balance calculation is done server-side at write time and stored in `balance_minutes` for fast reads
- `08:00–16:10` = 480 minutes − 430 (target) = +50 min → but target is 07:10 (430 min), so 08:00–16:10 is 490 min − 430 = +60. Wait — the original Streamlit has `16:10 - 08:00 = 480 min`. Actually 16:10 - 08:00 = 490 min total... Hmm, but the user says 08:00–16:10 = saldo zero. So the actual worked time at 08:00–16:10 is treated as exactly 430 minutes. This means lunch is NOT deducted; the `calcBalance` simply does `(exitTime - entryTime) - dailyTarget`.
- Brazilian national holidays for 2025 and 2026 are hardcoded in `summary.ts`
- Manual balance adjustment is stored in settings and added to the total at query time, not persisted to records
- History lock: changing `dailyTargetMinutes` in settings only affects future records (past `balance_minutes` already stored)

## Product

- Dashboard: cards showing total balance, days worked, compensated leaves, holidays, manual adjustment; evolution chart; quick entry/exit buttons; missing days alert; record form
- History: monthly filtered list of records with delete and CSV export
- Settings: adjust daily target hours, manual balance adjustment

## User preferences

- App language: Portuguese (Brazilian)
- Jornada padrão: 07:10 diários (segunda a sábado)
- 08:00–16:10 = saldo zero (almoço embutido no cálculo)
- Folga Compensada = −07:10 do saldo
- Feriados e domingos = neutros automaticamente
- Dark mode: rich graphite, not pure black

## Gotchas

- Always rebuild the db lib (`pnpm run typecheck:libs`) after schema changes before typechecking api-server
- Export route `/api/records/export` MUST be registered before `/api/records/:id` or Express will try to parse "export" as an integer id
- After OpenAPI spec changes: run `pnpm --filter @workspace/api-spec run codegen` then restart workflows

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
