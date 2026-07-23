# Testing Strategy

## Directory Layout

- `tests/unit/`: Vitest unit tests
- `tests/integration/`: Vitest integration tests
- `tests/development/`: Vitest helper tests used during feature development

## Run Commands

### Vitest

- all vitest tests: `bun test:run`
- unit only: `bun test:unit`
- integration only: `bun test:integration`
- development helpers:
  - `bun test:dev:traffic`
  - `bun test:dev:build`
- watch mode: `bun test:watch`
- ui mode: `bun test:ui`

## CI Workflows

- code quality: [`.github/workflows/code-quality.yml`](.github/workflows/code-quality.yml)
- test pipeline: [`.github/workflows/test.yml`](.github/workflows/test.yml)
