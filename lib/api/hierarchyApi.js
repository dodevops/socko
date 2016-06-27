/**
 * SOCKO! hierarchy handling
 */

var path = require('path'),
    walk = require('walk'),
    HierarchyNode = require('./hierarchyNode'),
    winston = require('winston');

/**
 * Instantiate the hierarchy
 *
 * @param parameters Parameters
 * @param parameters.hierarchyPath File path to the hierarchy
 * @param parameters.ignores A list of ignores
 * @constructor
 */

function HierarchyApi(parameters) {

    if (parameters) {

        this.filePath = parameters.hierarchyPath;
        this.ignores = parameters.ignores;
        this.hierarchy = {
            _root: HierarchyNode.forRoot()
        };

    }

}

/**
 * Check a file node and return a hierarchy node
 *
 * @param parameters
 * @param parameters.parent Parent node
 * @param parameters.basePath base path of this file (under root)
 * @param parameters.root the root path
 * @param parameters.fileNode the walk file node
 * @returns {HierarchyNode}
 * @private
 */

HierarchyApi.prototype._checkFile = function (
    parameters
) {
    var parent = parameters.parent;
    var basePath = parameters.basePath;
    var root = parameters.root;
    var fileNode = parameters.fileNode;

    var returnNode = new HierarchyNode({
        nodeType: HierarchyNode.TYPE_FILE,
        name: fileNode.name,
        parent: parent,
        basePath: basePath,
        path: path.relative(
            basePath,
            path.join(root, fileNode.name)
        ),
        root: path.relative(basePath, root)
    });

    if (path.extname(fileNode.name) === '.cartridge') {

        winston.debug('This file is a cartridge');

        returnNode.nodeType = HierarchyNode.TYPE_CARTRIDGE;

    }

    return returnNode;

};

/**
 * Check, if a path should be skipped.
 *
 * @param parameters
 * @param parameters.pathComponents the path, split by the path separator
 * @returns {boolean}
 * @private
 */

HierarchyApi.prototype._skipPath = function () {
    return false;
};

/**
 * Return a directory node for the given parameters
 *
 * @param parameters
 * @param parameters.name Name of node
 * @param parameters.parent Parent node
 * @param parameters.path Directory path
 * @param parameters.root Root path of directory
 * @param parameters.basePath Base path
 * @returns {HierarchyNode}
 * @private
 */

HierarchyApi.prototype._getDirectoryNode = function (parameters) {
    return HierarchyNode.forDirectory(parameters);
};

/**
 * A handler for node walk's nodes event
 *
 * @param root The root where the event was emitted
 * @param nodes The stat objects in that root
 * @param next The next function to call
 * @private
 */

HierarchyApi.prototype._handleNodes = function (root, nodes, next) {

    winston.debug('Reached %s', root);

    var i,
        relativeRoot = path.relative(this.filePath, root),
        pathComponents = relativeRoot.split(path.sep),
        basePath = this.filePath;

    if (
        this._skipPath({
            pathComponents: pathComponents
        })
    ) {

        // Skip metadirectory for inheriting classes

        next();
        return;
    }

    if (pathComponents[0] === '' && pathComponents.length === 1) {

        // We're on the root
        pathComponents = [];

    }

    var configurationRoot = this.hierarchy._root.content;

    winston.debug(
        'Finding configuration root and adding directories to the hierarchy.'
    );

    var parent = this.hierarchy._root;

    for (i = 0; i < pathComponents.length; i++) {

        if (
            !configurationRoot.hasOwnProperty(
                pathComponents[i]
            )
        ) {

            winston.debug('Adding directory %s', pathComponents[i]);

            configurationRoot[pathComponents[i]] = this._getDirectoryNode({
                name: pathComponents[i],
                parent: parent,
                path: path.join.apply(this, pathComponents.slice(0, i + 1)),
                root: path.join.apply(this, pathComponents.slice(0, i)),
                basePath: this.filePath
            });

        }

        parent = configurationRoot[pathComponents[i]];

        configurationRoot =
            configurationRoot[pathComponents[i]].content;

    }

    winston.debug('Adding contents');

    for (i = 0; i < nodes.length; i++) {

        if (nodes[i].type === 'file') {

            winston.debug('Adding file %s', nodes[i].name);

            configurationRoot[nodes[i].name] = this._checkFile({
                parent: parent,
                basePath: basePath,
                root: root,
                fileNode: nodes[i]
            });

        }

    }

    next();

};

/**
 * Build the hierarchy
 */

HierarchyApi.prototype.build = function () {

    walk.walkSync(
        this.filePath,
        {
            followLinks: true,
            listeners: {
                files: this._handleNodes.bind(this)
            }
        }
    );

};

/**
 * Returns a node based on a colon-separated node path. If the node can not
 * be found, null is returned instead
 *
 * @param parameters
 * @param parameters.nodePath colon-separated path to node
 * @returns {HierarchyNode|*} The node or null
 */

HierarchyApi.prototype.findNode = function (parameters) {
    var nodePath = parameters.nodePath;

    var nodeComponents = nodePath.split(':');

    winston.debug('Finding node');

    var startingNode = this.hierarchy._root;

    for (var i = 0; i < nodeComponents.length; i++) {

        if (!startingNode.content.hasOwnProperty(nodeComponents[i])) {

            return null;
        }

        startingNode = startingNode.content[nodeComponents[i]];

    }

    return startingNode;

};

/**
 * Check, if the hierarchy starting at the given node has a specific file
 * and return the hierarchy node for that file. Return null, if file can not
 * be found
 *
 * @param parameters
 * @param parameters.node Node to start at
 * @param parameters.filePath Path of the needed file
 * @return HierarchyNode node describing the file
 */

HierarchyApi.prototype.getFileNode = function (parameters) {

    var node = parameters.node,
        filePath = parameters.filePath,
        fileComponents = filePath.split(path.sep),
        returnNode = null;

    // Walk through the nodes until you have found the matching directory node

    var content = node.content;

    for (var i = 0; i < fileComponents.length - 1; i++) {

        if (content.hasOwnProperty(fileComponents[i])) {
            content = content[fileComponents[i]].content;
        } else {

            // There's a subdirectory, that we don't have.

            return null;
        }

    }

    var fileName = fileComponents[fileComponents.length - 1];

    if (
        content.hasOwnProperty(fileName) && !content[fileName].isDirectory()
    ) {

        // We have found the file

        returnNode = content[fileName];
    }

    if (returnNode === null && node.parent !== null) {

        // Try to check the parent node.

        return this.getFileNode({
            node: node.parent,
            filePath: filePath
        });

    }

    return returnNode;

};

/**
 * Get the ignored node names for this node
 *
 * @param parameters
 * @param parameters.node Node to check for
 * @returns {Array}
 */

HierarchyApi.prototype.getNodeIgnores = function (parameters) {

    var nodeIgnores = [];

    winston.debug('Checking, which files should be ignored on this node');

    for (var i = 0; i < this.ignores.length; i++) {

        if (this.ignores[i].isValid({
                node: parameters.node
            })) {
            nodeIgnores.push(this.ignores[i].filename + '.cartridge');
        }

    }

    return nodeIgnores;

};

/**
 * Collect cartridge files in the hierarchy based on the collector configuration
 *
 * @param parameters
 * @param parameters.node Node to start search
 * @param parameters.configuration CartridgeCollector configuration
 * @param parameters.foundCartridges Already found cartridges during the recurse
 * @returns {Array.<*>}
 */

HierarchyApi.prototype.collectCartridges = function (parameters) {

    var foundCartridges = parameters.foundCartridges;
    var node = parameters.node;
    var configuration = parameters.configuration;

    var cartridgeCollection = [],
        i;

    if (!foundCartridges) {

        // foundCartridges holds found cartridges so we can be sure not
        // to overwrite one cartridge if it was found on a higher level

        foundCartridges = [];

    }

    var nodeIgnores = this.getNodeIgnores({
        node: node
    });

    var contentKeys = Object.keys(node.content);

    for (i = 0; i < contentKeys.length; i++) {

        var currentNode = node.content[contentKeys[i]];

        // Check for unignored cartridges, that are not already found.

        if (
            nodeIgnores.indexOf(contentKeys[i]) === -1 &&
            foundCartridges.indexOf(contentKeys[i]) === -1 &&
            configuration.matches({
                node: currentNode
            })
        ) {

            winston.debug(
                'Found cartridge %s at path %s',
                contentKeys[i],
                currentNode.path
            );

            foundCartridges.push(contentKeys[i]);
            cartridgeCollection.push(
                currentNode
            );
        }

    }

    if (
        (
            configuration.scope === -1 ||
            configuration.scope > 0
        ) &&
        (
            node.parent !== null
        )
    ) {

        if (configuration.scope > 0) {
            configuration.scope--;
        }

        cartridgeCollection = cartridgeCollection.concat(
            this.collectCartridges({
                configuration: configuration,
                node: node.parent,
                foundCartridges: foundCartridges
            })
        );

    }

    return cartridgeCollection.sort();

};

/**
 * Return the root node
 * @returns {HierarchyNode}
 */

HierarchyApi.prototype.getRoot = function () {
    return this.hierarchy._root;
};

module.exports = HierarchyApi;
