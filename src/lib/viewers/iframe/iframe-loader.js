import AssetLoader from '../../asset-loader';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
const VIEWERS = [
    {
        REPRESENTATION: 'original',
        EXTENSIONS: ['boxnote', 'boxdicom'],
        SCRIPTS: ['iframe.js'],
        STYLESHEETS: [],
        CONSTRUCTOR: 'IFrame'
    }
];

class IFrameLoader extends AssetLoader {

    /**
     * [constructor]
     * @returns {IFrameLoader} IFrameLoader instance
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }
}

export default new IFrameLoader();