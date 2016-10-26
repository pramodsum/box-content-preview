/**
 * @fileoverview The media point thread class manages a media's point
 * annotation indicator element and dialogs for creating/deleting annotations.
 * @author spramod
 */

import autobind from 'autobind-decorator';
import AnnotationThread from '../annotation-thread';
import MediaPointDialog from './media-point-dialog';
import * as annotatorUtil from '../annotator-util';
import * as mediaAnnotatorUtil from './media-annotator-util';
import * as constants from '../annotation-constants';

const POINT_ANNOTATION_ICON_HEIGHT = 31;
const POINT_ANNOTATION_ICON_DOT_HEIGHT = 8;
const POINT_ANNOTATION_ICON_WIDTH = 24;

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
        const [browserX, browserY] = mediaAnnotatorUtil.getBrowserCoordinatesFromLocation(this._location, this._annotatedElement);

        // Position and append to media
        this._element.style.left = `${browserX - (POINT_ANNOTATION_ICON_WIDTH / 2)}px`;
        this._element.style.top = `${browserY - POINT_ANNOTATION_ICON_HEIGHT + POINT_ANNOTATION_ICON_DOT_HEIGHT}px`;
        this._annotatedElement.appendChild(this._element);

        annotatorUtil.showElement(this._element);

        if (this._state === constants.ANNOTATION_STATE_PENDING) {
            this.showDialog();
        }
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
