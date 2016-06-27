/**
 * A node in the hierarchy
 */

var fs = require('fs'),
    path = require('path'),
    detectNewLine = require('detect-newline');

/**
 * Build a new hierarchy node
 *
 * @param parameters Parameters
 * @param parameters.nodeType Hierachy node type (one of HierachyNode.TYPE_*)
 * @param parameters.name Name of node
 * @param parameters.parent Parent Node
 * @param parameters.basePath Absolute Base path of hierarchy
 * @param parameters.path Relative path to node in hierarchy
 * @param parameters.root Relative root path of node in hierarchy
 * @param parameters.content Content of node
 * @param parameters.socketCartridges cartridges needed for socket
 * @constructor
 */

function HierarchyNode(parameters) {

    this.nodeType = HierarchyNode.TYPE_NONE;
    this.name = '';
    this.parent = null;
    this.basePath = '';
    this.path = '';
    this.root = '';
    this.content = {};

    if (parameters) {

        var validParameters = [
            'nodeType',
            'name',
            'parent',
            'basePath',
            'path',
            'root',
            'content'
        ];

        for (var i = 0; i < validParameters.length; i++) {

            var validParameter = validParameters[i];

            if (parameters.hasOwnProperty(validParameter)) {
                this[validParameter] = parameters[validParameter];
            }

        }

    }

}

/**
 * This node hasn't been identified yet
 * @type {number}
 */
HierarchyNode.TYPE_NONE = 0;

/**
 * This node's the root node
 * @type {number}
 */
HierarchyNode.TYPE_ROOT = 1;

/**
 * This node's a file
 * @type {number}
 */
HierarchyNode.TYPE_FILE = 2;

/**
 * This node's a directory
 * @type {number}
 */
HierarchyNode.TYPE_DIRECTORY = 3;

/**
 * This node's a cartridge
 * @type {number}
 */
HierarchyNode.TYPE_CARTRIDGE = 4;

/**
 * A helper instantiation for directory nodes
 * @param parameters
 * @param parameters.name Name of node
 * @param parameters.parent Parent node
 * @param parameters.path Directory path
 * @param parameters.root Root path of directory
 * @param parameters.basePath Base path
 * @returns {HierarchyNode}
 */

HierarchyNode.forDirectory = function (parameters) {
    return new HierarchyNode({

        nodeType: HierarchyNode.TYPE_DIRECTORY,
        name: parameters.name,
        parent: parameters.parent,
        path: parameters.path,
        root: parameters.root,
        basePath: parameters.basePath

    });
};

/**
 * Creates the root node
 * @returns {HierarchyNode}
 */

HierarchyNode.forRoot = function () {
    return new HierarchyNode({
        nodeType: HierarchyNode.TYPE_ROOT
    });
};

/**
 * Is this hierarchy node a cartridge?
 * @returns {boolean}
 */

HierarchyNode.prototype.isCartridge = function () {
    return this.nodeType === HierarchyNode.TYPE_CARTRIDGE;
};

/**
 * Is this node a directory?
 * @returns {boolean}
 */

HierarchyNode.prototype.isDirectory = function () {
    return this.nodeType === HierarchyNode.TYPE_DIRECTORY;
};

/**
 * Is this node a root node?
 * @returns {boolean}
 */

HierarchyNode.prototype.isRoot = function () {
    return this.nodeType === HierarchyNode.TYPE_ROOT;
};

/**
 * Is this a file node?
 * @returns {boolean}
 */

HierarchyNode.prototype.isFile = function () {
    return this.nodeType === HierarchyNode.TYPE_FILE;
};

/**
 * Get the contents of the file describing this node as an array.
 *
 * @returns {Array}
 */

HierarchyNode.prototype.getFileContentsArray = function () {

    if (this.isDirectory()) {

        winston.error(
            'Requesting file contents for a directory node %s',
            this.toString()
        );
        return [];
    }

    var cartridgeContent = fs.readFileSync(
        this.getAbsolutePath()
    ).toString();

    var cartridgeNewLineSeparator = detectNewLine(cartridgeContent);
    var cartridgeContentArray =
        cartridgeContent.split(cartridgeNewLineSeparator);

    return cartridgeContentArray;

};

/**
 * Return the absolute path of this node
 * @returns {string}
 */

HierarchyNode.prototype.getAbsolutePath = function () {
    return path.join(this.basePath, this.path);
};

module.exports = HierarchyNode;
