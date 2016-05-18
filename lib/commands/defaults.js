/**
 * Defaults for all commands
 */

var winston = require('winston');

module.exports = {
    flags: {
        loglevel: {
            type: String,
            description: 'Log-Level to use (debug, verbose, info, warn,' +
            ' error)',
            validate: function (value) {

                var loglevel = value['loglevel'].toLowerCase();

                if ([
                        'debug',
                        'verbose',
                        'info',
                        'warn',
                        'error'
                    ].indexOf(loglevel) === -1) {

                    return 'Invalid loglevel specified: ' + loglevel;

                }

                winston.level = loglevel;
                winston.default.transports.console.formatter =
                    function (options) {

                        var output = [
                            new Date().toLocaleString(),
                            options.level.toUpperCase()
                        ];

                        if (options.message) {
                            output.push(options.message);
                        }

                        if (options.meta && Object.keys(options.meta).length) {

                            output.push('\n\t' + JSON.stringify(options.meta));

                        }

                        return output.join(' ');

                    };

                return true;

            },
            required: true,
            default: 'error'
        }
    }
};
