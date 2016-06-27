/**
 * An extension to the hierachy Api to handle the input directory
 */

var HierarchyApi = require('./hierarchyApi'),
    InputHierarchyNode = require('./inputHierarchyNode'),
    winston = require('winston'),
    path = require('path');

/**
 * Instantiate the input hierarchy api
 *
 * @see HierarchyApi
 * @param parameters Parameters
 * @constructor
 */

function InputHierarchyApi(parameters) {
    HierarchyApi.call(this, parameters);
};

// Inherit from HierarchyApi

InputHierarchyApi.prototype = Object.create(HierarchyApi.prototype);
InputHierarchyApi.prototype.constructor = InputHierarchyApi;

/**
 * Overwrite _skipPath to skip metadirectory paths
 *
 * @param parameters
 * @returns {boolean}
 * @private
 */

InputHierarchyApi.prototype._skipPath = function (parameters) {

    if (parameters.pathComponents.indexOf('_socko') !== -1) {
        return true;
    }

    return false;

};

/**
 * Overwrite _getDirectoryNode to return an InputHierarchyNode instead.
 *
 * @param parameters
 * @returns {*}
 * @private
 */

InputHierarchyApi.prototype._getDirectoryNode = function (parameters) {

    return InputHierarchyNode.forDirectory(parameters);

};

/**
 * Overwrite _checkfile to handle input hierarchy nodes
 *
 * @see HierarchyApi._checkFile
 * @param parameters
 * @param parameters.parent
 * @param parameters.basePath
 * @param parameters.root
 * @param parameters.fileNode
 * @returns {InputHierarchyNode}
 * @private
 */

InputHierarchyApi.prototype._checkFile = function (
    parameters
) {
    var fileNode = parameters.fileNode;
    var returnNode = InputHierarchyNode.fromHierarchyNode(
        HierarchyApi.prototype._checkFile.call(
            this,
            parameters
        )
    );

    if (path.extname(fileNode.name) === '.socket') {

        winston.debug('This file is a socket');

        returnNode.nodeType = InputHierarchyNode.TYPE_SOCKET;
        returnNode.buildSocketCartridges();

    } else if (fileNode.name === '.socko.include') {

        winston.debug('This file is a directory include file');

        returnNode.nodeType = InputHierarchyNode.TYPE_INCLUDE;
        returnNode.buildIncludeConfiguration();

    }

    return returnNode;

};

module.exports = InputHierarchyApi;
