<!-- <p align="center">
  <img width="100" src="/readme-assets/logo-circle.png" alt="e2b logo">
</p> -->
![Dashboard Preview Dark](/readme-assets/dashboard-preview-dark.png#gh-dark-mode-only)
![Dashboard Preview Light](/readme-assets/dashboard-preview-light.png#gh-light-mode-only)

# E2B Dashboard

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Discord](https://img.shields.io/discord/1092455714431180995?color=7289DA&label=Discord&logo=discord&logoColor=white)](https://discord.com/channels/1092455714431180995)
[![GitHub Stars](https://img.shields.io/github/stars/e2b-dev/dashboard?style=social)](https://github.com/e2b-dev/dashboard)

> **Status**: Beta - Ready for early adopters. APIs might change.

## Quick Links
- 📚 [Documentation](https://e2b.dev/docs)
- 💬 [Discord Community](https://discord.gg/e2b)
- 🐛 [Issue Tracker](https://github.com/e2b-dev/dashboard/issues)
- 🤝 [Contributing Guide](CONTRIBUTING.md)

## Overview
Our Dashboard is a modern, feature-rich web application built to manage and monitor E2B services. Built with Next.js 15 and React 19, it provides a seamless user experience for managing sandboxes, API keys, and usage analytics.

## Features
- **Modern Stack**: Built with Next.js 15, React 19, and TypeScript
- **Real-time Analytics**: Monitor your sandbox usage and performance
- **Authentication**: Secure authentication powered by Supabase
- **Documentation**: Integrated MDX documentation support
- **Type Safety**: Full TypeScript support throughout the codebase

## Getting Started

### Prerequisites
- Node.js 18+
- Git
- Vercel account
- Supabase account
- PostHog account (optional for analytics)

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
npm install
```

3. Set up required services:

#### a. Vercel & KV Storage
```bash
# Install Vercel CLI
npm i -g vercel

# Link project to Vercel
vercel link

# Set up Vercel KV
vercel storage add
# Select "KV" and follow the prompts
```

#### b. Supabase Setup
1. Create a new Supabase project
2. Go to Project Settings > API
3. Copy the `anon key` and `service_role key`
4. Copy the project URL

#### c. Environment Variables
```bash
# Copy the example env file
cp .env.example .env.local

# Pull environment variables from Vercel (recommended)
vercel env pull .env.local

# Or manually configure the environment variables outlined in the .env.example file
```

#### d. Cookie Encryption
The dashboard uses encrypted cookies for secure data storage. You'll need to set up a `COOKIE_ENCRYPTION_KEY`:

```bash
# Generate a secure encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Add the generated key to your .env.local file
COOKIE_ENCRYPTION_KEY=your_generated_base64_key
```

This key must be:
- 32 bytes (256 bits) encoded in base64
- Unique per environment (development/staging/production)
- Kept secret and never committed to version control

4. Start the development server
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
bun run lint       # Run ESLint
bun run lint:fix   # Auto-fix ESLint issues
bun run storybook  # Launch Storybook
bun run db:types   # Generate DB types
bun run db:migration # Create migration

# All commands work with npm as well:
npm run dev
# etc...
```

### Project Structure
```
src/
├── app/          # Next.js app router pages
├── features/     # Feature-specific components
├── ui/           # Reusable UI components
├── lib/          # Utility functions and shared logic
├── styles/       # Global styles and Tailwind config
└── types/        # TypeScript type definitions
└── server/       # Server only logic & actions
```

### Environment Variables
See [`src/lib/env.ts`](./src/lib/env.ts) for all required environment variables and their validation schemas.

## Production Deployment

This application is optimized for deployment on Vercel:

1. Push your changes to GitHub
2. Import your repository in Vercel
3. Deploy!

> **Note**: The application uses Partial Prerendering (PPR) which is currently only supported on Vercel's infrastructure. This can be turned off inside [`next.config.mjs`](./next.config.mjs).

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
