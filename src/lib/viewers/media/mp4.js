import './mp4.scss';
import autobind from 'autobind-decorator';
import VideoBase from './video-base';

const CSS_CLASS_MP4 = 'box-preview-media-mp4';

const Box = global.Box || {};

@autobind
class MP4 extends VideoBase {

    /**
     * [constructor]
     * @param {String|HTMLElement} container The container DOM node
     * @param {Object} [options] some options
     * @returns {MP4} MP4 instance
     */
    constructor(container, options) {
        super(container, options);

        // mp4 specific class
        this.wrapperEl.classList.add(CSS_CLASS_MP4);
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.MP4 = MP4;
global.Box = Box;
export default MP4;