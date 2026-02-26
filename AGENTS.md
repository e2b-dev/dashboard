# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is the E2B web app — a Next.js 16 application (App Router, Turbopack, React 19, TypeScript) for managing E2B cloud sandbox infrastructure. Single-package repo using Bun 1.2.0 as package manager.

### Environment setup

- `.env.local` must exist with required env vars. See `.env.example` for the full list.
- Set `NEXT_PUBLIC_MOCK_DATA=1` in `.env.local` to run without real Supabase/KV/Infra backends.
- Dummy values work for `SUPABASE_SERVICE_ROLE_KEY`, `KV_REST_API_TOKEN`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` when mock mode is enabled.
- `KV_REST_API_URL` must be a valid URL (e.g. `https://localhost:6379`), and `INFRA_API_URL` defaults to `https://api.e2b.dev`.
- Validate env with: `bun scripts:check-app-env`

### Running the app

- Dev server: `bun run dev` (starts on port 3000 with Turbopack + pino-pretty)
- The `dev` script runs env validation before starting.

### Lint

- `next lint` was removed in Next.js 16. Run ESLint directly: `npx eslint .`
- The codebase has 3 pre-existing warnings (react-hooks/exhaustive-deps), 0 errors.

### Tests

- Unit tests: `bun test:unit` (4 test files, 80 tests)
- Integration tests: `bun test:integration` (5 test files, 74 tests — uses mocked external deps, no real services needed)
- All tests: `bun test:run` (requires e2e env vars too; prefer `bun test:unit` and `bun test:integration` separately)
- Test runner: Vitest. Config in `vitest.config.ts`, setup in `src/__test__/setup.ts`.
- See `src/__test__/README.md` for detailed testing docs.

### Key gotchas

- No lockfile is committed; `bun install` generates `bun.lock` locally.
- The app proxies external landing page and docs content via Next.js rewrites — these pages will 404/error locally without internet access to `e2b.mintlify.app` and `www.e2b-landing-page.com`.
- `bun run lint` fails because Next.js 16 removed the `lint` subcommand. Use `npx eslint .` instead.
