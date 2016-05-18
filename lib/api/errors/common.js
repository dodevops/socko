/** Common errors */

var errorFactory = require('error-factory');

module.exports = {

    /**
     * A global system error.
     *
     * action - Action that was calling us
     * error - Error details
     */

    SystemError: errorFactory(
        'systemError',
        {
            'messageData': null,
            'message': '{{action}}: Global system error: {{error}}',
            'code': 255
        }
    )

};
