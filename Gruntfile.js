module.exports = function (grunt) {
    'use strict';
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        distName: 'Native Instruments Komplete Kontrol',
        distJs: '<%= distName%>.control.js',
        distMiniJs: '<%= distName%>.min.control.js',
        testDir: '${HOME}/Documents/Bitwig Studio/Controller Scripts/Debug',
        jshint: {
            files: [
                'src/**/*.js',
                'package.json',
                '.jshintrc'
            ],
            options: {
                jshintrc: '.jshintrc'
            }
        },
        concat: {
            files: {
                src: [
                    'node_modules/underscore/underscore.js',
                    'src/directive.js',
                    'src/transport-controller.js',
                    'src/focus-controller.js',
                    'src/device-controller.js',
                    'src/main.js'
                ],
                dest: '<%= distJs%>'
            }
        },
        uglify: {
            dist: {
                files: {
                    '<%= distMiniJs%>': '<%= distJs%>'
                }
            }
        },
        shell: {
            test: {
                command: [
                    'mkdir -p "<%= testDir%>"',
                    'cp -f "<%= distJs%>" "<%= testDir%>"',
                    'ls -l "<%= testDir%>"'
                ].join('&&')
            }
        }
    });
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-shell');
    grunt.registerTask('default', ['jshint', 'concat', 'uglify']);
    grunt.registerTask('integration-test', ['shell:test']);
};
