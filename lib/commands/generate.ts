import { Castable, Command, command, metadata, option } from 'clime'
import { DefaultOptions } from '../options/DefaultOptions'
import * as path from 'path'
import * as fs from 'fs'
import { ConverterOptionsFactory, FileToTreeConverter, TreeToFileConverter } from 'socko-converter-file'
import { FileNode, ScanOptions } from 'file-hierarchy'
import { SkippedNodeBuilder, SockoNodeInterface, SockoProcessor } from 'socko-api'
import { ProcessorOptionsFactory } from 'socko-api/lib/options/ProcessorOptionsFactory'
import Bluebird = require('bluebird')
import del = require('del')

export class GenerateOptions extends DefaultOptions {
  @option({
    description: 'Path to the input directory',
    required: true
  })
  public input: Castable.Directory

  @option({
    description: 'Path to the output directory',
    required: true
  })
  public output: Castable.Directory

  @option({
    description: 'Node to generate',
    required: true
  })
  public node: string

  @option({
    description: 'Path to hierarchy directory. Defaults to input/_socko.',
    default: null
  })
  public hierarchy: Castable.Directory

  @option({
    description: 'Ignore this cartridge name (cartridgeA,cartridgeB,...)'
  })
  public ignore: Castable.CommaSeparatedStrings

  @option({
    description: 'Rename these relative filepaths while generating the output. (source-path:destination-path,...)'
  })
  public rename: Castable.CommaSeparatedStrings

  @option({
    description: 'If a socket with an identical content exists, do not recreate it',
    toggle: true
  })
  public skipIdenticalSockets: boolean

  @option({
    description: 'Clean output directory',
    toggle: true,
    default: false
  })
  public cleanOutput: boolean

  @option({
    description: 'Ignore missing cartridges',
    toggle: true,
    default: false
  })
  public ignoreMissing: boolean

}

@command({
  description: 'Generate an output directory from an input and hiearchy directory'
})
export default class extends Command {

  @metadata
  public execute (
    options: GenerateOptions
  ): Promise<any> | any {
    let input = options.input.fullName
    let output = options.output.fullName
    let hierarchy: string

    if (!options.hierarchy) {
      hierarchy = path.join(options.input.fullName, '_socko')
    } else {
      hierarchy = options.hierarchy.fullName
    }

    let nodePath = path.join(hierarchy, ...options.node.split(':'))

    let canAccess = Bluebird.promisify<void, fs.PathLike, number | undefined>(fs.access)

    options.getLogger().debug('Checking valid access to specified paths')

    return Bluebird.all(
      [
        canAccess(input, fs.constants.R_OK),
        canAccess(output, fs.constants.W_OK),
        canAccess(hierarchy, fs.constants.R_OK),
        canAccess(nodePath, fs.constants.R_OK)
      ]
    )
      .catch(
        (error: any) => {
          return error.code === 'ENOENT'
        },
        (error: any) => {
          if (error.path === output) {
            return Bluebird.fromCallback(fs.mkdir.bind(null, output))
          }
          return Bluebird.reject(
            new Error(`Can not find directory ${error.path}. Please check your command line arguments.`)
          )
        }
      )
      .catch(
        (error: any) => {
          return error.code === 'EACCES'
        },
        (error: any) => {
          return Bluebird.reject(
            new Error(`Can not access directory ${error.path}. Please check your command line arguments.`)
          )
        }
      )
      .then(
        () => {
          options.getLogger().debug('Converting input and hierarchy directories to tree.')
          options.getLogger().debug('Ignoring hierarchy path in input path and vice versa while doing so.')

          let inputScanOptions = new ScanOptions(input)
          if (hierarchy.startsWith(input)) {
            inputScanOptions.filter = (filterPath, entry) => {
              return Bluebird.resolve(!path.join(filterPath, entry).endsWith(hierarchy))
            }
          }

          let hierarchyScanOptions = new ScanOptions(hierarchy)

          if (input.startsWith(hierarchy)) {
            hierarchyScanOptions.filter = (filterPath, entry) => {
              return Bluebird.resolve(!path.join(filterPath, entry).endsWith(input))
            }
          }

          return Bluebird.props({
            input: new FileNode().scan(inputScanOptions),
            hierarchy: new FileNode().scan(hierarchyScanOptions)
          })
        }
      )
      .then(
        trees => {
          options.getLogger().debug('Converting file trees to socko trees')

          let inputConverterOptions = new ConverterOptionsFactory().create()
          let inputConverter = new FileToTreeConverter(inputConverterOptions)

          let hierarchyConverterOptions = new ConverterOptionsFactory().create()
          let hierarchyConverter = new FileToTreeConverter(hierarchyConverterOptions)

          return Bluebird.props({
            input: inputConverter.convert(trees.input),
            hierarchy: hierarchyConverter.convert(trees.hierarchy)
          })
        }
      )
      .then(
        trees => {
          options.getLogger().debug('Fetching hierarchy node')

          return Bluebird.props({
            input: trees.input,
            node: trees.hierarchy.getNodeByPath(`:_root:${options.node}`, ':')
          })
        }
      )
      .then(
        trees => {
          options.getLogger().debug('Running socko')

          let processorOptions = new ProcessorOptionsFactory().create()
          if (options.ignore && options.ignore.length > 0) {
            let ignoreObject = new Map<string, string>()

            for (let ignoreOption of options.ignore) {
              let ignoreSplit = ignoreOption.split(/=/)

              if (ignoreSplit.length === 1) {
                ignoreSplit.unshift('*')
              }

              ignoreObject.set(ignoreSplit[1], ignoreSplit[0])
            }

            processorOptions.processCartridgeNode = node => {
              if (ignoreObject.has(node.name)) {
                if (ignoreObject.get(node.name) === '*') {
                  return Bluebird.resolve(new SkippedNodeBuilder().build())
                } else {
                  return node.getPath(':')
                    .then(
                      value => {
                        if (`${ignoreObject.get(node.name)}:${node.name}` === value) {
                          return Bluebird.resolve(new SkippedNodeBuilder().build())
                        } else {
                          return Bluebird.resolve(node)
                        }
                      }
                    )
                }
              } else {
                return Bluebird.resolve(node)
              }
            }
          }
          if (options.rename && options.rename.length > 0) {
            let renameObject = new Map<string, string>()

            for (let renameOption of options.rename) {
              let splitRenameOption = renameOption.split(/:/)
              renameObject.set(splitRenameOption[0], splitRenameOption[1])
            }
            processorOptions.processResultTreeNode = node => {
              if (renameObject.has(node.name)) {
                node.name = renameObject.get(node.name)
              }
              return Bluebird.resolve(node)
            }
          }
          processorOptions.allowEmptyCartridgeSlots = options.ignoreMissing
          return new SockoProcessor().process(
            trees.input as SockoNodeInterface,
            trees.node as SockoNodeInterface,
            processorOptions
          )
        }
      )
      .then(
        outputNode => {

          if (options.cleanOutput) {
            return del(output)
              .then(
                () => {
                  return Bluebird.resolve(outputNode)
                }
              )
          } else {
            return Bluebird.resolve(outputNode)
          }
        }
      )
      .then(
        outputNode => {

          options.getLogger().debug('Converting output tree to directory')

          let converterOptions = new ConverterOptionsFactory().create()
          converterOptions.checkBeforeOverwrite = options.skipIdenticalSockets
          converterOptions.outputPath = output

          return new TreeToFileConverter(converterOptions).convert(outputNode)
        }
      )
  }
}
