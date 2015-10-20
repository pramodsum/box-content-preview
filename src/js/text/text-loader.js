'use strict';

import Promise from 'bluebird';
import AssetLoader from '../assets';

const VIEWERS = [
    {
        REPRESENTATION: 'original',
        EXTENSIONS: [ 'as', 'as3', 'asm', 'bat', 'c', 'cc', 'cmake', 'cpp', 'cs', 'css', 'cxx', 'diff', 'erb', 'groovy', 'h', 'haml', 'hh', 'java', 'js', 'less', 'm', 'make', 'ml', 'mm', 'php', 'pl', 'plist', 'properties', 'py', 'rb', 'rst', 'sass', 'scala', 'script', 'scm', 'sml', 'sql', 'sh', 'txt', 'vi', 'vim', 'webdoc', 'yaml' ],
        SCRIPTS: [ 'highlight.js', 'text.js' ],
        STYLESHEETS: [ 'text.css', 'github.css' ],
        CONSTRUCTOR: 'Text'
    },
    {
        REPRESENTATION: 'original',
        EXTENSIONS: [ 'md' ],
        SCRIPTS: [ 'highlight.js', 'markdown.js' ],
        STYLESHEETS: [ 'markdown.css', 'github.css' ],
        CONSTRUCTOR: 'MarkDown'
    },
    {
        REPRESENTATION: 'original',
        EXTENSIONS: [ 'csv' ],
        SCRIPTS: [ 'csv.js' ],
        STYLESHEETS: [ 'csv.css' ],
        CONSTRUCTOR: 'CSV'
    }
];

class TextLoader extends AssetLoader {

    /**
     * [constructor]
     * @returns {TextLoader}
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }
}

export default new TextLoader();