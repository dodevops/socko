import { option, Options } from 'clime'
import { getLogger, Logger, LogLevelDesc } from 'loglevel'

export class DefaultOptions extends Options {
  @option({
    description: 'Log-Level to use (debug, verbose, info, warn, error)',
    default: 'error',
    validator: /debug|verbose|info|warn|error/
  })
  public loglevel: string

  public getLogger (): Logger {
    let logger = getLogger('socko-cli')
    logger.setLevel(this.loglevel as LogLevelDesc)
    return logger
  }
}
