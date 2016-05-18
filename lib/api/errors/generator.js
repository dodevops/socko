/** Common errors */

var errorFactory = require('error-factory');

module.exports = {

    /**
     * Path does not exist
     *
     * type - type of path (input, output)
     * path - the path itself
     */

    PathDoesNotExist: errorFactory(
        'pathDoesNotExist',
        {
            'messageData': null,
            'message': '{{type}}-path {{path}} does not exist.',
            'code': 1
        }
    ),

    /**
     * A path was'nt a directory or not writable.
     *
     * path - invalid path
     */

    InvalidPath: errorFactory(
        'invalidPath',
        {
            'messageData': null,
            'message': 'Path {{path}} is invalid. It is not a directory or ' +
            'not writable',
            'code': 2
        }
    ),

    /**
     * A node was not found.
     *
     * node - invalid node
     */

    NodeNotFound: errorFactory(
        'nodeNotFound',
        {
            'messageData': null,
            'message': 'Node {{node}} not found.',
            'code': 3
        }
    ),

    /**
     * A cartridge was not found.
     *
     * cartridge - missing cartridge
     * socket - socket file
     */

    CartridgeNotFound: errorFactory(
        'cartridgeNotFound',
        {
            'messageData': null,
            'message': 'Cartridge {{cartridge}} in file {{socket}} was not' +
            ' found.',
            'code': 4
        }
    )

};
