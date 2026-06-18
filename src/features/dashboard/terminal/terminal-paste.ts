import stripAnsi from 'strip-ansi'

const DELETE = 0x7f

const isAllowedPasteControl = (code: number) =>
  code === 0x09 || code === 0x0a || code === 0x0d

export function sanitizeTerminalPaste(value: string) {
  let sanitized = ''

  for (const char of stripAnsi(value)) {
    const code = char.charCodeAt(0)

    if ((code < 0x20 && !isAllowedPasteControl(code)) || code === DELETE) {
      continue
    }

    if (code >= 0x80 && code <= 0x9f) {
      continue
    }

    sanitized += char
  }

  return sanitized
}
