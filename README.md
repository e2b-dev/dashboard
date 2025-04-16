<!-- <p align="center">
  <img width="100" src="/readme-assets/logo-circle.png" alt="e2b logo">
</p> -->
![Dashboard Preview Dark](/readme-assets/dashboard-preview-dark.png#gh-dark-mode-only)
![Dashboard Preview Light](/readme-assets/dashboard-preview-light.png#gh-light-mode-only)

# E2B Dashboard

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Discord](https://img.shields.io/discord/1092455714431180995?color=7289DA&label=Discord&logo=discord&logoColor=white)](https://discord.com/channels/1092455714431180995)
[![GitHub Stars](https://img.shields.io/github/stars/e2b-dev/dashboard?style=social)](https://github.com/e2b-dev/dashboard)

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

> **Self-hosting Note**: If you're planning to self-host this dashboard, you'll likely want to self-host our infrastructure first. Please refer to our [infrastructure repository](https://github.com/e2b-dev/infra) for guidance on setting up the E2B platform on your own infrastructure.

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
npm install --legacy-peer-deps
```

3. Environment Variables
```bash
# Copy the example env file
cp .env.example .env.local
```

4. Set up required services:

#### a. Key-Value Store Setup
This project requires a Redis-compatible key-value store. You'll need to:

1. Set up a Redis instance (self-hosted or using a cloud provider)
2. Configure the following environment variables in your `.env.local` file:
   ```
   KV_URL=your_redis_connection_string
   KV_REST_API_URL=your_redis_rest_api_url
   KV_REST_API_TOKEN=your_redis_api_write_token
   KV_REST_API_READ_ONLY_TOKEN=your_redis_api_read_token
   ```

> **Note**: For production deployments, we use Vercel KV Storage integration, which provides a managed Redis-compatible store and automatically configures these environment variables. You can add this integration through the Vercel dashboard when deploying your project.

#### b. Supabase Setup
1. Create a new Supabase project
2. Go to Project Settings > API
3. Copy the `anon key` & `service_role key` to populate `.env.local`
4. Copy the `database url` to populate `.env.local`
4. Configure authentication:
   - Go to Authentication > URL Configuration
   - Set Site URL to the hosting domain 
   - Add `http://localhost:3000/**` to Redirect URLs (for development)
5. Enable auth providers:
   - Go to Authentication > Providers
   - Enable the providers you want to use (GitHub, Google, E-Mail)
   - Configure each provider with the appropriate credentials

#### c. Database Setup
1. Apply the database migrations manually:
   - Navigate to the `/migrations` folder in the project
   - Execute each SQL migration file in sequential order against your Supabase database
   - You can run these migrations using the Supabase SQL Editor or a PostgreSQL client
   - Make sure to apply migrations in the correct order based on their timestamp prefixes

#### d. Supabase Storage Setup
1. Go to Storage > Buckets
2. Create a new **public** bucket named `profile-pictures`


#### e. Cookie Encryption
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
SUPABASE_PROJECT_ID=your-project-id bun run db:types   # Generate DB types
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
└── __test__/     # Test files and utilities
```

### Testing
We use a comprehensive testing strategy with integration tests and plans for E2E tests. For detailed information about our testing approach, environment setup, and best practices, see the [Testing README](src/__test__/README.md).

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