import { BEL, ESC } from './constants'

const ANSI_ESCAPE_PATTERN = new RegExp(
  `${ESC}(?:[@-Z\\\\-_]|\\[[0-?]*[ -/]*[@-~]|\\][^${BEL}]*(?:${BEL}|${ESC}\\\\)|P[^${ESC}]*(?:${ESC}\\\\)|\\^[^${ESC}]*(?:${ESC}\\\\)|_[^${ESC}]*(?:${ESC}\\\\))`,
  'g'
)
const ANSI_8BIT_CSI_PATTERN = new RegExp(
  `${String.fromCharCode(155)}[0-?]*[ -/]*[@-~]`,
  'g'
)

function extractPendingAnsiSequence(text: string) {
  const lastEscIndex = text.lastIndexOf(ESC)

  if (lastEscIndex === -1) {
    return { pending: '', text }
  }

  const tail = text.slice(lastEscIndex)

  if (tail === ESC) {
    return { pending: tail, text: text.slice(0, lastEscIndex) }
  }

  if (
    tail.startsWith(`${ESC}]`) &&
    !tail.includes(BEL) &&
    !tail.includes(`${ESC}\\`)
  ) {
    return { pending: tail, text: text.slice(0, lastEscIndex) }
  }

  if (
    tail.startsWith(`${ESC}[`) &&
    !new RegExp(`^${ESC}\\[[0-?]*[ -/]*[@-~]$`).test(tail)
  ) {
    return { pending: tail, text: text.slice(0, lastEscIndex) }
  }

  return { pending: '', text }
}

export function sanitizeTerminalOutput(
  data: Uint8Array,
  decoder: TextDecoder,
  pendingAnsiRef: { current: string }
) {
  const decoded =
    pendingAnsiRef.current + decoder.decode(data, { stream: true })
  const result = extractPendingAnsiSequence(decoded)
  pendingAnsiRef.current = result.pending

  return result.text
    .replace(ANSI_ESCAPE_PATTERN, '')
    .replace(ANSI_8BIT_CSI_PATTERN, '')
}

export function appendTerminalOutput(current: string, chunk: string) {
  let next = current

  for (let index = 0; index < chunk.length; index += 1) {
    const char = chunk[index]
    if (char === undefined) continue

    const code = char.charCodeAt(0)

    if (char === '\r') {
      if (chunk[index + 1] === '\n') {
        next += '\n'
        index += 1
      }
      continue
    }

    if (char === '\n' || char === '\t' || code >= 32) {
      if (code !== 127) {
        next += char
      }
      continue
    }

    if (code === 8) {
      next = next.slice(0, -1)
    }
  }

  return stripTerminalTitleFragments(next)
}

function stripTerminalTitleFragments(output: string) {
  const promptPattern = /user@[A-Za-z0-9_.-]+:/g

  return output
    .split('\n')
    .map((line) => {
      if (!line.startsWith('0;')) {
        const promptMatch = /user@[A-Za-z0-9_.-]+:/.exec(line)
        if (promptMatch?.index && promptMatch.index > 0) {
          return line.slice(promptMatch.index)
        }

        return line
      }

      const promptMatches = [...line.matchAll(promptPattern)]
      if (promptMatches.length < 2) {
        return line
      }

      const promptMatch = promptMatches.at(-1)

      if (!promptMatch || promptMatch.index === undefined) {
        return line
      }

      return line.slice(promptMatch.index)
    })
    .join('\n')
}

export function shouldPrefixInputDraft(output: string) {
  return !/[#$] $/.test(output)
}

function normalizeVisibleTerminalOutput(output: string) {
  const lines = output.split('\n')
  const lastLineIndex = lines.findLastIndex((line) => line.length > 0)
  const lastLine = lines[lastLineIndex]

  if (
    lastLineIndex >= 0 &&
    lastLine &&
    /^user@[A-Za-z0-9_.-]+:/.test(lastLine) &&
    !/[#$]/.test(lastLine)
  ) {
    lines[lastLineIndex] = `${lastLine}$ `
  }

  return lines.join('\n')
}

export function buildVisibleTerminalOutput(output: string, inputDraft: string) {
  const normalizedOutput = normalizeVisibleTerminalOutput(output)
  if (!inputDraft) return normalizedOutput

  const lines = normalizedOutput.split('\n')
  const lastLineIndex = lines.findLastIndex((line) => line.length > 0)

  if (lastLineIndex >= 0) {
    lines[lastLineIndex] = `${lines[lastLineIndex]}${inputDraft}`
    return lines.join('\n')
  }

  return inputDraft
}
