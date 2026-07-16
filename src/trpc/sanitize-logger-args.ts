import { sanitizeClientInput } from '@/core/shared/observability/sanitize-input'

export function sanitizeTRPCLoggerArgs(args: unknown[]) {
  return args.map((argument) => {
    if (
      !argument ||
      typeof argument !== 'object' ||
      Array.isArray(argument) ||
      !('input' in argument)
    ) {
      return argument
    }

    return {
      ...argument,
      input: sanitizeClientInput(argument.input),
    }
  })
}
