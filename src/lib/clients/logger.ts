import ansis from 'ansis'

export const logger = console

const stringifyArg = (arg: unknown) =>
  typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)

export const logError = (...args: Parameters<typeof console.error>) => {
  console.error(
    ansis.bgRedBright.white(' ERROR '),
    ansis.redBright(args.map(stringifyArg).join(' '))
  )
}

export const logDebug = (...args: Parameters<typeof console.debug>) => {
  console.debug(
    ansis.bgBlueBright.white(' DEBUG '),
    ansis.blueBright(args.map(stringifyArg).join(' '))
  )
}

export const logInfo = (...args: Parameters<typeof console.info>) => {
  console.info(
    ansis.bgGray.black(' INFO '),
    ansis.gray(args.map(stringifyArg).join(' '))
  )
}

export const logSuccess = (...args: Parameters<typeof console.log>) => {
  console.log(
    ansis.bgGreenBright.white(' SUCCESS '),
    ansis.greenBright(args.map(stringifyArg).join(' '))
  )
}

export const logWarning = (...args: Parameters<typeof console.warn>) => {
  console.warn(
    ansis.bgYellowBright.white(' WARNING '),
    ansis.yellowBright(args.map(stringifyArg).join(' '))
  )
}
