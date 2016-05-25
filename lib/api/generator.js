/**
 * Generator API
 */

var winston = require('winston'),
    fs = require('fs'),
    fse = require('fs-extra'),
    path = require('path'),
    generatorErrors = require('./errors/generator'),
    walk = require('walk'),
    detectNewLine = require('detect-newline'),
    minimatch = require('minimatch'),
    glob = require('glob'),
    merge = require('merge');

/**
 * Initialize the generator-Api
 *
 * @param inputPath path to the input directory
 * @param ignores an array of ignore patterns for cartridges
 * @constructor
 */

function API(parameters) {

    if (!parameters.hasOwnProperty('inputPath')) {

        winston.error('Missing inputPath parameter');
        return null;

    }

    if (!parameters.hasOwnProperty('ignores')) {

        parameters.ignores = [];

    }

    this.inputPath = parameters.inputPath;
    this.ignores = parameters.ignores;

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
 * Check a file node and return a file configuration object
 *
 * @param parent Parent node
 * @param basePath base path of this file (under root)
 * @param root the root path
 * @param fileNode the file node
 * @returns {*} a file configuration object
 * @private
 */

API.prototype._checkFile = function (parent, basePath, root, fileNode) {

    var returnArray = {
        'type': 'file',
        'name': fileNode.name,
        'parent': parent,
        'isSocket': false,
        'isCartridge': false,
        'isInclude': false,
        'includeConfiguration': {},
        'path': path.relative(
            basePath,
            path.join(root, fileNode.name)
        ),
        'root': path.relative(basePath, root),
        'socketCartridges': []
    };

    if (path.extname(fileNode.name) === '.socket') {

        winston.debug('This file is a socket');

        returnArray['isSocket'] = true;

        // Find the needed cartridges for this socket

        returnArray['socketCartridges'] =
            this.scanSocket(
                path.join(
                    basePath,
                    returnArray.path
                )
            );

    } else if (path.extname(fileNode.name) === '.cartridge') {

        winston.debug('This file is a cartridge');

        returnArray['isCartridge'] = true;

    } else if (fileNode.name === '.socko.include') {

        winston.debug('This file is a directory include file');

        returnArray['isInclude'] = true;

        var includeContent = fs.readFileSync(
            path.join(root, fileNode.name)
        ).toString();

        var includeNewLineSeparator = detectNewLine(includeContent);
        var includeContentArray =
            includeContent.split(includeNewLineSeparator);

        var includeConfiguration = includeContentArray[0].split(':');

        if (includeConfiguration.length !== 2) {

            winston.error(
                'Wrong include directive: %s', includeContent
            );

            return null;

        } else {

            var scope = parseInt(includeConfiguration[0]);

            if (isNaN(scope)) {

                winston.error(
                    'Wrong include directive - scope is not a number: %s',
                    includeContent
                );

                return null;

            }

            returnArray['includeConfiguration'] = {
                'scope': scope,
                'pattern': includeConfiguration[1]
            };

        }

    }

    return returnArray;

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

            var tmp = this._checkFile(parent, basePath, root, nodes[i]);

            if (tmp !== null) {

                configurationRoot[nodes[i].name] = tmp;

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

    var content = sockoNode.content;

    for (i = 0; i < fileComponents.length - 1; i++) {

        if (content.hasOwnProperty(fileComponents[i])) {
            content = content[fileComponents[i]].content;
        } else {

            // There's a subdirectory, that we don't have.

            return null;
        }

    }

    var fileName = fileComponents[fileComponents.length - 1];

    if (
        content.hasOwnProperty(fileName) &&
        content[fileName].type === 'file'
    ) {

        // We have found the file

        returnPath = content[fileName].path;
    }

    if (returnPath === null && sockoNode.parent !== null) {

        // Try to check the parent node.

        return this._nodeGetFile(sockoNode.parent, filePath);

    }

    return returnPath;

};

/**
 * Collect cartridges matching the configured cartridgeCollector in or above
 * the socko node
 *
 * @param cartridgeCollector Cartridge Collector configuration
 * @param sockoNode socko node to start with
 * @param foundCartridges an object of found cartridge names
 * @returns {Array} Array of cartridge paths
 * @private
 */

API.prototype._collectCartridges =
    function (cartridgeCollector, sockoNode, foundCartridges) {

        var cartridgeCollection = [],
            i;

        if (!foundCartridges) {

            // foundCartridges holds found cartridges so we can be sure not
            // to overwrite one cartridge if it was found on a higher level

            foundCartridges = [];

        }

        var nodeIgnores = [];

        winston.debug('Checking, which files should be ignored on this node');

        for (i = 0; i < this.ignores.length; i++) {

            if (this.ignores[i].match(/:/g)) {
                var ignoreOptions = this.ignores[i].split(':');

                if (ignoreOptions[0] === sockoNode.name) {
                    nodeIgnores.push(ignoreOptions[1] + '.cartridge');
                }
            } else {
                nodeIgnores.push(this.ignores[i] + '.cartridge');
            }

        }

        var contentKeys = Object.keys(sockoNode.content);

        for (i = 0; i < contentKeys.length; i++) {

            if (
                contentKeys[i].endsWith('.cartridge') &&
                nodeIgnores.indexOf(contentKeys[i]) === -1 &&
                foundCartridges.indexOf(contentKeys[i]) === -1
            ) {

                var matching = false;

                if (cartridgeCollector[2] === 'G') {

                    if (
                        minimatch(contentKeys[i], cartridgeCollector[3])
                    ) {

                        matching = true;

                    }

                } else if (cartridgeCollector[2] === 'R') {

                    var matchRegExp = null;

                    try {

                        matchRegExp = new RegExp(cartridgeCollector[3]);

                    } catch (e) {

                        winston.error(
                            'Invalid cartridge collector regexp: %s',
                            cartridgeCollector[3]
                        );

                    }

                    if (matchRegExp && matchRegExp.exec(contentKeys[i])) {

                        matching = true;

                    }

                } else {

                    winston.error(
                        'Invalid cartridge collector matcher: %s',
                        cartridgeCollector[2]
                    );

                }

                if (matching) {
                    winston.debug(
                        'Found cartridge %s at path %s',
                        contentKeys[i],
                        sockoNode.content[contentKeys[i]].path
                    );

                    foundCartridges.push(contentKeys[i]);
                    cartridgeCollection.push(
                        sockoNode.content[contentKeys[i]].path
                    );
                }

            }

        }

        if (
            (
                cartridgeCollector[1] === -1 ||
                cartridgeCollector[1] > 0
            ) &&
            (
                sockoNode.parent !== null
            )
        ) {

            if (cartridgeCollector[1] > 0) {
                cartridgeCollector[1]--;
            }

            cartridgeCollection = cartridgeCollection.concat(
                this._collectCartridges(
                    cartridgeCollector,
                    sockoNode.parent,
                    foundCartridges
                )
            );

        }

        return cartridgeCollection.sort();

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

        if (cartridgeName.startsWith('COLLECT:')) {

            winston.debug('We have a cartridge collector here. Searching for' +
                ' cartridges');

            var cartridgeCollector = cartridgeName.split(':');

            if (isNaN(cartridgeCollector[1])) {

                winston.error(
                    'Invalid scope specified: %s. Skipping file.',
                    cartridgeCollector[1]
                );

                continue;

            }

            cartridgeCollector[1] = parseInt(cartridgeCollector[1]);

            insertableCartridges[inputNode.socketCartridges[i].line] =
                this._collectCartridges(cartridgeCollector, socko);

        } else {

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
                [cartridgePath];

        }

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

            for (var a = 0; a < insertableCartridges[i].length; a++) {

                winston.debug(
                    'Adding cartridge %s at line %s in file %s',
                    insertableCartridges[i][a],
                    i,
                    inputNode.path
                );

                var cartridgeContent = fs.readFileSync(
                    path.join(
                        this.inputPath,
                        '_socko',
                        insertableCartridges[i][a]
                    )
                ).toString();
                var cartridgeNewLineSeparator = detectNewLine(cartridgeContent);
                var cartridgeContentArray =
                    cartridgeContent.split(cartridgeNewLineSeparator);

                newContentArray = newContentArray.concat(cartridgeContentArray);

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
 * @param input Input node containing the include directives
 * @param node Current SOCKO!-node
 * @param files Already scanned files (for recursion)
 * @returns {{}} An object of filename => filepath values
 * @private
 */

API.prototype._directoryInclude = function (input, node, files) {

    // Gather files matching pattern

    if (!files) {

        files = {};

    }

    var returnFiles = {};

    var includePath = path.join(
        this.inputPath,
        '_socko',
        node.path,
        input.root
    );

    try {
        fs.accessSync(includePath, fs.R_OK);
    } catch (e) {
        winston.info(
            'Path %s not found. Skipping directory include here.',
            includePath
        );

        return {};
    }

    winston.debug(
        'Including files. Checking path %s',
        includePath
    );

    var matchingFiles = glob.sync(
        input.includeConfiguration.pattern,
        {
            cwd: includePath
        }
    );

    for (var i = 0; i < matchingFiles.length; i++) {

        if (!files.hasOwnProperty(matchingFiles[i])) {

            returnFiles[matchingFiles[i]] = path.join(
                this.inputPath,
                '_socko',
                node.path,
                input.root,
                matchingFiles[i]
            );

            winston.debug('Found file %s', returnFiles[matchingFiles[i]]);

        }

    }

    if (
        (
            input.includeConfiguration.scope === -1 ||
            input.includeConfiguration.scope > 0
        ) && (
            node.parent !== null
        )
    ) {

        if (input.includeConfiguration.scope > 0) {

            input.includeConfiguration.scope--;

        }

        winston.debug("There's scope left. Checking parent node.");

        var parentFiles = this._directoryInclude(
            input, node.parent, merge(
                true,
                {},
                files,
                returnFiles
            )
        );

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

            if (!item.isSocket && !item.isCartridge && !item.isInclude) {

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

            } else if (item.isInclude) {

                winston.debug('This is a directory include. Copy files.');

                var includeFiles = this._directoryInclude(
                    item,
                    node
                );

                var includeFileKeys = Object.keys(includeFiles);

                if (includeFileKeys.length > 0) {

                    fse.mkdirsSync(path.join(output, item.root));

                    for (var a = 0; a < includeFileKeys.length; a++) {

                        if (includeFiles.hasOwnProperty(includeFileKeys[a])) {

                            fse.copySync(
                                includeFiles[includeFileKeys[a]],
                                path.join(
                                    output,
                                    item.root,
                                    includeFileKeys[a]
                                )
                            );

                        }

                    }

                }

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
        'path': '',
        'content': {}
    };

    this.inputStructure = {
        'type': 'root',
        'parent': null,
        'path': '',
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
