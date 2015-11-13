'use strict';

import '../../css/doc/presentation.css';
import autobind from 'autobind-decorator';
import DocBase from './doc-base';

let Box = global.Box || {};
let document = global.document;

/**
 * Presentation viewer for PowerPoint presentations
 *
 * @class
 * @extends DocBase
 */
@autobind
class Presentation extends DocBase {

    /**
     * [constructor]
     * @param {string|HTMLElement} container node
     * @param {object} [options] some options
     * @returns {Presentation}
     */
    constructor(container, options) {
        super(container, options);

        // Document specific class
        this.docEl.classList.add('box-preview-doc-presentation');
    }

    /**
     * Adds event listeners for presentation controls
     *
     * @private
     * @returns {void}
     */
    addEventListenersForDocControls() {
        super.addEventListenersForDocControls();

        this.controls.add(__('previous_page'), this.previousPage, 'box-preview-presentation-previous-page-icon');
        this.controls.add(__('next_page'), this.nextPage, 'box-preview-presentation-next-page-icon');

        this.controls.add(__('rotate_left'), () => {
            this.rotateLeft();
        }, 'box-preview-doc-rotate-left-icon');

        this.controls.add(__('fullscreen'), this.toggleFullscreen, 'box-preview-doc-expand-icon');
    }

    /**
     * Adds event listeners for document element
     *
     * @private
     * @returns {void}
     */
    addEventListenersForDocElement() {
        super.addEventListenersForDocElement();

        this.docEl.addEventListener('mousewheel', this.mousewheelHandler);
    }

    /**
     * Mousewheel handler, scroll presentations by page.
     *
     * @param {Event} event
     * @private
     * @returns {void}
     */
    mousewheelHandler(event) {
        // The mod 120 filters out track pad events. Mac inertia scrolling
        // fires lots of scroll events so we've chosen to just disable it
        let currentWheelDelta = event.wheelDelta || event.detail,
            isFromMouseWheel = (currentWheelDelta % 120 === 0);

        if (isFromMouseWheel) {
            // Wheeldata is used for IE8 support
            // http://www.javascriptkit.com/javatutors/onmousewheel.shtml
            if (currentWheelDelta < 0) {
                this.nextPage();
            } else {
                this.previousPage();
            }
        }
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Presentation = Presentation;
global.Box = Box;
export default Presentation;
