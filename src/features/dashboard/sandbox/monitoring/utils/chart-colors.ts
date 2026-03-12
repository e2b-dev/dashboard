export function withOpacity(color: string, opacity: number): string {
  const normalizedOpacity = Math.max(0, Math.min(1, opacity))
  const hex = color.trim()

  if (!hex.startsWith('#')) {
    return color
  }

  const value = hex.slice(1)
  const expanded =
    value.length === 3
      ? value
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : value

  if (expanded.length !== 6 && expanded.length !== 8) {
    return color
  }

  const r = Number.parseInt(expanded.slice(0, 2), 16)
  const g = Number.parseInt(expanded.slice(2, 4), 16)
  const b = Number.parseInt(expanded.slice(4, 6), 16)

  if ([r, g, b].some((value) => Number.isNaN(value))) {
    return color
  }

  return `rgba(${r}, ${g}, ${b}, ${normalizedOpacity})`
}

export function normalizeOpacity(
  opacity: number | undefined,
  fallback: number
): number {
  if (opacity === undefined || !Number.isFinite(opacity)) {
    return fallback
  }

  return Math.max(0, Math.min(1, opacity))
}
