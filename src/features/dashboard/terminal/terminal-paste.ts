const CONTROL_SEQUENCE_INTRODUCER = '['.charCodeAt(0)
const OPERATING_SYSTEM_COMMAND = ']'.charCodeAt(0)
const STRING_TERMINATOR = '\\'.charCodeAt(0)
const BELL = 0x07
const ESCAPE = 0x1b
const DELETE = 0x7f

const isAllowedPasteControl = (code: number) =>
  code === 0x09 || code === 0x0a || code === 0x0d

const isFinalControlSequenceByte = (code: number) =>
  code >= 0x40 && code <= 0x7e

const isStringControlSequence = (code: number) =>
  code === OPERATING_SYSTEM_COMMAND ||
  code === 'P'.charCodeAt(0) ||
  code === '_'.charCodeAt(0) ||
  code === 'X'.charCodeAt(0) ||
  code === '^'.charCodeAt(0)

function skipUntilControlSequenceFinal(value: string, index: number) {
  let nextIndex = index
  while (nextIndex < value.length) {
    if (isFinalControlSequenceByte(value.charCodeAt(nextIndex))) {
      return nextIndex + 1
    }
    nextIndex += 1
  }

  return nextIndex
}

function skipUntilStringTerminator(value: string, index: number) {
  let nextIndex = index
  while (nextIndex < value.length) {
    const code = value.charCodeAt(nextIndex)
    if (code === BELL) {
      return nextIndex + 1
    }
    if (
      code === ESCAPE &&
      value.charCodeAt(nextIndex + 1) === STRING_TERMINATOR
    ) {
      return nextIndex + 2
    }
    nextIndex += 1
  }

  return nextIndex
}

export function sanitizeTerminalPaste(value: string) {
  let sanitized = ''
  let index = 0

  while (index < value.length) {
    const code = value.charCodeAt(index)

    if (code === ESCAPE) {
      const nextCode = value.charCodeAt(index + 1)
      if (nextCode === CONTROL_SEQUENCE_INTRODUCER) {
        index = skipUntilControlSequenceFinal(value, index + 2)
        continue
      }
      if (isStringControlSequence(nextCode)) {
        index = skipUntilStringTerminator(value, index + 2)
        continue
      }

      index += nextCode ? 2 : 1
      continue
    }

    if (code === 0x9b) {
      index = skipUntilControlSequenceFinal(value, index + 1)
      continue
    }

    if (code === 0x9d || code === 0x90 || code === 0x9e || code === 0x9f) {
      index = skipUntilStringTerminator(value, index + 1)
      continue
    }

    if ((code < 0x20 && !isAllowedPasteControl(code)) || code === DELETE) {
      index += 1
      continue
    }

    if (code >= 0x80 && code <= 0x9f) {
      index += 1
      continue
    }

    sanitized += value[index]
    index += 1
  }

  return sanitized
}
