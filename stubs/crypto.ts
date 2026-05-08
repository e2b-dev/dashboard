const notImplemented = () => {
  throw new Error('crypto is not available in the browser')
}

export const createHash = notImplemented
export const randomUUID = notImplemented

const crypto = {
  createHash,
  randomUUID,
}

export default crypto
