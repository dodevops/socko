/**
 * A ignore configuration
 */

var winston = require('winston');

/**
 * Instantiate a new Ignore configuration
 *
 * @param parameters
 * @param parameters.nodeName This ignore configuration is only valid for this
 * node name
 * @param parameters.filename Filename to ignore
 * @constructor
 */

function Ignore(parameters) {
    if (parameters) {
        this.nodeName = parameters.nodeName;
        this.filename = parameters.filename;
    }
}

/**
 * Build an ignore configuration from an argument given to SOCKO! - usually
 * in the form <node-Name>:<filename>
 *
 * @param parameters
 * @param parameters.argument The argument passed to socko
 * @returns {*}
 */

Ignore.fromArgument = function (parameters) {

    var ignore = new Ignore();

    if (parameters.argument.match(/:/g)) {
        var tmp = parameters.argument.split(':');

        if (tmp.length !== 2) {
            winston.error(
                'Invalid Ignore configuration: %s.',
                parameters.argument
            );
            return null;
        }

        ignore.nodeName = tmp[0];
        ignore.filename = tmp[1];
    } else {
        ignore.filename = parameters.argument;
    }

    return ignore;

};

/**
 * Check, if this ignore is valid for the given node
 * @param parameters
 * @param parameters.node HierarchyNode to check for
 * @returns {boolean}
 */

Ignore.prototype.isValid = function (parameters) {

    if (!this.nodeName || this.nodeName === parameters.node.name) {
        return true;
    }

    return false;

};

module.exports = Ignore;
