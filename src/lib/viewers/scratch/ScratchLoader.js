import AssetLoader from '../AssetLoader';
import ScratchViewer from './ScratchViewer';
import { ORIGINAL_REP_NAME } from '../../constants';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
// For example, a gif file can be previewed both natively (majority use case) using the original
// representation but can fallback to using the png representation (for watermarked versions).
const VIEWERS = [
    {
        NAME: 'Scratch',
        CONSTRUCTOR: ScratchViewer,
        REP: ORIGINAL_REP_NAME,
        EXT: ['scratch', 'ai', 'bmp', 'dcm', 'eps', 'gif', 'png', 'ps', 'psd', 'svs', 'tga', 'tif', 'tiff', 'jpg', 'jpeg']
    }
];

class ScratchLoader extends AssetLoader {
    /**
     * [constructor]
     * @return {ScratchLoader} ScratchLoader instance
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }

    /**
     * Chooses a representation. Assumes that there will be only
     * one specific representation.
     *
     * @param {Object} file - Box file
     * @param {Object} viewer - Chosen Preview viewer
     * @return {Object} The representation to load
     */
    determineRepresentation(file, viewer) {
        return file.representations.entries.find((entry) => {
            return viewer.REP === entry.representation;
        });
    }
}

export default new ScratchLoader();
