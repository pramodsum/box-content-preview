/**
 * @fileoverview The media point thread class manages a media's point
 * annotation indicator element and dialogs for creating/deleting annotations.
 * @author spramod
 */

import autobind from 'autobind-decorator';
import AnnotationThread from '../annotation-thread';
import MediaPointDialog from './media-point-dialog';

@autobind
class MediaPointThread extends AnnotationThread {

    //--------------------------------------------------------------------------
    // Abstract Implementations
    //--------------------------------------------------------------------------

    /**
     * Shows the annotation indicator.
     *
     * @override
     * @returns {void}
     */
    show() {
    }

    /**
     * Creates the media point annotation dialog for the thread.
     *
     * @override
     * @returns {void}
     */
    createDialog() {
        this._dialog = new MediaPointDialog({
            annotatedElement: this._annotatedElement,
            annotations: this._annotations,
            location: this._location,
            locale: this._locale,
            canAnnotate: this._annotationService.canAnnotate
        });
    }
}

export default MediaPointThread;
