/**
 * A cartridge insertion point in a socket file
 */

var winston = require('winston'),
    CartridgeCollector = require('./cartridgeCollector'),
    path = require('path');

/**
 * Create a new cartridge insertion point
 *
 * @param parameters
 * @constructor
 */

function Socket(parameters) {

    if (parameters) {

        this.name = parameters.name;
        this.path = parameters.path;
        this.line = parameters.line;
        this.directiveType = parameters.directiveType;
        this.cartridges = null;
    }

}

/**
 * Fill the cartridges for this socket based on a hierarchy
 *
 * @param parameters
 * @param parameters.hierarchy Hierarchy to work on
 * @param parameters.node Node to start from
 */

Socket.prototype.fillCartridges = function (parameters) {

    if (this.name.startsWith('COLLECT:')) {

        winston.debug('We have a cartridge collector here. Searching for' +
            ' cartridges');

        var cartridgeCollector = CartridgeCollector.fromDirective({
            directive: this.name,
            path: this.path
        });

        if (cartridgeCollector) {
            this.cartridges =
                parameters.hierarchy.collectCartridges({
                    configuration: cartridgeCollector,
                    node: parameters.node
                });
        } else {
            winston.error('Skipping file');
        }

    } else {

        var cartridgeNode = parameters.hierarchy.getFileNode({
            node: parameters.node,
            filePath: path.join(this.path, this.name + '.cartridge')
        });

        if (cartridgeNode === null) {

            winston.error('Cartridge node not found.');

        } else {

            this.cartridges = [cartridgeNode];

        }

    }

};

module.exports = Socket;
