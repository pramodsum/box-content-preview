require('es6-promise').polyfill();

var path = require('path');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var I18nPlugin = require('i18n-webpack-plugin');
var RsyncPlugin = require('./build/RsyncPlugin');

var js = path.join(__dirname, 'src/js');
var i18n = path.join(__dirname, 'src/i18n/json');
var css = path.join(__dirname, 'src/css');
var img = path.join(__dirname, 'src/img');
var test = path.join(__dirname, 'test');
var thirdParty = path.join(__dirname, 'src/third-party');

var languages = {
    'en-AU': require(i18n + '/en-AU.json'),
    'en-CA': require(i18n + '/en-CA.json'),
    'en-GB': require(i18n + '/en-GB.json'),
    'en-US': require(i18n + '/en-US.json'),
    'da-DK': require(i18n + '/da-DK.json'),
    'de-DE': require(i18n + '/de-DE.json'),
    'es-ES': require(i18n + '/es-ES.json'),
    'fi-FI': require(i18n + '/fi-FI.json'),
    'fr-CA': require(i18n + '/fr-CA.json'),
    'fr-FR': require(i18n + '/fr-FR.json'),
    'it-IT': require(i18n + '/it-IT.json'),
    'ja-JP': require(i18n + '/ja-JP.json'),
    'ko-KR': require(i18n + '/ko-KR.json'),
    'nb-NO': require(i18n + '/nb-NO.json'),
    'nl-NL': require(i18n + '/nl-NL.json'),
    'pl-PL': require(i18n + '/pl-PL.json'),
    'pt-BR': require(i18n + '/pt-BR.json'),
    'ru-RU': require(i18n + '/ru-RU.json'),
    'sv-SE': require(i18n + '/sv-SE.json'),
    'tr-TR': require(i18n + '/tr-TR.json'),
    'zh-CN': require(i18n + '/zh-CN.json'),
    'zh-TW': require(i18n + '/zh-TW.json')
};

// Check if webpack was run with a production flag that signifies a release build
var isRelease = process.env.BUILD_PROD === '1';

// If this is not a release build don't bother building for multiple locales
var languagesArray = isRelease ? Object.keys(languages) : [ 'en-US' ];

// Get the version from package.json
var version = isRelease ? require('./package.json').version : 'dev';


module.exports = languagesArray.map(function(language, index) {

    // Output path
    var dist = path.join(__dirname, 'dist', version, language);

    // Static output path
    var static = path.join(__dirname, 'dist', version);

    // List of plugins used for building our bundles
    var plugins = [
        new webpack.NoErrorsPlugin(),
        new ExtractTextPlugin('[Name].css', { allChunks: true }),
        new I18nPlugin(languages[language]),
        new RsyncPlugin(thirdParty, static)
    ];

    // If this is not a release build, add the Rsync plugin for local
    // development where copying to dev VM is needed.
    if (!isRelease) {
        plugins.push(new RsyncPlugin('dist/.', '${USER}@${USER}.dev.box.net:/box/www/assets/content-experience'));
    }

    return {
        entry: {
            preview: js + '/preview.js',
            image: js + '/image/image.js',
            'multi-image': js + '/image/multi-image.js',
            swf: js + '/swf/swf.js',
            text: js + '/text/text.js',
            csv: js + '/text/csv.js',
            'document': js + '/doc/document.js',
            presentation: js + '/doc/presentation.js',
            markdown: js + '/text/markdown.js',
            mp4: js + '/media/mp4.js',
            mp3: js + '/media/mp3.js',
            dash: [js + '/media/dash.js'],
            error: js + '/error/error.js',
            box3d: [js + '/box3d/box3d.js'],
            model3d: js + '/box3d/model3d/model3d.js',
            image360: js + '/box3d/image360/image360.js',
            video360: js + '/box3d/video360/video360.js'
        },
        output: {
            path: dist,
            filename: '[Name].js'
        },
        module: {
            loaders: [
                {
                    test: js,
                    loader: 'babel-loader'
                },

                {
                    test: css,
                    loader: ExtractTextPlugin.extract('style-loader', 'css-loader')
                },

                {
                    test: img,
                    loader: 'url-loader?limit=1'
                }
            ]
        },
        plugins: plugins,
        stats: {
            colors: true
        },
        devtool: isRelease ? 'source-map' : 'inline-source-map'
    };
});
