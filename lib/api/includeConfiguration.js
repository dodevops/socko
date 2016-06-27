/**
 * A directory include configuration
 */

function IncludeConfiguration(parameters) {
    this.scope = parameters.scope;
    this.pattern = parameters.pattern;
}

/**
 * Is there still scope left?
 * @returns {boolean}
 */

IncludeConfiguration.prototype.scopeLeft = function () {
    return this.scope === -1 || this.scope > 0;
};

module.exports = IncludeConfiguration;
