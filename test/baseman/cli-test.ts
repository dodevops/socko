import * as glob from 'glob'
import * as fse from 'fs-extra'

import { CLITest, CLITestCase, Util } from 'baseman'
import * as path from 'path'
import Bluebird = require('bluebird')

interface SubcaseDefinition {
  name: string
  args: string[]
}

export class SockoCLITestCase extends CLITestCase {
  get description (): string {
    let argsStr = this.args.slice(1).map(arg => JSON.stringify(arg)).join(' ')
    return `args ${argsStr}`
  }

  public extractOutput (stdout: Buffer, stderr: Buffer): [string, string] {
    let out = stdout.toString()
    let err = stderr.toString()

    let blurPathOptions: Util.BlurPathOptions = {
      extensions: ['.js'],
      existingOnly: true
    }

    out = Util.blurPath(out, blurPathOptions)

    err = Util.blurErrorStack(err)
    err = Util.blurPath(err, blurPathOptions)

    return [out, err]
  }

  public extractFileSystemOutput (): Bluebird<void> {
    return Bluebird.fromCallback(
      fse.copy.bind(
        this,
        path.join(this.cwd, 'assets', 'output'),
        path.join(this.outputPath, '_sockoOutput')
      )
    )
      .thenReturn()
  }
}

export class SockoCLITest extends CLITest {
  public generate (): Bluebird<SockoCLITestCase[]> {
    return Bluebird.fromCallback(
      glob.bind(
        this,
        '*/case-*/',
        {
          cwd: __dirname
        }
      )
    )
      .then(
        caseNames => {
          return Bluebird.resolve(caseNames.map(caseName => {
            if (!/-\d+\/$/.test(caseName)) {
              throw new Error(`Expecting numeric suffix for case name "${caseName}"`)
            }

            let caseDir = path.join(__dirname, caseName)
            let subcases = require(path.join(caseDir, 'subcases')).default as SubcaseDefinition[]
            let debuggerArgs = []

            for (let arg of process.execArgv) {
              let match = arg.match(/^--(debug|inspect)(?:-brk)?=(.*)/)
              if (match) {
                debuggerArgs.push(`--${match[1]}`)
              }
              if (arg === '--expose_debug_as=v8debug') {
                debuggerArgs.push(arg)
              }
            }

            return subcases.map(subcase => {
              return new SockoCLITestCase(
                `${caseName}${subcase.name}`,
                debuggerArgs.concat([path.join(__dirname, '..', '..', 'index.js')].concat(subcase.args)),
                {
                  cwd: caseDir,
                  allowNonEmptyCWD: true
                }
              )
            })
          })
            .reduce((result, cases) => result.concat(cases), []))
        }
      )
  }
}

export default new SockoCLITest(process.execPath)
