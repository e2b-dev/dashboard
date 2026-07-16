import { sanitizeClientInput } from '@/core/shared/observability/sanitize-input'

export const sanitizedTRPCConsole = {
  error: (...args: unknown[]) => console.error(...sanitizeTRPCLoggerArgs(args)),
  log: (...args: unknown[]) => console.log(...sanitizeTRPCLoggerArgs(args)),
}

function sanitizeTRPCLoggerArgs(args: unknown[]) {
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
