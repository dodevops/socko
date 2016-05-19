/**
 * Generator API
 */

var winston = require('winston'),
    fs = require('fs'),
    fse = require('fs-extra'),
    path = require('path'),
    generatorErrors = require('./errors/generator'),
    walk = require('walk'),
    detectNewLine = require('detect-newline');

/**
 * Initialize the generator-Api
 *
 * @param inputPath path to the input directory
 * @constructor
 */

function API(inputPath) {

    this.inputPath = inputPath;

}

/**
 * Available cartridge Directives
 * @type {*[]}
 */

API.cartridgeDirectives = [
    {
        'regExp': new RegExp('<!-- SOCKO: (.*) -->'),
        'type': 'xml'
    },
    {
        'regExp': new RegExp('"_SOCKO!": "([^"]*)",?'),
        'type': 'json'
    },
    {
        'regExp': new RegExp('# SOCKO: ([^ ]*) #'),
        'type': 'hash'
    },
    {
        'regExp': new RegExp('// SOCKO: ([^ ]*) //'),
        'type': 'slash'
    },
    {
        'regExp': new RegExp('/\\* SOCKO: ([^ ]*) \\*/'),
        'type': 'multilineslash'
    },
    {
        'regExp': new RegExp('{{<< (.*) >>}}'),
        'type': 'native'
    }
];

/**
 * Run sanity checks on input and output path
 *
 * @param outputPath output path used
 * @param callback callback to call on error
 * @returns {boolean} Wether the sanity checks succeded
 * @private
 */

API.prototype._sanityChecks = function (outputPath, callback) {

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
 * A handler for node walk's nodes event
 *
 * @param root The root where the event was emitted
 * @param nodes The stat objects in that root
 * @param next The next function to call
 * @private
 */

API.prototype._handleNodes = function (root, nodes, next) {

    winston.debug('Reached %s', root);

    var i,
        relativeRoot = path.relative(this.inputPath, root),
        pathComponents = relativeRoot.split(path.sep),
        configurationObject = this.inputStructure,
        basePath = this.inputPath;

    if (
        pathComponents[0] === '_socko'
    ) {
        configurationObject = this.sockoConfiguration;
        pathComponents.shift();
        basePath = path.join(this.inputPath, '_socko');
    }

    if (pathComponents[0] === '' && pathComponents.length === 1) {
        pathComponents = [];
    }

    var configurationRoot = configurationObject.content;

    winston.debug('Finding configuration root.');

    var parent = configurationObject;

    for (i = 0; i < pathComponents.length; i++) {

        if (
            !configurationRoot.hasOwnProperty(
                pathComponents[i]
            )
        ) {
            configurationRoot[pathComponents[i]] = {
                'type': 'directory',
                'name': pathComponents[i],
                'parent': parent,
                'path': path.join.apply(this, pathComponents.slice(0, i + 1)),
                'root': path.join.apply(this, pathComponents.slice(0, i)),
                'content': {}
            };
        }

        parent = configurationRoot[pathComponents[i]];

        configurationRoot =
            configurationRoot[pathComponents[i]].content;

    }

    winston.debug('Adding contents');

    for (i = 0; i < nodes.length; i++) {

        if (nodes[i].type === 'file') {

            winston.debug('Adding %s', nodes[i].name);

            configurationRoot[nodes[i].name] = {
                'type': 'file',
                'name': nodes[i].name,
                'parent': parent,
                'isSocket': false,
                'isCartridge': false,
                'path': path.relative(
                    basePath,
                    path.join(root, nodes[i].name)
                ),
                'root': path.relative(basePath, root),
                'socketCartridges': []
            };

            if (path.extname(nodes[i].name) === '.socket') {

                winston.debug('This file is a socket');

                configurationRoot[nodes[i].name]['isSocket'] = true;

                // Find the needed cartridges for this socket

                configurationRoot[nodes[i].name]['socketCartridges'] =
                    this.scanSocket(
                        path.join(
                            basePath,
                            configurationRoot[nodes[i].name].path
                        )
                    );

            } else if (path.extname(nodes[i].name) === '.cartridge') {

                winston.debug('This file is a cartridge');

                configurationRoot[nodes[i].name]['isCartridge'] = true;
            }
        }

    }

    next();

};

/**
 * Check, if a sockoNode includes the given file path and return the file path
 * in the node. This walks up the node tree to achieve the hierarchy.
 *
 * @param sockoNode sockoNode to work on
 * @param filePath path to file
 * @returns null, when the file doesn't exist or the path to the file in the
 * node
 * @private
 */

API.prototype._nodeGetFile = function (sockoNode, filePath) {

    var i,
        fileComponents = filePath.split(path.sep),
        returnPath = null;

    // Walk through the nodes until you have found the matching directory node

    for (i = 0; i < fileComponents.length - 1; i++) {

        if (sockoNode.content.hasOwnProperty(fileComponents[i])) {
            sockoNode = sockoNode.content[fileComponents[i]];
        } else {

            // There's a subdirectory, that we don't have.

            return null;
        }

    }

    var fileName = fileComponents[fileComponents.length - 1];

    if (
        sockoNode.content.hasOwnProperty(fileName) &&
        sockoNode.content[fileName].type === 'file'
    ) {

        // We have found the file

        returnPath = sockoNode.content[fileName].path;
    }

    if (returnPath === null && sockoNode.parent !== null) {

        // Try to check the parent node.

        return this._nodeGetFile(sockoNode.parent, filePath);

    }

    return returnPath;

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

API.prototype._buildSocket = function (inputNode, socko, callback) {

    winston.debug('Check for needed cartridges.');

    var insertableCartridges = {};

    var i;

    for (i = 0; i < inputNode.socketCartridges.length; i++) {

        var cartridgeName = inputNode.socketCartridges[i].name;

        var cartridgePath = this._nodeGetFile(
            socko,
            cartridgeName + '.cartridge'
        );

        if (cartridgePath === null) {

            var cartridgeError = new generatorErrors.CartridgeNotFound({
                'cartridge': cartridgeName,
                'socket': inputNode.path
            });

            winston.error(cartridgeError.message);

            callback(cartridgeError);

            return null;

        }

        insertableCartridges[inputNode.socketCartridges[i].line] =
            cartridgePath;

    }

    var socketContent = fs.readFileSync(
        path.join(this.inputPath, inputNode.path)
    ).toString();
    var newLineSeparator = detectNewLine(socketContent);
    var socketContentArray = socketContent.split(newLineSeparator);

    var newContentArray = [];

    for (i = 0; i <= socketContentArray.length; i++) {

        if (insertableCartridges.hasOwnProperty(i)) {

            // Load cartridge contents

            var cartridgeContent = fs.readFileSync(
                path.join(
                    this.inputPath,
                    '_socko',
                    insertableCartridges[i]
                )
            ).toString();
            var cartridgeNewLineSeparator = detectNewLine(cartridgeContent);
            var cartridgeContentArray =
                cartridgeContent.split(cartridgeNewLineSeparator);

            newContentArray = newContentArray.concat(cartridgeContentArray);

        } else {

            newContentArray.push(socketContentArray[i]);

        }

    }

    return newContentArray.join(newLineSeparator);
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

API.prototype._buildOutput = function (input, output, node, callback) {

    var contents = Object.keys(input.content).sort();
    var i;

    for (i = 0; i < contents.length; i++) {

        if (!input.content.hasOwnProperty(contents[i])) {
            continue;
        }

        var item = input.content[contents[i]];

        if (item.type !== 'root') {
            winston.debug('Working on %s %s',
                item.type,
                item.path
            );
        } else {
            winston.debug('Working on root');
        }

        if (item.type === 'directory') {
            this._buildOutput(item, output, node, callback);
        } else if (item.type === 'file') {

            if (!item.isSocket && !item.isCartridge) {

                winston.debug(
                    'This is a static file. ' +
                    'Check, if it is overridden by the node'
                );

                var filePath = this._nodeGetFile(node, item.path);

                if (filePath === null) {
                    filePath = path.join(this.inputPath, item.path);
                } else {
                    filePath = path.join(this.inputPath, '_socko', filePath);
                }

                // Copy path to output dir

                fse.mkdirsSync(path.join(output, item.root));
                fse.copySync(
                    filePath,
                    path.join(output, item.path),
                    {
                        'clobber': true
                    }
                );

            } else if (item.isSocket) {

                winston.debug('This is a socket. Build it together.');

                // Check for needed sockets

                var fileContents = this._buildSocket(
                    item,
                    node,
                    callback
                );

                if (fileContents === null) {
                    return false;
                }

                // Strip the .socket-extension from the filename

                var newItemPath = path.join(
                    output,
                    path.basename(item.path, '.socket')
                );

                fse.outputFileSync(
                    newItemPath,
                    fileContents
                );

            } else {

                winston.debug('This is a cartridge. Skipping.');

            }

        }

    }

    return true;

};

/**
 * Scan a socket file for needed cartridges
 *
 * The returned array contains these objects:
 *
 * {
 *    "name": "name of cartridge to insert",
 *    "line": "line in file",
 *    "type": "type of directive matched"
 * }
 *
 * @param socketPath Path to socket file
 * @returns {Array} Needed cartridges
 */

API.prototype.scanSocket = function (socketPath) {

    var socketContent = fs.readFileSync(socketPath).toString();
    var newLineSeparator = detectNewLine(socketContent);
    var socketContentArray = socketContent.split(newLineSeparator);

    var returnArray = [];

    for (var i = 0; i < socketContentArray.length; i++) {

        var line = socketContentArray[i];

        for (var a = 0; a < API.cartridgeDirectives.length; a++) {

            var matches = API.cartridgeDirectives[a].regExp.exec(line);

            if (matches) {
                returnArray.push({
                    'name': matches[1],
                    'line': i,
                    'type': API.cartridgeDirectives[a].type
                });
            }

        }
    }

    return returnArray;

};

/**
 * Generate the output directory
 *
 * @param node node to generate
 * @param outputPath path to the output directory
 * @param callback Callback, that is run with an optional error
 * @return Name
 */

API.prototype.generate = function (node, outputPath, callback) {

    winston.debug('In generator.generate(%s, %s, callback)', node, outputPath);

    if (!this._sanityChecks(outputPath, callback)) {
        // The sanity checks went wrong, the callback has already been called.

        return;
    }

    // Fetch all files from the input directory

    this.sockoConfiguration = {
        'type': 'root',
        'parent': null,
        'content': {}
    };

    this.inputStructure = {
        'type': 'root',
        'parent': null,
        'content': {}
    };

    winston.debug('Walk through input directory structure.');

    walk.walkSync(
        this.inputPath,
        {
            followLinks: true,
            listeners: {
                files: this._handleNodes.bind(this)
            }
        }
    );

    winston.debug('Walking through input files and building up output ' +
        'directory');

    var nodeComponents = node.split(':'),
        sockoNode = this.sockoConfiguration;

    winston.debug('Finding socko node');

    for (var i = 0; i < nodeComponents.length; i++) {

        if (!sockoNode.content.hasOwnProperty(nodeComponents[i])) {

            var nodeError = new generatorErrors.NodeNotFound({
                'node': node
            });

            winston.error(nodeError.message);
            callback(nodeError);

            return;
        }

        sockoNode = sockoNode.content[nodeComponents[i]];
    }

    if (this._buildOutput(
            this.inputStructure,
            outputPath,
            sockoNode,
            callback
        )) {
        callback(null);
    }

};

module.exports = API;
