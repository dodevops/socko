/**
 * Generator API
 */

var winston = require('winston'),
    fs = require('fs'),
    fse = require('fs-extra'),
    path = require('path'),
    generatorErrors = require('./errors/generator'),
    detectNewLine = require('detect-newline'),
    glob = require('glob'),
    merge = require('merge'),
    HierarchyApi = require('./hierarchyApi'),
    InputHierarchyApi = require('./inputHierarchyApi'),
    Ignore = require('./ignore');

/**
 * Initialize the generator-Api
 *
 * @param inputPath path to the input directory
 * @param ignores an array of ignore patterns for cartridges
 * @constructor
 */

function GeneratorApi(parameters) {

    if (!parameters.hasOwnProperty('inputPath')) {

        winston.error('Missing inputPath parameter');
        return null;

    }

    if (!parameters.hasOwnProperty('ignores')) {

        parameters.ignores = [];

    }

    this.inputPath = parameters.inputPath;

    this.ignores = [];

    for (var i = 0; i < parameters.ignores.length; i++) {

        var ignore = Ignore.fromArgument({
            argument: parameters.ignores[i]
        });

        if (!ignore) {
            winston.error('Skipping ignore.');
            continue;
        }

        this.ignores.push(ignore);

    }

}

/**
 * Run sanity checks on input and output path
 *
 * @param outputPath output path used
 * @param callback callback to call on error
 * @returns {boolean} Wether the sanity checks succeded
 * @private
 */

GeneratorApi.prototype._sanityChecks = function (outputPath, callback) {

    if (!fs.existsSync(this.inputPath)) {
        callback(
            new generatorErrors.PathDoesNotExist({
                'type': 'input',
                'path': this.inputPath
            })
        );
        return false;
    }

    var inputStats = fs.statSync(this.inputPath);

    if (!inputStats.isDirectory()) {
        callback(
            new generatorErrors.InvalidPath({
                'path': this.inputPath
            })
        );
        return false;
    }

    if (fs.existsSync(outputPath)) {

        var outputStats = fs.statSync(outputPath);

        if (!outputStats.isDirectory()) {
            callback(
                new generatorErrors.InvalidPath({
                    'path': outputPath
                })
            );
            return false;
        }

    }

    return true;
};

/**
 * Build up a socket file.
 *
 * @param inputNode socket file node to work on
 * @param socko socko configuration node
 * @param callback callback to run with optional error
 * @returns {string} file content for the file or null, if callback was
 * called with error
 * @private
 */

GeneratorApi.prototype._buildSocket = function (parameters) {
    var inputNode = parameters.inputNode;

    winston.debug('Check for needed cartridges.');

    var insertableCartridges = {};

    var i;

    winston.debug('Gathering needed cartridges for socket %s', inputNode.path);

    for (i = 0; i < inputNode.socketCartridges.length; i++) {

        inputNode.socketCartridges[i].fillCartridges({
            hierarchy: this.hierarchy,
            node: this.node
        });

        if (!inputNode.socketCartridges[i].cartridges) {

            winston.error('Invalid cartridges in socket file.');

            var cartridgeError = new generatorErrors.CartridgeNotFound({
                'cartridge': inputNode.socketCartridges[i].name,
                'socket': inputNode.path
            });

            winston.error(cartridgeError.message);

            this.callback(cartridgeError);

            return;

        }

        insertableCartridges[inputNode.socketCartridges[i].line] =
            inputNode.socketCartridges[i].cartridges;

    }

    winston.debug(
        'Building output file %s.',
        path.join(this.inputPath, inputNode.path)
    );

    var socketContent = fs.readFileSync(
        path.join(this.inputPath, inputNode.path)
    ).toString();
    var newLineSeparator = detectNewLine(socketContent);
    var socketContentArray = socketContent.split(newLineSeparator);

    var newContentArray = [];

    for (i = 0; i <= socketContentArray.length; i++) {

        if (insertableCartridges.hasOwnProperty(i)) {

            // Load cartridge contents

            for (var a = 0; a < insertableCartridges[i].length; a++) {

                winston.debug(
                    'Adding cartridge %s at line %s in file %s',
                    insertableCartridges[i][a].path,
                    i,
                    inputNode.path
                );

                newContentArray = newContentArray.concat(
                    insertableCartridges[i][a].getFileContentsArray()
                );

            }

        } else {

            newContentArray.push(socketContentArray[i]);

        }

    }

    return newContentArray.join(newLineSeparator);
};

/**
 * Get all files from a directory include directives
 *
 * @param parameters
 * @param parameters.configuration Include directives
 * @param parameters.root Root for the directory include
 * @param parameters.node Node to work on
 * @param parameters.files Already scanned files (for recursion)
 * @returns {{}} An object of filename => filepath values
 * @private
 */

GeneratorApi.prototype._directoryInclude = function (parameters) {

    var files = parameters.files,
        node = parameters.node,
        configuration = parameters.configuration,
        root = parameters.root;

    if (!files) {

        files = {};

    }

    var returnFiles = {};

    var includePath = path.join(
        this.inputPath,
        '_socko',
        node.path,
        root
    );

    try {
        fs.accessSync(includePath, fs.R_OK);

        winston.debug(
            'Including files. Checking path %s',
            includePath
        );

        var matchingFiles = glob.sync(
            configuration.pattern,
            {
                cwd: includePath
            }
        );

        for (var i = 0; i < matchingFiles.length; i++) {

            if (!files.hasOwnProperty(matchingFiles[i])) {

                returnFiles[matchingFiles[i]] = path.join(
                    includePath,
                    matchingFiles[i]
                );

                winston.debug('Found file %s', returnFiles[matchingFiles[i]]);

            }

        }

    } catch (e) {
        winston.info(
            'Path %s not found. Skipping directory include here.',
            includePath
        );
    }

    if (
        configuration.scopeLeft() && node.parent !== null
    ) {

        if (configuration.scope > 0) {

            configuration.scope--;

        }

        winston.debug("There's scope left. Checking parent node.");

        var parentFiles = this._directoryInclude({
            node: node.parent,
            root: root,
            configuration: configuration,
            files: merge(
                true,
                {},
                files,
                returnFiles
            )
        });

        returnFiles = merge(
            true,
            {},
            parentFiles,
            returnFiles
        );

    }

    return returnFiles;

};

/**
 * Handle a static file operation
 * @param parameters
 * @param parameters.node File node
 * @private
 */

GeneratorApi.prototype._handleFile = function (parameters) {

    if (!parameters.node.isFile()) {
        winston.error('This is not a file: %s.', this.toString());
        return;
    }

    winston.debug(
        'This is a static file. ' +
        'Check, if it is overridden by the node'
    );

    var fileNode = this.inputHierarchy.getFileNode({
        node: this.node,
        filePath: parameters.node.path
    });

    var filePath;

    if (fileNode === null) {
        filePath = path.join(this.inputPath, parameters.node.path);
    } else {
        filePath = fileNode.getAbsolutePath();
    }

    // Copy path to output dir

    fse.mkdirsSync(path.join(this.outputPath, parameters.node.root));
    fse.copySync(
        filePath,
        path.join(this.outputPath, parameters.node.path),
        {
            'clobber': true
        }
    );

};

/**
 * Handle a socket operation
 * @param parameters
 * @param parameters.node Socket node
 * @private
 */

GeneratorApi.prototype._handleSocket = function (parameters) {

    if (!parameters.node.isSocket()) {
        winston.error('This is not a file: %s.', this.toString());
        return;
    }

    winston.debug('This is a socket. Build it together.');

    // Check for needed sockets

    var fileContents = this._buildSocket({
        inputNode: parameters.node,
        socko: this.node
    });

    if (fileContents === null) {
        return;
    }

    // Strip the .socket-extension from the filename

    var newItemPath = path.join(
        this.outputPath,
        path.basename(parameters.node.path, '.socket')
    );

    fse.outputFileSync(
        newItemPath,
        fileContents
    );

};

/**
 * Handle a directory include operation
 * @param parameters
 * @param parameters.node Directory include node
 * @private
 */

GeneratorApi.prototype._handleInclude = function (parameters) {

    winston.debug('This is a directory include. Copy files.');

    var includeFiles = this._directoryInclude({
        configuration: parameters.node.includeConfiguration,
        root: parameters.node.root,
        node: this.node
    });

    var includeFileKeys = Object.keys(includeFiles);

    if (includeFileKeys.length > 0) {

        fse.mkdirsSync(path.join(this.outputPath, parameters.node.root));

        for (var a = 0; a < includeFileKeys.length; a++) {

            if (includeFiles.hasOwnProperty(includeFileKeys[a])) {

                fse.copySync(
                    includeFiles[includeFileKeys[a]],
                    path.join(
                        this.outputPath,
                        parameters.node.root,
                        includeFileKeys[a]
                    )
                );

            }

        }

    }

};

/**
 * Recursively build the output directory
 *
 * @param input current node in the input configuration object
 * @param output the output path
 * @param node the node to use
 * @param callback callback to run with errors
 * @return false, if callback as been called with errors. true otherwise.
 * @private
 */

GeneratorApi.prototype._buildOutput = function (parameters) {

    var contents = Object.keys(parameters.currentNode.content).sort();

    if (!parameters.currentNode.isRoot()) {
        winston.debug('Working on %s %s',
            parameters.currentNode.type,
            parameters.currentNode.path
        );
    } else {
        winston.debug('Working on root');
    }

    for (var i = 0; i < contents.length; i++) {

        if (!parameters.currentNode.content.hasOwnProperty(contents[i])) {
            continue;
        }

        var item = parameters.currentNode.content[contents[i]];

        winston.debug('Checking %s', item.path);

        if (item.isDirectory()) {

            // Item is a directory. Recurse.

            this._buildOutput({
                currentNode: item
            });

        } else if (item.isFile()) {

            this._handleFile({
                node: item
            });

        } else if (item.isSocket()) {

            this._handleSocket({
                node: item
            });

        } else if (item.isInclude()) {

            this._handleInclude({
                node: item
            });

        } else {

            winston.debug('Current node does not need handling. Skipping.');

        }

    }

    return true;

};

/**
 * Generate the output directory
 *
 * @param node node to generate
 * @param outputPath path to the output directory
 * @param callback Callback, that is run with an optional error
 * @return Name
 */

GeneratorApi.prototype.generate = function (node, outputPath, callback) {

    winston.debug('In generator.generate(%s, %s, callback)', node, outputPath);

    if (!this._sanityChecks(outputPath, callback)) {
        // The sanity checks went wrong, the callback has already been called.

        return;
    }

    this.outputPath = outputPath;
    this.callback = callback;

    // Build SOCKO! hierarchy

    this.hierarchy = new HierarchyApi({
        hierarchyPath: path.join(this.inputPath, '_socko'),
        ignores: this.ignores
    });
    this.hierarchy.build();

    this.node = this.hierarchy.findNode({nodePath: node});

    if (!this.node) {

        var nodeError = new generatorErrors.NodeNotFound({
            'node': node
        });

        winston.error(nodeError.message);
        callback(nodeError);

        return;

    }

    // Build input hierarchy

    this.inputHierarchy = new InputHierarchyApi({
        hierarchyPath: this.inputPath
    });

    this.inputHierarchy.build();

    winston.debug('Walking through input files and building up output ' +
        'directory');

    if (this._buildOutput({
            currentNode: this.inputHierarchy.getRoot()
        })) {
        this.callback(null);
    }

};

module.exports = GeneratorApi;
