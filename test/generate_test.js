/**
 * Test generate command
 */

var GeneratorApi = require('../lib/api/generator'),
    fse = require('fs-extra'),
    fs = require('fs'),
    path = require('path'),
    merge = require('merge'),
    winston = require('winston');

winston.level = 'info';

var files = [
    'dynamic.json',
    'dynamic.txt',
    'dynamic.xml',
    'static.txt',
    'subdirectory/static.txt'
];

var nodeTests = {
    '_default': {
        'static.txt': [
            new RegExp('This is a static file from the root.')
        ],
        'dynamic.json': [
            new RegExp('"static": "this is static",'),
            new RegExp('"dynamic": "This is dynamic content from the root!"'),
        ],
        'dynamic.txt': [
            new RegExp('This file has two cartridge slots:'),
            new RegExp('This is the first dynamic content from the root.'),
            new RegExp('This is the second dynamic content from the root.')
        ],
        'dynamic.xml': [
            new RegExp('<static>This is a static node</static>'),
            new RegExp('<dynamic>'),
            new RegExp('</dynamic>'),
            new RegExp(
                '<dynamic>This is dynamic content from the root</dynamic>'
            )
        ],
        'subdirectory/static.txt': [
            new RegExp('This is the static.txt in subdirectory from root.')

        ]
    }
};

nodeTests['nodeA'] = merge({}, nodeTests['_default'], {
    'dynamic.txt': [
        new RegExp('This file has two cartridge slots:'),
        new RegExp('This is the first dynamic content from node A.'),
        new RegExp('This is the second dynamic content from the root.')
    ]
});

nodeTests['nodeB'] = merge({}, nodeTests['_default'], {
    'static.txt': [
        new RegExp('This is a static file from node B.')
    ],
    'dynamic.txt': [
        new RegExp('This file has two cartridge slots:'),
        new RegExp('This is the first dynamic content from the root.'),
        new RegExp('This is the second dynamic content from nodeB.')
    ]
});

nodeTests['nodeBB1'] = merge({}, nodeTests['_default'], {
    'static.txt': [
        new RegExp('This is a static file from node B1.')
    ],
    'dynamic.txt': [
        new RegExp('This file has two cartridge slots:'),
        new RegExp('This is the first dynamic content from the root.'),
        new RegExp('This is the second dynamic content from nodeB.')
    ],
    'subdirectory/static.txt': [
        new RegExp('This is the static.txt in subdirectory from NodeB1.')

    ]
});

/**
 * Check, if all files exist and optional RegExps match
 *
 * @param contentObject an object holding an array of RegExp objects for
 * different file names
 * @returns {boolean}
 */

function checkFilesMatch(contentObject) {

    for (var i = 0; i < files.length; i++) {

        var file = files[i];

        if (!fs.existsSync(path.join('testtmp', file))) {
            winston.error('Missing file %s', file);
            return false;
        } else {
            if (contentObject.hasOwnProperty(file)) {

                var fileContent = fs.readFileSync(
                    path.join('testtmp', file)
                ).toString();

                for (var a = 0; a < contentObject[file].length; a++) {

                    if (!contentObject[file][a].exec(fileContent)) {

                        winston.error(
                            "Content of file didn't match" +
                            ' regexp %s.\n%s',
                            contentObject[file][a],
                            fileContent
                        );

                        return false;

                    }

                }

            }
        }
    }

    return true;

}

module.exports = {

    setUp: function (callback) {

        winston.info('Clearing temporary test directory');

        fse.emptyDirSync('testtmp');
        callback();
    },

    testNodeA: function (test) {

        var generatorApi = new GeneratorApi('sample');

        winston.info('Generating nodeA');

        test.expect(2);

        generatorApi.generate(
            'nodeA',
            'testtmp',
            function (error) {
                test.ifError(
                    error,
                    'Generator returned an error.'
                );

                if (!error) {

                    var filesOk = checkFilesMatch(nodeTests.nodeA);

                    test.equal(
                        filesOk,
                        true,
                        "Files were missing or their content didn't match."
                    );
                }

                test.done();
            }
        );

    },

    testNodeB: function (test) {

        var generatorApi = new GeneratorApi('sample');

        winston.info('Generating nodeB');

        test.expect(2);

        generatorApi.generate(
            'nodeB',
            'testtmp',
            function (error) {
                test.ifError(
                    error,
                    'Generator returned an error.'
                );

                if (!error) {

                    var filesOk = checkFilesMatch(nodeTests.nodeB);

                    test.equal(
                        filesOk,
                        true,
                        "Files were missing or their content didn't match."
                    );
                }

                test.done();
            }
        );

    },

    testNodeBB1: function (test) {

        var generatorApi = new GeneratorApi('sample');

        winston.info('Generating nodeB:nodeB1');

        test.expect(2);

        generatorApi.generate(
            'nodeB:nodeB1',
            'testtmp',
            function (error) {
                test.ifError(
                    error,
                    'Generator returned an error.'
                );

                if (!error) {

                    var filesOk = checkFilesMatch(nodeTests.nodeBB1);

                    test.equal(
                        filesOk,
                        true,
                        "Files were missing or their content didn't match."
                    );
                }

                test.done();
            }
        );

    }

};
