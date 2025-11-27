const notImplemented = () => {
  throw new Error('fs/promises is not available in the browser')
}

export const lstat = notImplemented
export const readdir = notImplemented
export const readlink = notImplemented
export const realpath = notImplemented
export const readFile = notImplemented
export const writeFile = notImplemented
export const stat = notImplemented
export const mkdir = notImplemented
export const unlink = notImplemented
export const rmdir = notImplemented
export const access = notImplemented
export const copyFile = notImplemented
export const rename = notImplemented

const fsPromises = {
  lstat,
  readdir,
  readlink,
  realpath,
  readFile,
  writeFile,
  stat,
  mkdir,
  unlink,
  rmdir,
  access,
  copyFile,
  rename,
}

export default fsPromises
