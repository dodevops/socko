/**
 * A cartridge collector configuration
 */

var minimatch = require('minimatch'),
    path = require('path');

/**
 * Instantiate a cartridge collector configuration
 * @param parameters
 * @param parameters.pattern Cartridge collector pattern
 * @param parameters.scope Cartridge collector scope
 * @param parameters.type Type of pattern (one of CartridgeCollector.TYPE_)
 * @param parameters.path Subpath in hierarchy to search in
 * @constructor
 */

function CartridgeCollector(parameters) {

    if (parameters) {

        this.pattern = parameters.pattern;
        this.scope = parameters.scope;
        this.type = parameters.type;
        this.path = parameters.path;

    }

}

/**
 * This is a glob pattern
 * @type {number}
 */
CartridgeCollector.TYPE_GLOB = 0;

/**
 * This is a regular expression pattern
 * @type {number}
 */
CartridgeCollector.TYPE_RE = 1;

/**
 * Build a cartridge collector configuration from a documented directive.
 * Returns null on error
 *
 * @param parameters
 * @param parameters.directive The directive to parse
 * @param parameters.path Path of file, the directive is in
 * @returns {CartridgeCollector|null}
 */

CartridgeCollector.fromDirective = function (parameters) {

    var cartridgeCollector = new CartridgeCollector();

    var directiveParts = parameters.directive.split(':');

    if (directiveParts.length !== 4) {
        winston.error(
            'Invalid cartridge collector: %s.',
            parameters.directive
        );
        return null;
    }

    if (isNaN(directiveParts[1])) {

        winston.error(
            'Invalid scope specified: %s.',
            directiveParts[1]
        );

        return null;

    }

    cartridgeCollector.scope = parseInt(directiveParts[1]);

    if (directiveParts[2] === 'R') {
        cartridgeCollector.type = CartridgeCollector.TYPE_RE;

        var cartridgePattern = null;

        try {

            cartridgePattern = new RegExp(directiveParts[3]);

        } catch (e) {

            winston.error(
                'Invalid cartridge collector regexp: %s',
                directiveParts[3]
            );

        }

        cartridgeCollector.pattern = cartridgePattern;

    } else if (directiveParts[2] === 'G') {
        cartridgeCollector.type = CartridgeCollector.TYPE_GLOB;

        cartridgeCollector.pattern = directiveParts[3];
    } else {
        winston.error(
            'Unknown cartridge collector type: %s.',
            directiveParts[2]
        );
    }

    cartridgeCollector.path = parameters.path;

    return cartridgeCollector;

};

/**
 * Check, if this cartridgecollector is of the glob type
 * @returns {boolean}
 */

CartridgeCollector.prototype.isGlob = function () {
    return this.type === CartridgeCollector.TYPE_GLOB;
};

/**
 * Check, if this cartridgecollector is of the regexp type
 * @returns {boolean}
 */

CartridgeCollector.prototype.isRe = function () {
    return this.type === CartridgeCollector.TYPE_RE;
};

/**
 * Check, if a node is a cartridge and matches this cartridge collector
 *
 * @param parameters
 * @param parameters.node Node to check for
 * @returns {boolean}
 */

CartridgeCollector.prototype.matches = function (parameters) {

    var matching = false;

    if (!parameters.node.isCartridge()) {
        // This isn't a cartridge

        return false;
    }

    if (
        this.isGlob() && minimatch(parameters.node.name, this.pattern) ||
        this.isRe() && this.pattern.exec(parameters.node.name)
    ) {

        matching = true;

    }

    return matching;

};

module.exports = CartridgeCollector;
