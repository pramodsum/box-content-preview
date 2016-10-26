/**
 * @fileoverview The media point dialog class manages a media annotation
 * dialog's HTML, event handlers, and events.
 * @author spramod
 */

import AnnotationDialog from '../annotation-dialog';
import autobind from 'autobind-decorator';

@autobind
class MediaPointDialog extends AnnotationDialog {

    //--------------------------------------------------------------------------
    // Abstract Implementations
    //--------------------------------------------------------------------------

    /**
     * Positions the dialog.
     *
     * @override
     * @returns {void}
     */
    position() {
    }
}

export default MediaPointDialog;
