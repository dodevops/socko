/**
 * An extension to the hierarchy API for the input directory
 */

var Socket = require('./socket'),
    winston = require('winston'),
    HierarchyNode = require('./hierarchyNode'),
    IncludeConfiguration = require('./includeConfiguration'),
    path = require('path'),
    fs = require('fs'),
    detectNewLine = require('detect-newline');

/**
 * Instantiate the input hierarchy node
 *
 * @see HierarchyNode
 * @param parameters
 * @param paremeters.socketCartridges collected sockets from a socket file
 * @param parameters.includeConfiguration The configuration of a directory
 * include
 * @constructor
 */

function InputHierarchyNode(parameters) {
    HierarchyNode.call(this, parameters);
    this.socketCartridges = [];
    this.includeConfiguration = null;

    if (parameters) {

        var validParameters = [
            'includeConfiguration',
            'socketCartridges'
        ];

        for (var i = 0; i < validParameters.length; i++) {

            var validParameter = validParameters[i];

            if (parameters.hasOwnProperty(validParameter)) {
                this[validParameter] = parameters[validParameter];
            }

        }

    }

}

// Inherit from HierarchyNode

InputHierarchyNode.prototype = Object.create(HierarchyNode.prototype);
InputHierarchyNode.prototype.constructor = InputHierarchyNode;

/**
 * This node's a socket
 * @type {number}
 */
InputHierarchyNode.TYPE_SOCKET = 10;

/**
 * This node's a directory include
 * @type {number}
 */
InputHierarchyNode.TYPE_INCLUDE = 11;

/**
 * Available cartridge Directives
 * @type {*[]}
 */

InputHierarchyNode.cartridgeDirectives = [
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
 * Converts a HierarchyNode to an InputHierarchyNode
 *
 * @param node Base HierarchyNode
 * @returns {InputHierarchyNode}
 */

InputHierarchyNode.fromHierarchyNode = function (node) {

    var returnNode = new InputHierarchyNode(node);
    return returnNode;

};

/**
 * Is this node a socket?
 * @returns {boolean}
 */

InputHierarchyNode.prototype.isSocket = function () {
    return this.nodeType === InputHierarchyNode.TYPE_SOCKET;
};

/**
 * Is this node a directory include
 * @returns {boolean}
 */

InputHierarchyNode.prototype.isInclude = function () {
    return this.nodeType === InputHierarchyNode.TYPE_INCLUDE;
};

/**
 * Returns an array of Socket objects, that are inside a socket
 *
 * @returns {Array}
 */

InputHierarchyNode.prototype.buildSocketCartridges = function () {

    if (!this.isSocket()) {
        return;
    }

    var socketPath = path.join(this.basePath, this.path);
    var socketContent = fs.readFileSync(socketPath).toString();
    var newLineSeparator = detectNewLine(socketContent);
    var socketContentArray = socketContent.split(newLineSeparator);

    var socketCartridges = [];

    for (var i = 0; i < socketContentArray.length; i++) {

        var line = socketContentArray[i];

        for (
            var a = 0;
            a < InputHierarchyNode.cartridgeDirectives.length;
            a++
        ) {

            var matches = InputHierarchyNode.cartridgeDirectives[a].regExp.exec(
                line
            );

            if (matches) {
                socketCartridges.push(
                    new Socket({
                        name: matches[1],
                        path: path.dirname(this.path),
                        line: i,
                        type: InputHierarchyNode.cartridgeDirectives[a].type
                    })
                );
            }

        }
    }

    this.socketCartridges = socketCartridges;

};

/**
 * Build the node's include configuration
 */

InputHierarchyNode.prototype.buildIncludeConfiguration = function () {

    var includeContent = fs.readFileSync(
        path.join(this.basePath, this.path)
    ).toString();

    var includeNewLineSeparator = detectNewLine(includeContent);
    var includeContentArray =
        includeContent.split(includeNewLineSeparator);

    var includeConfiguration = includeContentArray[0].split(':');

    if (includeConfiguration.length !== 2) {

        winston.error(
            'Wrong include directive: %s', includeContent
        );

        return;

    } else {

        var scope = parseInt(includeConfiguration[0]);

        if (isNaN(scope)) {

            winston.error(
                'Wrong include directive - scope is not a number: %s',
                includeContent
            );

            return;

        }

        this.includeConfiguration = new IncludeConfiguration({
            scope: scope,
            pattern: includeConfiguration[1]
        });

    }
};

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

InputHierarchyNode.forDirectory = function (parameters) {
    return new InputHierarchyNode({

        nodeType: HierarchyNode.TYPE_DIRECTORY,
        name: parameters.name,
        parent: parameters.parent,
        path: parameters.path,
        root: parameters.root,
        basePath: parameters.basePath

    });
};

module.exports = InputHierarchyNode;
