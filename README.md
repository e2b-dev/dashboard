![Dashboard Preview](/readme-assets/dashboard-preview.png)

# E2B Dashboard

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Discord](https://img.shields.io/discord/1092455714431180995?color=7289DA&label=Discord&logo=discord&logoColor=white)](https://discord.com/channels/1092455714431180995)
[![GitHub Stars](https://img.shields.io/github/stars/e2b-dev/dashboard?style=social)](https://github.com/e2b-dev/dashboard)

Open-source dashboard for self-hosted [E2B infrastructure](https://github.com/e2b-dev/infra). Manage and monitor sandboxes and templates with a team API key — no user accounts, no external auth provider.

## Quick Links
- 📚 [Documentation](https://e2b.dev/docs)
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
