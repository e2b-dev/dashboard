# Testing Strategy

This project uses a comprehensive testing strategy with different types of tests for different purposes. This README explains the current state of testing and how to extend it.

## Current Test Types

### Integration Tests

Integration tests verify that different parts of the application work together correctly, but they use mocks for external dependencies like databases and APIs. These tests are fast, reliable, and don't require external services to be running.

**Location:** `src/__test__/integration/`

**Run with:** `bun test:integration`

The integration tests use a dummy environment set in `vitest.config.ts` which provides all necessary environment variables with test values. This is sufficient for running integration tests without any additional setup.

**Environment Validation:**
- Integration tests run the `scripts:check-app-env` script before execution to ensure all required application environment variables are set.
- This is configured in `package.json`: `"test:integration": "bun scripts:check-app-env && vitest run src/__test__/integration/"`

**Examples:**
- Authentication tests in `src/__test__/integration/auth.test.ts`
- Middleware tests in `src/__test__/integration/middleware.test.ts`

### End-to-End (E2E) Tests

**Current Status:** E2E tests are not yet implemented. There is a placeholder file at `src/__test__/e2e/placeholder.test.ts`.

**Location:** `src/__test__/e2e/`

**Run with:** `bun test:e2e`

**Environment Validation:**
- E2E tests run the `scripts:check-all-env` script before execution to ensure all required environment variables are set.
- This is configured in `package.json`: `"test:e2e": "bun scripts:check-all-env && vitest run src/__test__/e2e/"`

### Development Tests

Development tests are specialized tests designed to assist with feature development by creating realistic scenarios for manual testing and observation in the dashboard.

**Location:** `src/__test__/development/`

**Purpose:** These tests spawn real resources (like sandboxes) that can be observed in the dashboard while developing features, eliminating the need to manually manage test resources.

**Examples:**
- `metrics.test.ts`: Spawns stressed sandboxes in batches to test dashboard performance and metrics visualization

**Environment Setup:**
To run development tests, you must create a `.env.test` file with the required environment variables:
```bash
# .env.test
TEST_E2B_DOMAIN=your-test-domain
TEST_E2B_API_KEY=your-test-api-key
TEST_E2B_TEMPLATE=base  # optional, defaults to 'base'
```

**Note:** Development tests interact with real E2B services and will create actual resources. Use with caution and ensure proper cleanup.

## Running Tests

### Locally

To run all tests:
```bash
bun test:run
```

To run only integration tests:
```bash
bun test:integration
```

To run only E2E tests (currently just the placeholder):
```bash
bun test:e2e
```

### In CI/CD

Currently, only integration tests are configured to run in CI/CD:

(See [`.github/workflows/test.yml`](.github/workflows/test.yml))

## Environment Variables

### For Integration Tests

Integration tests use the environment variables defined in [`.github/workflows/test.yml`](.github/workflows/test.yml) or `.env` files.

These values are sufficient for running integration tests without any additional setup.

### For E2E Tests (Future Implementation)

When implementing E2E tests, you will need to:

1. Create `.env` files with real credentials for external services & additional variables for e2e tests
2. Update the `testEnvSchema` in `src/lib/env.ts` to validate the required additional environment variables
3. Update the GitHub Actions workflow to include E2E tests with the necessary secrets

## Implementing E2E Tests

To start implementing E2E tests:

1. **Create a proper environment setup:**
   - Create a `.env.test.example` file showing required variables
   - Add validation in `scripts/check-e2e-env.ts` to ensure all required variables are present

2. **Update GitHub Actions workflow:**
   - Add a new job for E2E tests in `.github/workflows/test.yml`
   - Configure it to run after integration tests pass
   - Add necessary secrets to GitHub repository settings

3. **Implement actual E2E tests:**
   - Replace the placeholder in `src/__test__/e2e/placeholder.test.ts` with real tests
   - Focus on critical user flows like authentication, team management, etc.
   - Add logic to skip tests if required environment variables are missing

4. **Update this README:**
   - Document the new E2E tests and how to run them
   - Update the environment variables section with the actual requirements

## Best Practices

1. **Write integration tests for most functionality**: They're faster and more reliable.
2. **Use E2E tests for critical paths**: Focus on key user journeys like authentication, payment, etc.
3. **Keep E2E tests minimal**: They're slower and more brittle, so use them sparingly.
4. **Use test data**: Create and clean up test data in your E2E tests to avoid polluting your development/production environment.
5. **Skip E2E tests if environment variables are missing**: This allows the tests to be run in environments without the necessary credentials. 

