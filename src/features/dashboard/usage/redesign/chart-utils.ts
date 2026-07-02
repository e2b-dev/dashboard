/** ~`max` evenly spaced axis labels, adapting to whatever the sampling produced. */
export function pickEvenTicks(labels: string[], max = 5): string[] {
  if (labels.length <= max) return labels
  const step = (labels.length - 1) / (max - 1)
  return Array.from({ length: max }, (_, i) => Math.round(i * step))
    .map((index) => labels[index])
    .filter((label): label is string => label !== undefined)
}
