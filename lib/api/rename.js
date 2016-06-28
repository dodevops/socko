/**
 * Renaming of files during the generation
 */

var winston = require('winston');

/**
 * Renames files on the flight
 * @param parameters
 * @param parameters.source Relative source path to the file
 * @param parameters.destination Relative destination path to the file
 * @constructor
 */

function Rename(parameters) {

    if (parameters) {
        this.source = parameters.source;
        this.destination = parameters.destination;
    }

}

/**
 * Create a Rename object from a SOCKO Argument (source:destination). Return
 * null on error.
 *
 * @param parameters
 * @param parameters.argument Argument to convert
 * @returns {Rename|null}
 */

Rename.fromArgument = function (parameters) {

    var argumentParts = parameters.argument.split(':');

    if (argumentParts.length !== 2) {
        winston.error('Invalid rename argument: %s', parameters.argument);
        return null;
    }

    return new Rename({
        source: argumentParts[0],
        destination: argumentParts[1]
    });

};

/**
 * Translate the given relative filepath to the destination, if it matches
 * our source.
 *
 * If not, the input parameter is returned
 *
 * @param parameters
 * @param parameters.filepath relative filepath
 * @returns {String} translated filepath or original filepath
 */

Rename.prototype.translate = function (parameters) {

    if (this.source === parameters.filepath) {

        winston.info(
            'Renaming %s to %s',
            this.source,
            this.destination
        );

        return this.destination;
    }

    return parameters.filepath;

};

module.exports = Rename;
