/**
 * @fileoverview Media annotator class. Extends base annotator class
 * @author spramod
 */

import autobind from 'autobind-decorator';
import Annotator from '../annotator';
import MediaPointThread from './media-point-thread';
import * as annotatorUtil from '../annotator-util';

@autobind
class MediaAnnotator extends Annotator {

    //--------------------------------------------------------------------------
    // Abstract Implementations
    //--------------------------------------------------------------------------

    /**
     * Returns an annotation location on an media from the DOM event or null
     * if no correct annotation location can be inferred from the event. For
     * point annotations, we return the (x, y) coordinates for the point
     * with the top left corner of the media as the origin.
     *
     * @override
     * @param {Event} event DOM event
     * @returns {Object|null} Location object
     */
    getLocationFromEvent(event) {
        let location = null;

        // Get media tag inside viewer
        const mediaEl = this._annotatedElement.querySelector('video');
        if (!mediaEl) {
            return location;
        }

        // If click is inside an annotation dialog, ignore
        const dataType = annotatorUtil.findClosestDataType(this._annotatedElement);
        if (dataType === 'annotation-dialog' || dataType === 'annotation-indicator') {
            return location;
        }

        // Location based only on media position
        const mediaDimensions = mediaEl.getBoundingClientRect();
        const [x, y] = [(event.clientX - mediaDimensions.left), (event.clientY - mediaDimensions.top)];

        // If click isn't in media area, ignore
        if (event.clientX > mediaDimensions.right || event.clientX < mediaDimensions.left ||
            event.clientY > mediaDimensions.bottom || event.clientY < mediaDimensions.top) {
            return location;
        }

        // We save the dimensions of the annotated element so we can
        // compare to the element being rendered on and scale as appropriate
        const dimensions = {
            x: mediaDimensions.width,
            y: mediaDimensions.height
        };

        const currentTime = this._currentTime;

        location = { x, y, mediaEl, dimensions, currentTime };

        return location;
    }

    /**
     * Creates the proper type of thread, adds it to in-memory map, and returns
     * it.
     *
     * @override
     * @param {Annotation[]} annotations Annotations in thread
     * @param {Object} location Location object
     * @param {string} [type] Optional annotation type
     * @returns {AnnotationThread} Created annotation thread
     */
    createAnnotationThread(annotations, location, type) {
        const threadParams = {
            annotatedElement: this._annotatedElement,
            annotations,
            annotationService: this._annotationService,
            fileVersionID: this._fileVersionID,
            location,
            type,
            locale: this.locale
        };

        // Set existing thread ID if created with annotations
        if (annotations.length > 0) {
            threadParams.threadID = annotations[0].threadID;
        }

        const thread = new MediaPointThread(threadParams);
        this.addThreadToMap(thread);
        return thread;
    }

    /**
    * Shows all annotations on the media. Shows button in header that
    * enables point annotation mode
    *
    * @returns {void}
    */
    showAnnotationsBetweenTimes(lastCheckedTime, currentTime) {
        // Get media tag inside viewer
        const mediaEl = this._annotatedElement.querySelector('video');
        const startedPaused = mediaEl.paused;
        Object.keys(this._threads).forEach((page) => {
            this._threads[page].forEach((thread) => {
                const timeWindow = Math.abs(lastCheckedTime - currentTime);
                const shouldDisplay = (this.isBetweenTwoValues(lastCheckedTime, currentTime, thread.location.currentTime) && timeWindow < 1) ||
                    (this.isBetweenTwoValues(currentTime + 0.75, currentTime - 0.75, thread.location.currentTime) && timeWindow > 1);
                if (shouldDisplay) {
                    if (!mediaEl) {
                        return;
                    }
                    if (!startedPaused) {
                        // mediaEl.pause();
                    }
                    thread.show();
                } else {
                    if (!startedPaused || timeWindow > 1) {
                        if (timeWindow > 1) {
                            thread.hide();
                        }
                        thread.hide(false);
                        if (thread.state === constants.ANNOTATION_STATE_PENDING) {
                            thread.destroy();
                        }
                    }
                    const test = '';
                    test.charAt(0);
                }
            });
        });
    }

    isBetweenTwoValues(endpointA, endpointB, middleCheck) {
        if (endpointA <= middleCheck && middleCheck <= endpointB) {
            return true;
        } else if (endpointB <= middleCheck && middleCheck <= endpointA) {
            return true;
        }
        return false;
    }

    loadScrubberAnnotations() {
        const annotationsEl = document.querySelector('.box-preview-media-scrubber-annotations');

        // Get media tag inside viewer
        const mediaEl = this._annotatedElement.querySelector('video');
        if (!mediaEl) {
            return;
        }

        Object.keys(this._threads).forEach((page) => {
            this._threads[page].forEach((thread) => {
                const time = thread.location.currentTime;

                // create element
                const scrubberAnnotation = document.createElement('div');
                scrubberAnnotation.classList.add('box-preview-media-scrubber-annotation');

                // calculate "time" position on scrubber
                const duration = mediaEl.duration;
                const scrubberPos = duration ? time / duration : 0;

                // add element to time on scrubber
                scrubberAnnotation.style.left = `${scrubberPos * 100}%`;
                annotationsEl.appendChild(scrubberAnnotation);
                scrubberAnnotation.setAttribute('data-time', time);
                scrubberAnnotation.addEventListener('click', this.clickHandler);
                // annotationsEl.addEventListener('mouseover', this.mouseoverHandler);
            });
        });
    }

    clickHandler(event) {
        const mediaEl = this._annotatedElement.querySelector('video');
        mediaEl.pause();
        mediaEl.currentTime = event.target.getAttribute('data-time');
    }
}

export default MediaAnnotator;
