const notImplemented = () => {
  throw new Error('fs is not available in the browser')
}

export const lstatSync = notImplemented
export const readdirSync = notImplemented
export const readlinkSync = notImplemented
export const realpathSync = Object.assign(notImplemented, {
  native: notImplemented,
})
export const readdir = notImplemented
export const writeFileSync = notImplemented
export const readFileSync = notImplemented
export const existsSync = notImplemented
export const mkdirSync = notImplemented
export const statSync = notImplemented
export const unlinkSync = notImplemented
export const rmdirSync = notImplemented
export const createReadStream = notImplemented
export const createWriteStream = notImplemented
export const promises = {
  lstat: notImplemented,
  readdir: notImplemented,
  readlink: notImplemented,
  realpath: notImplemented,
  readFile: notImplemented,
  writeFile: notImplemented,
  stat: notImplemented,
  mkdir: notImplemented,
  unlink: notImplemented,
  rmdir: notImplemented,
}
export const writev = notImplemented

const fs = {
  lstatSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  readdir,
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  statSync,
  unlinkSync,
  rmdirSync,
  createReadStream,
  createWriteStream,
  promises,
  writev,
}

export default fs
