'use strict';

import AssetLoader from '../assets';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
// For example, a pdf file can be previewed both natively (majority use case) using the original
// representation but can fallback to using the pdf representation (for watermarked versions).
const VIEWERS = [
    {
        REPRESENTATION: 'original',
        EXTENSIONS: [ 'pdf' ],
        SCRIPTS: [ 'compatibility.js', 'pdf.js', 'pdf_viewer.js', 'document.js' ],
        STYLESHEETS: [ 'pdf_viewer.css', 'document.css' ],
        CONSTRUCTOR: 'Document'
    },
    {
        REPRESENTATION: 'pdf',
        EXTENSIONS: [ 'ppt', 'pptx' ],
        SCRIPTS: [ 'compatibility.js', 'pdf.js', 'pdf_viewer.js', 'presentation.js' ],
        STYLESHEETS: [ 'pdf_viewer.css', 'presentation.css' ],
        CONSTRUCTOR: 'Presentation'
    },
    {
        REPRESENTATION: 'pdf',
        EXTENSIONS: [ 'doc', 'docx', 'gdoc', 'gsheet', 'msg', 'odp', 'odt', 'ods', 'pdf', 'ppt', 'pptx', 'rtf', 'wpd', 'xhtml', 'xls', 'xlsm', 'xlsx', 'xml', 'xsd', 'xsl' ],
        SCRIPTS: [ 'compatibility.js', 'pdf.js', 'pdf_viewer.js', 'document.js' ],
        STYLESHEETS: [ 'pdf_viewer.css', 'document.css' ],
        CONSTRUCTOR: 'Document'
    }
];

class DocLoader extends AssetLoader {

    /**
     * [constructor]
     * @returns {DocLoader}
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }

    /**
     * Some initialization stuff
     *
     * @override
     * @param {Object} options
     * @returns {void}
     */
    init(options) {
        // Since the pdf worker is pretty big, lets prefetch it
        let pdfWorkerUrl = this.assetUrlFactory(options.location.hrefTemplate)('pdf.worker.js');
        this.prefetchAssets([ pdfWorkerUrl ]);
    }
}

export default new DocLoader();
