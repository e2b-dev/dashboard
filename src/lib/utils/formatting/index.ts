export * from './time'

function formatNumber(
  value: number,
  locale = 'en-US',
  maxFractionDigits = 0
): string {
  return value.toLocaleString(locale, {
    maximumFractionDigits: maxFractionDigits,
  })
}

function formatDecimal(value: number, decimals = 1, locale = 'en-US'): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function formatMemory(memoryMB: number, locale = 'en-US'): string {
  if (memoryMB < 1024) {
    return `${formatNumber(memoryMB, locale)} MB`
  }
  return `${formatDecimal(memoryMB / 1024, 1, locale)} GB`
}

function formatCPUCores(cores: number, locale = 'en-US'): string {
  return `${formatNumber(cores, locale)} core${cores !== 1 ? 's' : ''}`
}

const pluralize = (
  count: number,
  singular: string,
  plural?: string
): string => {
  if (count === 1) return singular
  if (plural) return plural
  if (/[sxz]$/i.test(singular) || /(ch|sh)$/i.test(singular)) {
    return `${singular}es`
  }
  if (/[^aeiou]y$/i.test(singular)) {
    return `${singular.slice(0, -1)}ies`
  }
  return `${singular}s`
}

function formatAxisNumber(value: number, locale = 'en-US'): string {
  if (Math.abs(value) >= 1000) {
    const formatter = new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 0,
    })
    return formatter.format(value)
  }

  if (value < 1 && value > 0) {
    return value.toFixed(2)
  }

  return formatNumber(value, locale)
}

function formatCurrency(amount: number, currency = 'USD', locale = 'en-US') {
  return Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export {
  formatAxisNumber,
  formatCPUCores,
  formatCurrency,
  formatDecimal,
  formatMemory,
  formatNumber,
  pluralize,
}
