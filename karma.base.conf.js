module.exports = {

    basePath: '',

    frameworks: [ 'mocha', 'sinon-stub-promise', 'chai-sinon', 'chai-as-promised', 'chai', 'sinon', 'fixture', 'source-map-support' ],

    files: [
        'src/js/**/*-test.js',
        'src/js/**/*-test.html',
        'src/third-party/**/*.js'
    ],

    exclude: [],

    preprocessors: {
        'src/js/**/*-test.js': [ 'webpack', 'sourcemap' ],
        'src/js/**/*-test.html': [ 'html2js' ]
    },

    reporters: [ 'mocha', 'coverage', 'threshold' ],

    webpackMiddleware: {
        noInfo: true
    },

    coverageReporter: {
        type: 'html',
        dir: 'reports/coverage',
    },

    thresholdReporter: {
        statements: 1,
        branches: 1,
        functions: 1,
        lines: 1
    },

    port: 9876,

    colors: true,

    autoWatch: false,

    browsers: [ 'Chrome_without_security' ],

    customLaunchers: {
        Chrome_without_security: {
            base: 'Chrome',
            flags: ['--disable-web-security']
        }
    },

    browserNoActivityTimeout: 100000,

    captureConsole: true,

    singleRun: true
};