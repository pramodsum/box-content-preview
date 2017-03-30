import autobind from 'autobind-decorator';
import Annotator from '../Annotator';
import ImagePointThread from './ImagePointThread';
import * as annotatorUtil from '../annotatorUtil';
import * as imageAnnotatorUtil from './imageAnnotatorUtil';
import { SELECTOR_BOX_PREVIEW_BTN_ANNOTATE } from '../../constants';

@autobind
class ImageAnnotator extends Annotator {

    //--------------------------------------------------------------------------
    // Abstract Implementations
    //--------------------------------------------------------------------------

    /**
     * Determines the annotated element in the viewer
     *
     * @param {HTMLElement} containerEl - Container element for the viewer
     * @return {void}
     */
    getAnnotatedEl(containerEl) {
        this._annotatedElement = containerEl.querySelector('.bp-image');
    }

    /**
     * Returns an annotation location on an image from the DOM event or null
     * if no correct annotation location can be inferred from the event. For
     * point annotations, we return the (x, y) coordinates for the point
     * with the top left corner of the image as the origin.
     *
     * @override
     * @param {Event} event - DOM event
     * @return {Object|null} Location object
     */
    getLocationFromEvent(event) {
        let location = null;

        // Get image tag inside viewer
        const imageEl = this._annotatedElement.querySelector('img');
        if (!imageEl) {
            return location;
        }

        // If click is inside an annotation dialog, ignore
        const dataType = annotatorUtil.findClosestDataType(this._annotatedElement);
        if (dataType === 'annotation-dialog' || dataType === 'annotation-indicator') {
            return location;
        }

        // Location based only on image position
        const imageDimensions = imageEl.getBoundingClientRect();
        let [x, y] = [(event.clientX - imageDimensions.left), (event.clientY - imageDimensions.top)];

        // If click isn't in image area, ignore
        if (event.clientX > imageDimensions.right || event.clientX < imageDimensions.left ||
            event.clientY > imageDimensions.bottom || event.clientY < imageDimensions.top) {
            return location;
        }

        // Scale location coordinates according to natural image size
        const scale = annotatorUtil.getScale(this._annotatedElement);
        const rotation = Number(imageEl.getAttribute('data-rotation-angle'));
        [x, y] = imageAnnotatorUtil.getLocationWithoutRotation(x / scale, y / scale, rotation, imageDimensions, scale);

        // We save the dimensions of the annotated element so we can
        // compare to the element being rendered on and scale as appropriate
        const dimensions = {
            x: imageDimensions.width / scale,
            y: imageDimensions.height / scale
        };

        location = { x, y, imageEl, dimensions };

        return location;
    }

    /**
     * Creates the proper type of thread, adds it to in-memory map, and returns
     * it.
     *
     * @override
     * @param {Annotation[]} annotations - Annotations in thread
     * @param {Object} location - Location object
     * @param {string} [type] - Optional annotation type
     * @return {AnnotationThread} Created annotation thread
     */
    createAnnotationThread(annotations, location, type) {
        let thread;
        const threadParams = {
            annotatedElement: this._annotatedElement,
            annotations,
            annotationService: this._annotationService,
            fileVersionID: this._fileVersionID,
            locale: this._locale,
            location,
            type
        };

        if (!annotatorUtil.validateThreadParams(threadParams)) {
            this.handleValidationError();
            return thread;
        }

        // Set existing thread ID if created with annotations
        if (annotations.length > 0) {
            threadParams.threadID = annotations[0].threadID;
        }

        thread = new ImagePointThread(threadParams);
        this.addThreadToMap(thread);
        return thread;
    }

    /**
     * Hides all annotations on the image. Also hides button in header that
     * enables point annotation mode
     *
     * @return {void}
     */
    hideAllAnnotations() {
        const annotateButton = document.querySelector(SELECTOR_BOX_PREVIEW_BTN_ANNOTATE);
        const annotations = this._annotatedElement.getElementsByClassName('bp-point-annotation-btn');
        for (let i = 0; i < annotations.length; i++) {
            annotatorUtil.hideElement(annotations[i]);
        }
        annotatorUtil.hideElement(annotateButton);
    }

    /**
     * Shows all annotations on the image. Shows button in header that
     * enables point annotation mode
     *
     * @return {void}
     */
    showAllAnnotations() {
        const annotateButton = document.querySelector(SELECTOR_BOX_PREVIEW_BTN_ANNOTATE);
        const annotations = this._annotatedElement.getElementsByClassName('bp-point-annotation-btn');
        for (let i = 0; i < annotations.length; i++) {
            annotatorUtil.showElement(annotations[i]);
        }
        annotatorUtil.showElement(annotateButton);
    }

    bindDOMListeners() {
        // Get image tag inside viewer
        const imageEl = this._annotatedElement.querySelector('img');
        if (imageEl) {
            this._annotatedElement.addEventListener('mouseup', this.handleMouseUp);
        }
    }

    unbindDOMListeners() {
        // Get image tag inside viewer
        const imageEl = this._annotatedElement.querySelector('img');
        if (imageEl) {
            this._annotatedElement.removeEventListener('mouseup', this.handleMouseUp);
        }
    }

    handleMouseUp(event) {
        event.preventDefault();
    }
}

export default ImageAnnotator;
