interface TimestampedLog {
  timestampUnix: number
}

export function countLeadingAtTimestamp<T extends TimestampedLog>(
  logs: T[],
  timestamp: number
) {
  let count = 0

  while (count < logs.length && logs[count]!.timestampUnix === timestamp) {
    count += 1
  }

  return count
}

export function countTrailingAtTimestamp<T extends TimestampedLog>(
  logs: T[],
  timestamp: number
) {
  let count = 0
  let index = logs.length - 1

  while (index >= 0 && logs[index]!.timestampUnix === timestamp) {
    count += 1
    index -= 1
  }

  return count
}

export function dropLeadingAtTimestamp<T extends TimestampedLog>(
  logs: T[],
  timestamp: number,
  dropCount: number
) {
  if (dropCount <= 0) {
    return logs
  }

  let index = 0
  let remainingToDrop = dropCount

  while (
    index < logs.length &&
    remainingToDrop > 0 &&
    logs[index]!.timestampUnix === timestamp
  ) {
    index += 1
    remainingToDrop -= 1
  }

  return logs.slice(index)
}

export function dropTrailingAtTimestamp<T extends TimestampedLog>(
  logs: T[],
  timestamp: number,
  dropCount: number
) {
  if (dropCount <= 0) {
    return logs
  }

  let end = logs.length
  let remainingToDrop = dropCount

  while (
    end > 0 &&
    remainingToDrop > 0 &&
    logs[end - 1]!.timestampUnix === timestamp
  ) {
    end -= 1
    remainingToDrop -= 1
  }

  return logs.slice(0, end)
}
