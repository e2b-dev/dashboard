![Dashboard Preview](/readme-assets/dashboard-preview.png)

# E2B Dashboard

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Discord](https://img.shields.io/discord/1092455714431180995?color=7289DA&label=Discord&logo=discord&logoColor=white)](https://discord.com/channels/1092455714431180995)
[![GitHub Stars](https://img.shields.io/github/stars/e2b-dev/dashboard?style=social)](https://github.com/e2b-dev/dashboard)

Open-source dashboard for self-hosted [E2B infrastructure](https://github.com/e2b-dev/infra). Manage and monitor sandboxes and templates with a team API key — no user accounts, no external auth provider.

## Quick Links
- 📚 [Documentation](https://docs.e2b.dev/?utm_source=github&utm_medium=referral&utm_campaign=readme&utm_content=dashboard)
- 💬 [Discord Community](https://discord.gg/e2b)
- 🐛 [Issue Tracker](https://github.com/e2b-dev/dashboard/issues)
- 🤝 [Contributing Guide](CONTRIBUTING.md)

## Overview

Built with Next.js 16, React 19, and TypeScript. The dashboard talks to two APIs from your [E2B infrastructure deployment](https://github.com/e2b-dev/infra):

- **infra-api** (`https://api.<your-domain>`) — sandboxes, templates, builds
- **dashboard-api** (`https://dashboard-api.<your-domain>`) — template & build metadata

### Authentication

Authentication is a single **team API key**:

- Visiting `/` shows a form to enter the key. It is validated against infra-api and stored in an httpOnly `e2b_api_key` cookie. All upstream calls happen server-side with the `X-API-Key` header — the key never reaches client JavaScript.
- Alternatively, set the `E2B_API_KEY` environment variable to pre-authenticate the whole deployment (single-user mode; the key form and sign-out are hidden).

### Configuration

| Variable | Read | Purpose |
|---|---|---|
| `PUBLIC_E2B_DOMAIN` | runtime | E2B cluster domain; used by the SDK and to derive `https://api.<domain>` and `https://dashboard-api.<domain>` |
| `PUBLIC_SANDBOX_URL` | per request | Optional sandbox traffic base URL, reachable from both the browser and server |
| `E2B_INFRA_API_URL` / `E2B_DASHBOARD_API_URL` | server start | Explicit server-side API URLs; override domain-derived URLs |
| `E2B_SANDBOX_URL` | per request | Legacy alias for `PUBLIC_SANDBOX_URL` |
| `NEXT_PUBLIC_E2B_DOMAIN` | build | Legacy fallback for `PUBLIC_E2B_DOMAIN` |
| `NEXT_PUBLIC_INFRA_API_URL` / `NEXT_PUBLIC_DASHBOARD_API_URL` | build | Legacy API overrides, below the corresponding `E2B_*` variables |
| `NEXT_PUBLIC_E2B_SANDBOX_URL` | build | Legacy sandbox URL, below both runtime names |
| `DASHBOARD_COOKIE_SECURE` | server start | `false` only for a plain-http install; the API key cookie then travels unencrypted. Defaults to secure in production builds |

Configure a prebuilt image with `PUBLIC_*` and `E2B_*` variables when starting
the container. Next does not give `PUBLIC_` any special behavior: the server
explicitly reads these values at runtime. `NEXT_PUBLIC_*` aliases remain
supported for existing builds, but their values are frozen by `next build`.
Restart the container and reload open pages after changing its configuration.

Resolution order (blank values are skipped):

- Domain: `PUBLIC_E2B_DOMAIN` → `NEXT_PUBLIC_E2B_DOMAIN`.
- Sandbox URL: `PUBLIC_SANDBOX_URL` → `E2B_SANDBOX_URL` → `NEXT_PUBLIC_E2B_SANDBOX_URL` → the fallback below.
- API URLs: corresponding `E2B_*` override → `NEXT_PUBLIC_*` override → URL derived from the resolved domain.

Every explicit URL must include `http://` or `https://`. The server rejects
invalid URLs, naming the variable. API URLs resolve when their server modules
load; sandbox URLs resolve when a dashboard request or SDK call needs them.

The dashboard's Server Component layout resolves **only the domain and
sandbox URL** and passes them as props to a client `ClientConfigProvider`.
The terminal and filesystem inspector read this provider on their first
render, without a separate config request. API endpoints and team credentials
stay on the server. Both public settings are visible to browser users and
must contain no secrets.

When `E2B_INFRA_API_URL` is set and no sandbox URL is given, the sandbox URL
defaults to the host the dashboard was reached on, port 3002. That default
routes only when the dashboard is reached over `localhost` or an IP address,
which is how the sandbox proxy accepts header-routed traffic. For a domain
name, set `PUBLIC_SANDBOX_URL` to a `localhost`, IP, or `sandbox.<domain>` base
URL that both the browser and server can reach. Without `E2B_INFRA_API_URL`,
leaving the sandbox URL unset preserves the SDK's domain-based routing.

Server-side sandbox calls, such as terminal PTY cleanup, use the same domain
and sandbox URL resolution. Behind a reverse proxy, set `X-Forwarded-Host`
and `X-Forwarded-Proto` at the proxy instead of forwarding client-supplied
values: the request-host fallback trusts these headers.

## Features

- **Sandboxes**: paginated live list, per-sandbox monitoring (CPU/memory/disk), logs, filesystem inspector, and an in-browser terminal
- **Templates**: list, visibility management, tags, build history with streaming build logs

## Getting Started

> You need a running [E2B infrastructure](https://github.com/e2b-dev/infra) deployment first.

### Prerequisites
- [Bun](https://bun.sh) 1.2+
- A team API key from your E2B deployment (`e2b_...`)

### Local Development Setup

1. Clone the repository
```bash
git clone https://github.com/e2b-dev/dashboard.git
cd dashboard
```

2. Install dependencies
```bash
bun install
```

3. Set up environment variables
```bash
cp .env.example .env
# set PUBLIC_E2B_DOMAIN (and optionally E2B_INFRA_API_URL /
# E2B_DASHBOARD_API_URL) to point at your infrastructure
```

4. Start the development server
```bash
bun run dev
```

5. Open [http://localhost:3000](http://localhost:3000) and enter your team API key.

### Production

```bash
bun run build
bun run start
```

### Run it in a container

The repository builds a self-contained image: Bun resolves the dependencies,
Node runs the Next build, and Node serves the standalone output; the runtime
stage carries no dev dependencies.

```bash
docker build -t e2b-dashboard .
docker run --rm -p 3001:3001 \
  -e PUBLIC_E2B_DOMAIN=your-domain.com \
  e2b-dashboard
```

- `PORT` (default `3001`) and `HOSTNAME` (default `0.0.0.0`) are read by the
  server at start. The default keeps the dashboard clear of port 3000, which
  an E2B API already uses when both share a host network.
- `PUBLIC_E2B_DOMAIN` configures the cluster at container start, so the same
  image can serve different installations. Use `PUBLIC_SANDBOX_URL` when the
  default SDK routing does not fit your deployment.
- The legacy `NEXT_PUBLIC_E2B_DOMAIN` build argument is still supported. Its
  default, `unset.invalid`, resolves nowhere so an unconfigured container
  cannot accidentally talk to another deployment. Runtime configuration takes
  precedence over that build-time fallback.
- The build needs outbound HTTPS for the three Google Fonts families in
  `src/app/fonts.ts`; an air-gapped build fails there.
- `GET /api/health` reports dashboard-api's health and answers 503 while
  dashboard-api is unreachable, so use `GET /` as the container liveness
  check.
- `scripts/container-smoke.sh` builds the image and asserts those responses.

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start the development server |
| `bun run build` | Production build |
| `bun run test:unit` | Unit tests |
| `bun run test:integration` | Integration tests |
| `bun run lint` / `bun run format` | Biome lint / format |
| `bun run generate:infra` | Regenerate infra-api contract types from `spec/` |
| `bun run generate:dashboard-api` | Regenerate dashboard-api contract types from `spec/` |

## License

Apache 2.0 — see [LICENSE](LICENSE).
