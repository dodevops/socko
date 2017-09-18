/**
 * Generate output directory using SOCKO!
 */

var cli = require('seeli'),
    merge = require('merge'),
    defaults = require('./defaults'),
    GeneratorApi = require('../api/generator'),
    winston = require('winston');

function Command(name, data, done) {

    this.name = name;
    this.data = data;
    this.done = done;

    this.generatorApi = new GeneratorApi({
        inputPath: this.data.input,
        ignores: this.data.ignore,
        renames : this.data.rename,
        skipIdenticalSockets: this.data.skipIdenticalSockets
    });

}

/**
 * Run the real command logic in an OOP way.
 */

Command.prototype.run = function () {

    var that = this;

    winston.debug(
        'Running generate-command with input: %s, output: %s, node: %s',
        this.data.input,
        this.data.output,
        this.data.node
    );

    // Don't do anything here, let the API take over.

    this.generatorApi.generate(
        this.data.node,
        this.data.output,
        function (error) {

            if (error) {
                that.done(error);
            } else {
                that.done(null, '');
            }

        }
    );

};

module.exports = new cli.Command({

    description: 'Generate a output directory with SOCKO!',

    // We merge the default flags with our special flags

    flags: merge(
        {},
        defaults.flags,
        {
            'input': {
                type: String,
                description: 'Path to the input files.'
            },
            'output': {
                type: String,
                description: 'Path to the output files.'
            },
            'node': {
                type: String,
                description: 'Node to generate. Subnodes have to be' +
                ' separated by :'
            },
            'ignore': {
                type: [String, Array],
                description: 'Ignore this cartridge name.',
                default: []
            },
            'rename': {
                type: [String, Array],
                description: 'Rename these relative filepaths while' +
                ' generating the output. source-path:destination-path',
                default: []
            },
            'skipIdenticalSockets': {
                type: Boolean,
                description: 'If a socket with an identical content exists,' +
                'do not recreate it.',
                default: false
            }
        }
    ),
    run: function (name, data, done) {

        // We're using an object here to be ready for complex commands

        winston.debug('Running %s', name);

        var command = new Command(name, data, done);
        command.run();
    }

});
