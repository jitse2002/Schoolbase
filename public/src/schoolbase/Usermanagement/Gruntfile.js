/*
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 31/10/18 15:57
 */

module.exports = function(grunt) {

    var main_js = [

        '../global/js/jquery/jquery.min.js',
        '../global/js/jquery/plugins/jstree.min.js',
        'js/tree.js',
        'js/content.js',
        'js/app.js'

    ];

    var createuser_js = [

        '../global/js/jquery/jquery.min.js',
        'js/createuser.js'

    ];

    var main_css = [

        '../global/css/main.css',
        '../global/css/jquery/style.min.css',
        'css/app.css'

    ];

    var createuser_css = [

        '../global/css/main.css',
        '../global/css/jquery/style.min.css',
        '../global/css/buttons.css',
        '../global/css/input.css',
        '../global/css/error.css',
        'css/createuser.css'

    ];

    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        cssmin: {
            main: {
                files: {
                    'dist/main.css': main_css,
                    'dist/createuser.min.css': createuser_css
                }
            }
        },

        uglify: {

            dist: {

                src: main_js,
                dest: 'dist/app.min.js'

            },

            dist: {

                src: createuser_js,
                dest: 'dist/createuser.min.js'

            }

        }

    });

    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.registerTask('default', ['uglify','cssmin']);

};