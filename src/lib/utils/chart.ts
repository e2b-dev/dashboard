export function calculateAxisMax(data: number[], scaleFactor: number): number {
  if (data.length === 0) return 1

  let max = 0
  for (let i = 0; i < data.length; i++) {
    const y = data[i]!
    if (y > max) max = y
  }

  const snapToAxis = (value: number): number => {
    if (value < 10) return Math.ceil(value)
    if (value < 100) return Math.ceil(value / 10) * 10
    if (value < 1000) return Math.ceil(value / 50) * 50
    if (value < 10000) return Math.ceil(value / 100) * 100
    return Math.ceil(value / 1000) * 1000
  }

  const calculatedMax = snapToAxis(max * scaleFactor)

  return Math.max(calculatedMax, 1)
}
