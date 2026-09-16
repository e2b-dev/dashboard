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
| `PUBLIC_E2B_DOMAIN` | runtime | Required E2B cluster domain; used by the SDK and to derive `https://api.<domain>` and `https://dashboard-api.<domain>` |
| `PUBLIC_SANDBOX_URL` | per request | Optional sandbox traffic base URL, reachable from both the browser and server |
| `E2B_INFRA_API_URL` / `E2B_DASHBOARD_API_URL` | server start | Optional server-side API URLs; override domain-derived URLs |
| `DASHBOARD_COOKIE_SECURE` | server start | `false` only for a plain-http install; the API key cookie then travels unencrypted. Defaults to secure in production builds |

Set `PUBLIC_E2B_DOMAIN` when starting the container. Next does not give
`PUBLIC_` any special behavior: the server explicitly reads these values at
runtime. Restart the container and reload open pages after changing its
configuration. Missing or blank domains stop startup.

Legacy variables no longer act as fallbacks. Rename them before upgrading;
validation reports the replacement for each deprecated variable that is still
set, even if the new name is also present.

| Deprecated variable | Replacement |
|---|---|
| `NEXT_PUBLIC_E2B_DOMAIN` | `PUBLIC_E2B_DOMAIN` |
| `NEXT_PUBLIC_INFRA_API_URL` | `E2B_INFRA_API_URL` |
| `NEXT_PUBLIC_DASHBOARD_API_URL` | `E2B_DASHBOARD_API_URL` |
| `NEXT_PUBLIC_E2B_SANDBOX_URL` / `E2B_SANDBOX_URL` | `PUBLIC_SANDBOX_URL` |

API URL overrides remain optional; without them the domain determines both
API URLs. An absent or blank `PUBLIC_SANDBOX_URL` lets the SDK use domain
routing.

Every API or sandbox URL must include `http://` or `https://`. The schema in
`src/lib/env.ts` validates configuration for development, builds, and
server startup, even when telemetry is disabled. Invalid values stop startup
and name the variable. The cookie flag accepts `true` or `false` (case-insensitive, with
surrounding whitespace ignored); an empty value keeps the default.

The dashboard's Server Component layout resolves **only the domain and
sandbox URL** and passes them as props to a client `ClientConfigProvider`.
The terminal and filesystem inspector read this provider on their first
render, without a separate config request. API endpoints and team credentials
stay on the server. Both public settings are visible to browser users and
must contain no secrets.

For a local sandbox proxy, explicitly set `PUBLIC_SANDBOX_URL`, for example
`http://127.0.0.1:3002` when the browser and server run on the same machine.
Use an address reachable from both the browser and server. When a sandbox
URL is unset, the SDK uses domain-based routing, including when
`E2B_INFRA_API_URL` is set.

Server-side sandbox calls, such as terminal PTY cleanup, use the same domain
and sandbox URL resolution. `Host`, `X-Forwarded-Host`, and
`X-Forwarded-Proto` never determine sandbox destinations.

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
- The image builds without installation settings. Its temporary build domain
  is not carried into the runtime image, so a container started without
  `PUBLIC_E2B_DOMAIN` fails validation.
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
