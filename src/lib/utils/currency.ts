const usdIntegerFormatter = new Intl.NumberFormat('en-US')

// Removes non-digits from a USD draft value. Example: "$1,250" -> "1250".
const sanitizeCurrencyInput = (value: string) => value.replace(/\D+/g, '')

// Formats a USD integer for display. Example: 1250 -> "1,250".
const formatCurrencyValue = (value: number) => usdIntegerFormatter.format(value)

export { formatCurrencyValue, sanitizeCurrencyInput }
