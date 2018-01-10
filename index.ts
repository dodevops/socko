/**
 * @module socko
 */
/**
 * Command line interface for SOCKO
 */

// import needed modules

import * as path from 'path'
import { CLI, Shim } from 'clime'
import { getLogger } from 'loglevel'

let cli = new CLI('socko', path.join(__dirname, 'lib', 'commands'))

getLogger('socko-converter-file:converter:FileToTreeConverter').setLevel('debug')

let shim = new Shim(cli)
shim.execute(process.argv)
  .catch(reason => {
    getLogger('socko').error(reason.message)
  })
