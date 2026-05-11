const notImplemented = () => {
  throw new Error('path is not available in the browser')
}

export const basename = notImplemented
export const dirname = notImplemented
export const extname = notImplemented
export const join = notImplemented
export const normalize = notImplemented
export const resolve = notImplemented
export const relative = notImplemented
export const sep = '/'

const path = {
  basename,
  dirname,
  extname,
  join,
  normalize,
  resolve,
  relative,
  sep,
}

export default path
