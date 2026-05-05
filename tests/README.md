# Testing Strategy

## Directory Layout

- `tests/unit/`: Vitest unit tests
- `tests/integration/`: Vitest integration tests
- `tests/development/`: Vitest helper tests used during feature development
- `tests/preview/`: Playwright tests for preview/user-flow checks

## Run Commands

### Vitest

- all vitest tests: `bun test:run`
- unit only: `bun test:unit`
- integration only: `bun test:integration`
- development helpers:
  - `bun test:dev:traffic`
  - `bun test:dev:build`
  - `bun test:dev:events`
- watch mode: `bun test:watch`
- ui mode: `bun test:ui`

### Playwright Preview Tests

- install browsers: `bun run e2e:install-browsers`
- dev mode: `bun run e2e:test:dev`
- preview/pr mode: `bun run e2e:test:pr`
- headed mode: `bun run e2e:headed`

## CI Workflows

- code quality: [`.github/workflows/code-quality.yml`](.github/workflows/code-quality.yml)
- test pipeline: [`.github/workflows/test.yml`](.github/workflows/test.yml)

## Notes

- The old Vitest `test:e2e` placeholder suite was removed.
- Preview/user-flow coverage now lives under Playwright in `tests/preview/`.

