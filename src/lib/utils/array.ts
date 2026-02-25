export function areStringArraysEqual(
  first: readonly string[],
  second: readonly string[]
): boolean {
  if (first.length !== second.length) {
    return false
  }

  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) {
      return false
    }
  }

  return true
}
