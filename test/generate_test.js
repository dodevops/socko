/**
 * Test generate command
 */

var GeneratorApi = require('../lib/api/generator'),
    fse = require('fs-extra'),
    fs = require('fs'),
    util = require('util'),
    path = require('path'),
    merge = require('merge'),
    winston = require('winston'),
    RegExpInverse = require('regexp-inverse');

winston.level = 'info';

var files = [
    'dynamic.json',
    'dynamic.txt',
    'dynamic.xml',
    'static.txt',
    'subdirectory/static.txt',
    'collector_completely.txt',
    'collector_glob_completely.txt',
    'collector_node_and_subnode.txt',
    'collector_single_node.txt'
];

var nodeTests = {
    '_default': {
        'static.txt': [
            new RegExp('This is a static file from the root.')
        ],
        'dynamic.cpp': [
            new RegExp('Hello World!'),
            new RegExp('foo bar!')
        ],
        'dynamic.properties': [
            new RegExp('test2 = test')
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
        ],
        'subdirectory/socketinsubdir.txt': [
            new RegExp('This is the first dynamic content from the' +
                ' subdirectory in root.')
        ],
        'collector_completely.txt': [
            new RegExp('#include <iostream>'),
            new RegExp('int test()'),
            new RegExp(
                'This is the first dynamic content from the root.'
            ),
            new RegExp('This is the second dynamic content from the root.'),
            new RegExp(
                '<dynamic>This is dynamic content from the root</dynamic>'
            )
        ],
        'collector_glob_completely.txt': [
            new RegExp('#include <iostream>'),
            new RegExp('int test()'),
            new RegExp(
                'This is the first dynamic content from the root.'
            ),
            new RegExp('This is the second dynamic content from the root.'),
            new RegExp(
                '<dynamic>This is dynamic content from the root</dynamic>'
            )
        ],
        'collector_single_node.txt': [
            new RegExp(
                'This is the first dynamic content from the root.'
            ),
            new RegExp(
                'This is the second dynamic content from the root.'
            )
        ],
        'collector_node_and_subnode.txt': [
            new RegExp(
                'This is the first dynamic content from the root.'
            ),
            new RegExp(
                'This is the second dynamic content from the root.'
            )
        ]
    }
};

nodeTests['nodeA'] = merge({}, nodeTests['_default'], {
    'dynamic.txt': [
        new RegExp('This file has two cartridge slots:'),
        new RegExp('This is the first dynamic content from node A.'),
        new RegExp('This is the second dynamic content from the root.')
    ],
    'collector_completely.txt': [
        new RegExp('This is the first dynamic content from node A.'),
        new RegExp('#include <iostream>'),
        new RegExp('int test()'),
        new RegExpInverse(
            'This is the first dynamic content from the root.'
        ),
        new RegExp('This is the second dynamic content from the root.'),
        new RegExp(
            '<dynamic>This is dynamic content from the root</dynamic>'
        )
    ],
    'collector_glob_completely.txt': [
        new RegExp('This is the first dynamic content from node A.'),
        new RegExp('#include <iostream>'),
        new RegExp('int test()'),
        new RegExpInverse(
            'This is the first dynamic content from the root.'
        ),
        new RegExp('This is the second dynamic content from the root.'),
        new RegExp(
            '<dynamic>This is dynamic content from the root</dynamic>'
        )
    ],
    'collector_single_node.txt': [
        new RegExp(
            'This is the first dynamic content from node A.'
        ),
        new RegExpInverse(
            'This is the second dynamic content from the root.'
        )
    ],
    'collector_node_and_subnode.txt': [
        new RegExp(
            'This is the first dynamic content from node A.'
        ),
        new RegExp(
            'This is the second dynamic content from the root.'
        )
    ],
    'subdirectory/collector_single_node.txt': [
        new RegExp(
            'This is the first dynamic content from the subdirectory in nodeA.'
        )
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
    ],
    'collector_completely.txt': [
        new RegExp('This is the second dynamic content from nodeB.'),
        new RegExp('#include <iostream>'),
        new RegExp('int test()'),
        new RegExp(
            'This is the first dynamic content from the root.'
        ),
        new RegExpInverse(
            'This is the second dynamic content from the root.'
        ),
        new RegExp(
            '<dynamic>This is dynamic content from the root</dynamic>'
        )
    ],
    'collector_glob_completely.txt': [
        new RegExp('This is the second dynamic content from nodeB.'),
        new RegExp('#include <iostream>'),
        new RegExp('int test()'),
        new RegExpInverse(
            'This is the second dynamic content from the root.'
        ),
        new RegExp(
            '<dynamic>This is dynamic content from the root</dynamic>'
        )
    ],
    'collector_single_node.txt': [
        new RegExpInverse(
            'This is the first dynamic content from the root.'
        ),
        new RegExp(
            'This is the second dynamic content from nodeB.'
        )
    ],
    'collector_node_and_subnode.txt': [
        new RegExp(
            'This is the first dynamic content from the root.'
        ),
        new RegExp(
            'This is the second dynamic content from nodeB.'
        )
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

    ],
    'collector_completely.txt': [
        new RegExp('This is the second dynamic content from nodeB.'),
        new RegExp('#include <iostream>'),
        new RegExp('int test()'),
        new RegExp(
            'This is the first dynamic content from the root.'
        ),
        new RegExpInverse(
            'This is the second dynamic content from the root.'
        ),
        new RegExp(
            '<dynamic>This is dynamic content from the root</dynamic>'
        )
    ],
    'collector_glob_completely.txt': [
        new RegExp('This is the second dynamic content from nodeB.'),
        new RegExp('#include <iostream>'),
        new RegExp('int test()'),
        new RegExpInverse(
            'This is the second dynamic content from the root.'
        ),
        new RegExp(
            '<dynamic>This is dynamic content from the root</dynamic>'
        )
    ],
    'collector_single_node.txt': [
        new RegExpInverse(
            'This is the second dynamic content from the root.'
        )
    ],
    'collector_node_and_subnode.txt': [
        new RegExpInverse(
            'This is the first dynamic content from the root.'
        ),
        new RegExpInverse(
            'This is the second dynamic content from the root.'
        )
    ]
});

nodeTests['nodeAIgnore'] = merge({}, nodeTests['_default'], {
    'dynamic.txt': [
        new RegExp('This file has two cartridge slots:'),
        new RegExp('This is the first dynamic content from node A.'),
        new RegExp('This is the second dynamic content from the root.')
    ],
    'collector_completely.txt': [
        new RegExpInverse('This is the first dynamic content from node A.'),
        new RegExp('#include <iostream>'),
        new RegExp('int test()'),
        new RegExpInverse(
            'This is the first dynamic content from the root.'
        ),
        new RegExp('This is the second dynamic content from the root.'),
        new RegExp(
            '<dynamic>This is dynamic content from the root</dynamic>'
        )
    ],
    'collector_glob_completely.txt': [
        new RegExpInverse('This is the first dynamic content from node A.'),
        new RegExp('#include <iostream>'),
        new RegExp('int test()'),
        new RegExpInverse(
            'This is the first dynamic content from the root.'
        ),
        new RegExp('This is the second dynamic content from the root.'),
        new RegExp(
            '<dynamic>This is dynamic content from the root</dynamic>'
        )
    ],
    'collector_single_node.txt': [
        new RegExpInverse(
            'This is the first dynamic content from node A.'
        ),
        new RegExpInverse(
            'This is the second dynamic content from the root.'
        )
    ],
    'collector_node_and_subnode.txt': [
        new RegExpInverse(
            'This is the first dynamic content from node A.'
        ),
        new RegExp(
            'This is the second dynamic content from the root.'
        )
    ]
});

nodeTests['nodeBnodeIgnore'] = merge({}, nodeTests['_default'], {
    'static.txt': [
        new RegExp('This is a static file from node B.')
    ],
    'dynamic.txt': [
        new RegExp('This file has two cartridge slots:'),
        new RegExp('This is the first dynamic content from the root.'),
        new RegExp('This is the second dynamic content from nodeB.')
    ],
    'collector_completely.txt': [
        new RegExpInverse('This is the second dynamic content from nodeB.'),
        new RegExp('#include <iostream>'),
        new RegExp('int test()'),
        new RegExp(
            'This is the first dynamic content from the root.'
        ),
        new RegExp(
            'This is the second dynamic content from the root.'
        ),
        new RegExp(
            '<dynamic>This is dynamic content from the root</dynamic>'
        )
    ],
    'collector_glob_completely.txt': [
        new RegExpInverse('This is the second dynamic content from nodeB.'),
        new RegExp('#include <iostream>'),
        new RegExp('int test()'),
        new RegExp(
            'This is the second dynamic content from the root.'
        ),
        new RegExp(
            '<dynamic>This is dynamic content from the root</dynamic>'
        )
    ],
    'collector_single_node.txt': [
        new RegExpInverse(
            'This is the first dynamic content from the root.'
        ),
        new RegExpInverse(
            'This is the second dynamic content from nodeB.'
        )
    ],
    'collector_node_and_subnode.txt': [
        new RegExp(
            'This is the first dynamic content from the root.'
        ),
        new RegExpInverse(
            'This is the second dynamic content from nodeB.'
        )
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

                    if (!contentObject[file][a].test(fileContent)) {

                        if (contentObject[file][a] instanceof RegExpInverse) {

                            winston.error(
                                'Content of file %s unexpectedly matched' +
                                ' regexp %s.\n%s',
                                file,
                                contentObject[file][a],
                                fileContent
                            );

                        } else {
                            winston.error(
                                "Content of file %s didn't match" +
                                ' regexp %s.\n%s',
                                file,
                                contentObject[file][a],
                                fileContent
                            );
                        }

                        return false;

                    }

                }

            }
        }
    }

    return true;

}

/**
 * Nodeunit-Tests, checking if the given files exist
 *
 * @param test NodeUnit test object
 * @param files Array of files
 */

function filesShouldExist(test, files) {

    for (var i = 0; i < files.length; i++) {

        var file = files[i];

        test.doesNotThrow(
            function () {
                fs.statSync(file);
            },
            Error,
            util.format('File %s does not exist.', file)
        );

    }

}

/**
 * Nodeunit-Tests, checking if the given files not exists
 *
 * @param test NodeUnit test object
 * @param files Array of files
 */

function filesShouldNotExist(test, files) {

    for (var i = 0; i < files.length; i++) {

        var file = files[i];

        test.throws(
            function () {
                fs.statSync(file);
            },
            Error,
            util.format('File %s does exist unexpectedly.', file)
        );

    }

}

module.exports = {

    setUp: function (callback) {

        winston.info('Clearing temporary test directory');

        fse.emptyDirSync('testtmp');
        callback();
    },

    testNodeA: function (test) {

        var generatorApi = new GeneratorApi({
            inputPath: 'sample'
        });

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

        var generatorApi = new GeneratorApi({
            inputPath: 'sample'
        });

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

        var generatorApi = new GeneratorApi({
            inputPath: 'sample'
        });

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

    },

    testIgnoreA: function (test) {

        var generatorApi = new GeneratorApi({
            inputPath: 'sample',
            ignores: ['dynamic_txt_content1']
        });

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

                    var filesOk = checkFilesMatch(nodeTests.nodeAIgnore);

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

    testNodeIgnoreB: function (test) {

        var generatorApi = new GeneratorApi({
            inputPath: 'sample',
            ignores: ['nodeB:dynamic_txt_content2']
        });

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

                    var filesOk = checkFilesMatch(nodeTests.nodeBnodeIgnore);

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

    testDirectoryInclude: function (test) {

        var generatorApi = new GeneratorApi({
            inputPath: 'sample'
        });

        winston.info('Generating nodeB:nodeB1');

        test.expect(10);

        generatorApi.generate(
            'nodeB:nodeB1',
            'testtmp',
            function (error) {
                test.ifError(
                    error,
                    'Generator returned an error.'
                );

                if (!error) {

                    filesShouldExist(
                        test,
                        [
                            'testtmp/subdirectory/includesample/test.txt',
                            'testtmp/subdirectory/includesample/test2.txt',
                            'testtmp/subdirectory/includesample/test3.txt'
                        ]
                    );

                    filesShouldExist(
                        test,
                        [
                            'testtmp/subdirectory/includesample2/test.txt',
                        ]
                    );

                    filesShouldNotExist(
                        test,
                        [
                            'testtmp/subdirectory/includesample2/test2.txt',
                            'testtmp/subdirectory/includesample2/test3.txt'
                        ]
                    );

                    filesShouldExist(
                        test,
                        [
                            'testtmp/subdirectory/includesample3/test.txt',
                            'testtmp/subdirectory/includesample3/test2.txt'
                        ]
                    );

                    filesShouldNotExist(
                        test,
                        [
                            'testtmp/subdirectory/includesample3/test3.txt',
                        ]
                    );

                }

                test.done();
            }
        );

    },

    testDirectoryIncludeMissingDirectory: function (test) {

        var generatorApi = new GeneratorApi({
            inputPath: 'sample'
        });

        winston.info('Generating nodeA:nodeA1');

        test.expect(3);

        generatorApi.generate(
            'nodeA:nodeA1',
            'testtmp',
            function (error) {
                test.ifError(
                    error,
                    'Generator returned an error.'
                );

                if (!error) {

                    filesShouldExist(
                        test,
                        [
                            'testtmp/subdirectory/includesample/test2.txt',
                            'testtmp/subdirectory/includesample/test3.txt'
                        ]
                    );

                }

                test.done();
            }
        );

    },

    testRenames: function (test) {

        var generatorApi = new GeneratorApi({
            inputPath: 'sample',
            renames: [
                'dynamic.txt:dynamic.txt.test',
                'subdirectory/static.txt:subdirectory/static.txt.test'
            ]
        });

        winston.info('Generating nodeA:nodeA1');

        test.expect(5);

        generatorApi.generate(
            'nodeA:nodeA1',
            'testtmp',
            function (error) {
                test.ifError(
                    error,
                    'Generator returned an error.'
                );

                if (!error) {

                    filesShouldExist(
                        test,
                        [
                            'testtmp/subdirectory/static.txt.test',
                            'testtmp/dynamic.txt.test'
                        ]
                    );

                    filesShouldNotExist(
                        test,
                        [
                            'testtmp/subdirectory/static.txt',
                            'testtmp/dynamic.txt'
                        ]
                    );

                }

                test.done();
            }
        );

    },

    testSkipIdenticalSockets: function (test) {

        fse.removeSync('testtmp');

        var generatorApi = new GeneratorApi({
            inputPath: 'sample',
            skipIdenticalSockets: true
        });

        test.expect(3);

        generatorApi.generate(
            'nodeA:nodeA1',
            'testtmp',
            function (error) {
                test.ifError(
                    error,
                    'Generator returned an error.'
                );

                var statBefore = fs.statSync('testtmp/dynamic.xml');

                setTimeout(
                    function () {
                        generatorApi.generate(
                            'nodeA:nodeA1',
                            'testtmp',
                            function (error) {
                                test.ifError(
                                    error,
                                    'Generator returned an error.'
                                );

                                var statAfter = fs.statSync(
                                    'testtmp/dynamic.xml'
                                );

                                test.equal(
                                    statBefore.mtime.getTime(),
                                    statAfter.mtime.getTime(),
                                    'File was recreated!'
                                );

                                test.done();
                            }
                        );
                    },
                    2000
                );
            }
        );
    },

    testNoSkipIdenticalSockets: function (test) {

        fse.removeSync('testtmp');

        var generatorApi = new GeneratorApi({
            inputPath: 'sample',
            skipIdenticalSockets: false
        });

        test.expect(3);

        generatorApi.generate(
            'nodeA:nodeA1',
            'testtmp',
            function (error) {
                test.ifError(
                    error,
                    'Generator returned an error.'
                );

                var statBefore = fs.statSync('testtmp/dynamic.xml');

                setTimeout(
                    function () {
                        generatorApi.generate(
                            'nodeA:nodeA1',
                            'testtmp',
                            function (error) {
                                test.ifError(
                                    error,
                                    'Generator returned an error.'
                                );

                                var statAfter = fs.statSync(
                                    'testtmp/dynamic.xml'
                                );

                                test.notEqual(
                                    statBefore.mtime.getTime(),
                                    statAfter.mtime.getTime(),
                                    'File was not recreated!'
                                );

                                test.done();
                            }
                        );
                    },
                    2000
                );
            }
        );
    }

};
