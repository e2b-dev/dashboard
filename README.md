![Dashboard Preview](/readme-assets/dashboard-preview.png)

# Dashboard

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Discord](https://img.shields.io/discord/1092455714431180995?color=7289DA&label=Discord&logo=discord&logoColor=white)](https://discord.com/channels/1092455714431180995)
[![GitHub Stars](https://img.shields.io/github/stars/e2b-dev/dashboard?style=social)](https://github.com/e2b-dev/dashboard)

## Quick Links
- 📚 [Documentation](https://e2b.dev/docs)
- 💬 [Discord Community](https://discord.gg/e2b)
- 🐛 [Issue Tracker](https://github.com/e2b-dev/dashboard/issues)
- 🤝 [Contributing Guide](CONTRIBUTING.md)

## Overview
Our Dashboard is a modern, feature-rich web application built to manage and monitor E2B services. Built with Next.js 16 and React 19, it provides a seamless user experience for managing sandboxes, API keys, and usage analytics.

## Features
- **Modern Stack**: Built with Next.js 16, React 19, and TypeScript
- **Real-time Analytics**: Monitor your sandbox usage and performance
- **Authentication**: Secure authentication powered by Auth.js and Ory
- **Type Safety**: Full TypeScript support throughout the codebase

## Getting Started

> **Self-hosting Note**: If you're planning to self-host this dashboard, you'll likely want to self-host our infrastructure first. Please refer to our [infrastructure repository](https://github.com/e2b-dev/infra) for guidance on setting up the E2B platform on your own infrastructure.

### Prerequisites
- Node.js 20.9+
- Git
- Vercel account
- Ory project or self-hosted Ory deployment

### Local Development Setup

1. Clone the repository
```bash
git clone https://github.com/e2b-dev/dashboard.git
cd dashboard
```

2. Install dependencies
```bash
# Using Bun (recommended)
bun install

# Using npm
npm install --legacy-peer-deps
```

3. Environment Variables
```bash
# Copy the example env file
cp .env.example .env.local
```

4. Set up required services:

#### a. Auth.js / Ory Setup
1. Configure an Ory OAuth2 client for the dashboard callback URL: `/api/auth/oauth/callback/ory`.
2. Populate `.env.local` with the Ory and Auth.js variables from `.env.example`.
3. Enable the upstream identity providers you want in Ory (GitHub, Google, email/password, etc.).
4. Ensure the Ory access-token audience matches the backend JWT audience setting.

#### b. Start the development server
```bash
# Using Bun (recommended)
bun run dev

# Using npm
npm run dev
```

The application will be available at `http://localhost:3000`

## Development

### Available Scripts
```bash
# Using Bun (recommended)
bun run dev         # Start development server
bun run build      # Create production build
bun run start      # Start production server
bun run preview    # Build and preview production
bun run lint       # Run Biome linter
bun run lint:fix   # Auto-fix Biome lint issues
bun run format     # Format + organize imports with Biome
bun run check      # Run full Biome check (lint + format + imports)

# All commands work with npm as well:
npm run dev
# etc...
```

### Project Structure
```
src/
├── app/          # Next.js App Router pages and layouts
├── configs/      # Global constants, feature flags, and URL maps
├── core/         # Server-side logic: actions, adapters, modules, and shared clients
├── features/     # Domain-specific components (auth, dashboard, billing, etc.)
├── lib/          # Utility functions, hooks, and shared helpers
├── styles/       # Global styles and Tailwind config
├── trpc/         # tRPC client and server setup
├── types/        # TypeScript type definitions
└── ui/           # Reusable UI primitives and Shadcn components
tests/
├── unit/         # Vitest unit tests
├── integration/  # Vitest integration tests
├── development/  # Vitest development helper tests
└── preview/      # Playwright preview/user-flow tests
```

### Testing
We use a layered testing strategy with Vitest and Playwright. For details on test types, commands, and conventions, see the [Testing README](tests/README.md).

### Environment Variables
See [`src/lib/env.ts`](./src/lib/env.ts) for all required environment variables and their validation schemas.

## Production Deployment

This application is optimized for deployment on Vercel:

1. Push your changes to GitHub
2. Import your repository in Vercel
3. Deploy!

> **Note**: The application uses Partial Prerendering (PPR) which is currently only supported on Vercel's infrastructure. This can be turned off inside [`next.config.ts`](./next.config.ts).

## Contributing
We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## Support
If you need help or have questions:

1. Check our [Documentation](https://e2b.dev/docs)
2. Join our [Discord Community](https://discord.gg/e2b)
3. Open an [Issue](https://github.com/e2b-dev/dashboard/issues)

## License
This project is licensed under the Apache License, Version 2.0 - see the [LICENSE](LICENSE) file for details.

Copyright 2025 FoundryLabs, Inc.
