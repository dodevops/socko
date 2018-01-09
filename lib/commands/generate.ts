import { Castable, Command, command, metadata, option } from 'clime'
import { DefaultOptions } from '../options/DefaultOptions'
import * as path from 'path'
import * as fs from 'fs'
import { ConverterOptions, FileToTreeConverter, TreeToFileConverter } from 'socko-converter-file'
import { FileNode, ScanOptions } from 'file-hierarchy'
import { SockoProcessor } from 'socko-api'
import { ProcessorOptionsFactory } from 'socko-api/lib/options/ProcessorOptionsFactory'
import Bluebird = require('bluebird')

export class GenerateOptions extends DefaultOptions {
  @option({
    description: 'Path to the input directory'
  })
  public input: Castable.Directory

  @option({
    description: 'Path to the output directory'
  })
  public output: Castable.Directory

  @option({
    description: 'Node to generate'
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
    let output = options.input.fullName
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
          inputScanOptions.filter = (filterPath, entry) => {
            return Bluebird.resolve(!filterPath.startsWith(hierarchy))
          }

          let hierarchyScanOptions = new ScanOptions(hierarchy)
          hierarchyScanOptions.filter = (filterPath, entry) => {
            return Bluebird.resolve(!filterPath.startsWith(input))
          }

          return Bluebird.props({
            input: new FileNode().scan(inputScanOptions),
            hierarchy: new FileNode().scan(new ScanOptions(hierarchy))
          })
        }
      )
      .then(
        trees => {
          options.getLogger().debug('Converting file trees to socko trees')

          let converterOptions = new ConverterOptions()

          let converter = new FileToTreeConverter(converterOptions)
          return Bluebird.props({
            input: converter.convert(trees.input),
            hierarchy: converter.convert(trees.hierarchy)
          })
        }
      )
      .then(
        trees => {
          options.getLogger().debug('Running socko')

          let processorOptions = new ProcessorOptionsFactory().create()
          // todo: implement rename and ignore
          return new SockoProcessor().process(trees.input, trees.hierarchy, processorOptions)
        }
      )
      .then(
        outputNode => {
          options.getLogger().debug('Converting output tree to directory')

          let converterOptions = new ConverterOptions()
          converterOptions.checkBeforeOverwrite = options.skipIdenticalSockets
          converterOptions.outputPath = output

          return new TreeToFileConverter(converterOptions).convert(outputNode)
        }
      )
  }
}
