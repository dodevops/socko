module.exports = function (grunt) {

    // Project configuration.
    //noinspection JSUnusedGlobalSymbols
    grunt.initConfig(
        {
            // Task configuration.
            eslint: {
                gruntfile: ['Gruntfile.js'],
                lib: ['lib/**/*.js'],
                test: ['test/**/*_test.js'],
                options: {
                    configFile: '.eslintrc'
                }
            },
            nodeunit: {
                files: ['test/**/*_test.js'],
                options: {
                    reporter: 'lcov'
                }
            },
        }
    );

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-nodeunit');
    grunt.loadNpmTasks('gruntify-eslint');

    // Test task
    grunt.registerTask(
        'test',
        [
            'eslint',
            'nodeunit',
        ]
    );

};
