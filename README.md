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
| `NEXT_PUBLIC_E2B_DOMAIN` | build | Derives `https://api.<domain>` and `https://dashboard-api.<domain>` |
| `NEXT_PUBLIC_INFRA_API_URL` / `NEXT_PUBLIC_DASHBOARD_API_URL` | build | Explicit overrides of the derived URLs |
| `E2B_INFRA_API_URL` / `E2B_DASHBOARD_API_URL` | server start | Explicit URLs for a prebuilt image; take precedence |
| `NEXT_PUBLIC_E2B_SANDBOX_URL` | build | Base URL the browser uses for sandbox traffic |
| `E2B_SANDBOX_URL` | per request | Same, for a prebuilt image; takes precedence, and is what the browser is told to use |
| `DASHBOARD_COOKIE_SECURE` | server start | `false` only for a plain-http install; the api key cookie then travels unencrypted. Defaults to secure in production builds |

Each URL resolves in that order: the runtime variable, then the
`NEXT_PUBLIC_` override, then the value derived from the domain. Next inlines
`NEXT_PUBLIC_*` into the bundles at build time, so a prebuilt image is
configured with the runtime variables. Every explicit URL must carry an
`http://` or `https://` scheme, and the server rejects anything else naming
the variable. The infra and dashboard URLs are resolved at module scope, so a
malformed one fails on server start. The sandbox URL is resolved per request,
so a malformed one fails on first use, such as opening a terminal.

The browser reads the sandbox URL from `GET /api/config`, which resolves it
per request. When `E2B_INFRA_API_URL` is set and no sandbox URL is given, it
defaults to the host the dashboard was reached on, port 3002. That default
routes only when the dashboard is reached over `localhost` or an IP address,
which is how the sandbox proxy accepts header-routed traffic. Reach the
dashboard on a domain name and you must set `E2B_SANDBOX_URL` yourself, to a
`localhost`, IP, or `sandbox.<domain>` base URL. `curl
http://<host>:<port>/api/config` shows what a deployment resolved.

The dashboard's own server-side sandbox calls, such as killing a terminal's
pty when you leave the page, resolve the URL from the same request by the same
rule, so a self-hosted install needs no `E2B_SANDBOX_URL` unless the request
host is the wrong one for sandbox traffic.

`/api/config` is unauthenticated and carries no secret. Behind a reverse
proxy, that proxy must set `X-Forwarded-Host` and `X-Forwarded-Proto` itself
rather than pass through whatever a client sent; `GET /api/config` trusts
them to describe the browser-facing origin.

`E2B_SANDBOX_URL` is also read by the E2B SDK for its own connection config.
That is the same setting, so the dashboard deliberately shares the name. It
is served to the browser as-is, so the value has to be reachable from the
browser, not only from the server. A runtime-configured install should leave
it unset unless the port-3002 default is wrong.

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
# set NEXT_PUBLIC_E2B_DOMAIN (or explicit NEXT_PUBLIC_INFRA_API_URL /
# NEXT_PUBLIC_DASHBOARD_API_URL) to point at your infrastructure
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
docker build --build-arg NEXT_PUBLIC_E2B_DOMAIN=your-domain.com -t e2b-dashboard .
docker run --rm -p 3001:3001 e2b-dashboard
```

- `PORT` (default `3001`) and `HOSTNAME` (default `0.0.0.0`) are read by the
  server at start. The default keeps the dashboard clear of port 3000, which
  an E2B API already uses when both share a host network.
- `NEXT_PUBLIC_E2B_DOMAIN` is a **build** argument, not a runtime variable:
  Next inlines `NEXT_PUBLIC_*` values into the bundles. It defaults to a
  domain that resolves nowhere, so an unconfigured container fails loudly
  instead of talking to a deployment that is not yours.
- An image built this way resolves both APIs from `NEXT_PUBLIC_E2B_DOMAIN` at
  build time. A container configured through the runtime variables in
  [Configuration](#configuration) resolves them at runtime instead, so it
  needs no build-time value beyond the default.
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
