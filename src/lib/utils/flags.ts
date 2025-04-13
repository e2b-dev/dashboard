export const NO_INDEX = process.env.NO_INDEX === '1'
export const VERBOSE =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_VERBOSE === '1'
