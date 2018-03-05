module.exports = function (grunt) {

  grunt.initConfig({
    tslint: {
      options: {
        configuration: 'tslint.json'
      },
      files: {
        src: [
          'index.ts',
          'lib/**/*.ts',
          'test/**/*.ts',
          '!index.d.ts',
          '!lib/**/*.d.ts',
          '!test/**/*.d.ts'
        ]
      }
    },
    clean: {
      coverage: ['test/coverage']
    },
    ts: {
      default: {
        tsconfig: true
      }
    },
    shell: {
      baseman: {
        command: "nyc baseman run"
      }
    },
    coveralls: {
      default: {
        src: 'test/coverage/lcov.info'
      }
    }
  })

  grunt.loadNpmTasks('grunt-ts')
  grunt.loadNpmTasks('grunt-tslint')
  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadNpmTasks('grunt-shell')
  grunt.loadNpmTasks('grunt-coveralls')

  grunt.registerTask(
    'build',
    [
      'tslint',
      'ts'
    ]
  )

  grunt.registerTask(
    'default',
    [
      'build'
    ]
  )

  grunt.registerTask(
    'test',
    [
      'build',
      'clean:coverage',
      'shell:baseman'
    ]
  )

  grunt.registerTask(
    'release',
    [
      'test'
    ]
  )

}