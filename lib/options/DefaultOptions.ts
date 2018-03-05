import { option, Options } from 'clime'
import * as log from 'loglevel'

export class DefaultOptions extends Options {
  @option({
    description: 'Log-Level to use (debug, verbose, info, warn, error)',
    default: 'error',
    validator: /debug|verbose|info|warn|error/
  })
  public loglevel: string

  public getLogger (): log.Logger {
    let prefix = require('loglevel-plugin-prefix')
    prefix.apply(
      log,
      {
        template: '[%t] %l (%n)'
      }
    )
    log.setDefaultLevel(this.loglevel as log.LogLevelDesc)
    let logger = log.getLogger('socko')
    return logger
  }
}
