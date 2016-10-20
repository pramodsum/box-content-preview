/**
 * @fileoverview Base annotation thread class. This implements a 'thread' with
 * annotations that manages an indicator element (point icon in the case of
 * point annotations) and dialogs for creating/deleting annotations.
 *
 * The following abstract methods must be implemented by a child class:
 * show() - show the annotation indicator
 * createDialog() - create appropriate annotation dialog
 * @author tjin
 */

import autobind from 'autobind-decorator';
import Annotation from './annotation';
import AnnotationService from './annotation-service';
import EventEmitter from 'events';
import * as annotatorUtil from './annotator-util';
import * as constants from './annotation-constants';
import { ICON_PLACED_ANNOTATION_GREY, ICON_PLACED_ANNOTATION_CIRCLE } from '../icons/icons';


@autobind
class AnnotationThread extends EventEmitter {

    //--------------------------------------------------------------------------
    // Typedef
    //--------------------------------------------------------------------------

    /**
     * The data object for constructing a thread.
     * @typedef {Object} AnnotationThreadData
     * @property {HTMLElement} annotatedElement HTML element being annotated on
     * @property {Annotation[]} [annotations] Annotations in thread - none if
     * this is a new thread
     * @property {LocalStorageAnnotationService} annotationService Annotations CRUD service
     * @property {string} fileVersionID File version ID
     * @property {Object} location Location object
     * @property {string} threadID Thread ID
     * @property {string} thread Thread number
     * @property {string} type Type of thread
     */

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     *
     * @param {AnnotationThreadData} data Data for constructing thread
     * @returns {AnnotationThread} Annotation thread instance
     */
    constructor(data) {
        super();

        this._annotatedElement = data.annotatedElement;
        this._annotations = data.annotations || [];
        this._annotationService = data.annotationService;
        this._fileVersionID = data.fileVersionID;
        this._location = data.location;
        this._threadID = data.threadID || AnnotationService.generateID();
        this._thread = data.thread || '';
        this._type = data.type;
        this._locale = data.locale;

        this.setup();
    }

    /**
     * [destructor]
     *
     * @returns {void}
     */
    destroy() {
        if (this._dialog) {
            this.unbindCustomListenersOnDialog();
            this._dialog.destroy();
        }

        if (this._element) {
            this.unbindDOMListeners();

            if (this._element.parentNode) {
                this._element.parentNode.removeChild(this._element);
            }

            this._element = null;
        }

        if (this.threadNumberEl) {
            if (this.threadNumberEl.parentNode) {
                this.threadNumberEl.parentNode.removeChild(this.threadNumberEl);
            }

            this.threadNumberEl = null;
        }

        this.emit('threaddeleted');
    }

    /**
     * Hides the annotation indicator.
     *
     * @returns {void}
     */
    hide() {
        annotatorUtil.hideElement(this._element);
    }

    /**
     * Reset state to inactive.
     *
     * @returns {void}
     */
    reset() {
        this._state = constants.ANNOTATION_STATE_INACTIVE;
    }

    /**
     * Shows the appropriate annotation dialog for this thread.
     *
     * @returns {void}
     */
    showDialog() {
        if (this._dialog) {
            this._dialog.show();
        }
    }

    /**
     * Hides the appropriate annotation dialog for this thread.
     *
     * @param {boolean} [noDelay] Whether or not to have a timeout delay
     * @returns {void}
     */
    hideDialog(noDelay = false) {
        if (this._dialog) {
            this._dialog.hide(noDelay);
        }
    }

    /**
     * Saves an annotation.
     *
     * @param {string} type Type of annotation
     * @param {string} text Text of annotation to save
     * @returns {void}
     */
    saveAnnotation(type, text) {
        const annotationData = this._createAnnotationData(type, text);

        // Save annotation on client
        const tempAnnotationID = AnnotationService.generateID();
        const tempAnnotationData = annotationData;
        tempAnnotationData.annotationID = tempAnnotationID;
        tempAnnotationData.permissions = {
            can_edit: true,
            can_delete: true
        };
        tempAnnotationData.created = (new Date()).getTime();
        tempAnnotationData.modified = tempAnnotationData.created;
        const tempAnnotation = new Annotation(tempAnnotationData);
        this._saveAnnotationToThread(tempAnnotation);

        // Save annotation on server
        this._annotationService.create(annotationData).then((savedAnnotation) => {
            // If no temporary annotation is found, save to thread normally
            const tempIdx = this._annotations.indexOf(tempAnnotation);
            if (tempIdx === -1) {
                this._saveAnnotationToThread(savedAnnotation);
            }

            // Otherwise, replace temporary annotation with annotation saved to server
            this._annotations[tempIdx] = savedAnnotation;

            this.addThreadNumberIndicator(savedAnnotation);
            this.assignThreadNumber(savedAnnotation);

            if (this._dialog) {
                this._dialog.removeAnnotation(tempAnnotationID);
                this._dialog.addAnnotation(savedAnnotation);
            }
        }).catch(() => {
            // Remove temporary annotation
            this.deleteAnnotation(tempAnnotationID, /* useServer */ false);

            // Broadcast error
            this.emit('annotationcreateerror');
        });
    }

    /**
     * Deletes an annotation.
     *
     * @param {string} annotationID ID of annotation to delete
     * @param {boolean} [useServer] Whether or not to delete on server, default true
     * @returns {void}
     */
    deleteAnnotation(annotationID, useServer = true) {
        // Ignore if no corresponding annotation exists in thread or user doesn't have permissions
        const annotation = this._annotations.find((annot) => annot.annotationID === annotationID);
        if (!annotation || (annotation.permissions && !annotation.permissions.can_delete)) {
            return;
        }

        // Delete annotation on client
        this._annotations = this._annotations.filter((annot) => annot.annotationID !== annotationID);

        // If the user doesn't have permission to delete the entire highlight
        // annotation, display the annotation as a plain highlight
        const canDeleteAnnotation = this._annotations[0] && this._annotations[0].permissions && this._annotations[0].permissions.can_delete;
        if (annotatorUtil.isPlainHighlight(this._annotations) && !canDeleteAnnotation) {
            this.cancelFirstComment();

        // If this annotation was the last one in the thread, destroy the thread
        } else if (this._annotations.length === 0 || annotatorUtil.isPlainHighlight(this._annotations)) {
            this.destroy();

        // Otherwise, remove deleted annotation from dialog
        } else if (this._dialog) {
            this._dialog.removeAnnotation(annotationID);
        }

        // Delete annotation on server
        if (useServer) {
            this._annotationService.delete(annotationID)
            .then(() => {
                // Ensures that blank highlight comment is also deleted when removing
                // the last comment on a highlight
                if (annotatorUtil.isPlainHighlight(this._annotations) && canDeleteAnnotation) {
                    this._annotationService.delete(this._annotations[0].annotationID);
                }

                // Broadcast thread cleanup if needed
                if (this._annotations.length === 0) {
                    this.emit('threadcleanup');
                }
            })
            .catch(() => {
                // Broadcast error
                this.emit('annotationdeleteerror');
            });
        }
    }

    //--------------------------------------------------------------------------
    // Abstract
    //--------------------------------------------------------------------------

    /**
     * Cancels the first comment on the thread
     *
     * @returns {void}
     */
    cancelFirstComment() {}

    /**
     * Must be implemented to show the annotation indicator.
     *
     * @returns {void}
     */
    show() {}

    /**
     * Must be implemented to create the appropriate annotation dialog and save
     * as a property on the thread.
     *
     * @returns {void}
     */
    createDialog() {}

    //--------------------------------------------------------------------------
    // Getters
    //--------------------------------------------------------------------------

    /**
     * Gets location.
     *
     * @returns {Object} Location
     */
    get location() {
        return this._location;
    }

    /**
     * Gets threadID.
     *
     * @returns {string} threadID
     */
    get threadID() {
        return this._threadID;
    }

    /**
     * Gets thread number.
     *
     * @returns {string} thread number
     */
    get thread() {
        return this._thread;
    }

    /**
     * Gets type.
     *
     * @returns {string} type
     */
    get type() {
        return this._type;
    }

    /**
     * Gets state.
     *
     * @returns {string} state
     */
    get state() {
        return this._state;
    }

    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * Sets up the thread. Creates HTML for annotation indicator, sets
     * appropriate dialog, and binds event listeners.
     *
     * @returns {void}
     * @protected
     */
    setup() {
        if (this._annotations.length === 0) {
            this._state = constants.ANNOTATION_STATE_PENDING;
        } else {
            this._state = constants.ANNOTATION_STATE_INACTIVE;
        }

        this.createDialog();
        this.bindCustomListenersOnDialog();

        this.setupElement();
    }

    /**
     * Sets up indicator element.
     *
     * @returns {void}
     * @protected
     */
    setupElement() {
        this._element = this._createElement();
        this.bindDOMListeners();

        // Set thread number for annotations in current thread
        const lastAnnotationIndex = this._annotations.length - 1;
        if (lastAnnotationIndex >= 0) {
            this.addThreadNumberIndicator(this._annotations[lastAnnotationIndex]);
        }
    }

    /**
     * Binds DOM event listeners for the thread.
     *
     * @returns {void}
     * @protected
     */
    bindDOMListeners() {
        if (!this._element) {
            return;
        }

        this._element.addEventListener('click', this.showDialog);
        this._element.addEventListener('mouseover', this.showDialog);
        this._element.addEventListener('mouseout', this._mouseoutHandler);
    }

    /**
     * Unbinds DOM event listeners for the thread.
     *
     * @returns {void}
     * @protected
     */
    unbindDOMListeners() {
        if (!this._element) {
            return;
        }

        this._element.removeEventListener('click', this.showDialog);
        this._element.removeEventListener('mouseover', this.showDialog);
        this._element.removeEventListener('mouseout', this._mouseoutHandler);

        if (this.threadNumberEl) {
            this.threadNumberEl.removeEventListener('click', this.showDialog);
            this.threadNumberEl.removeEventListener('mouseover', this.showDialog);
            this.threadNumberEl.removeEventListener('mouseout', this._mouseoutHandler);
        }
    }

    /**
     * Binds custom event listeners for the dialog.
     *
     * @returns {void}
     * @protected
     */
    bindCustomListenersOnDialog() {
        if (!this._dialog) {
            return;
        }

        // Annotation created
        this._dialog.addListener('annotationcreate', (data) => {
            this.saveAnnotation(constants.ANNOTATION_TYPE_POINT, data.text);
        });

        // Annotation canceled
        this._dialog.addListener('annotationcancel', () => {
            this.destroy();
        });

        // Annotation deleted
        this._dialog.addListener('annotationdelete', (data) => {
            this.deleteAnnotation(data.annotationID);
        });
    }

    /**
     * Unbinds custom event listeners for the dialog.
     *
     * @returns {void}
     * @protected
     */
    unbindCustomListenersOnDialog() {
        if (!this._dialog) {
            return;
        }

        this._dialog.removeAllListeners('annotationcreate');
        this._dialog.removeAllListeners('annotationcancel');
        this._dialog.removeAllListeners('annotationdelete');
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Creates the HTML for the annotation indicator.
     *
     * @returns {HTMLElement} HTML element
     * @private
     */
    _createElement() {
        const indicatorEl = document.createElement('button');
        indicatorEl.classList.add('box-preview-point-annotation-btn');
        indicatorEl.setAttribute('data-type', 'annotation-indicator');
        indicatorEl.innerHTML = ICON_PLACED_ANNOTATION_CIRCLE;

        // Add thread number indicator
        this.createThreadNumberElement();

        const indicatorSVG = indicatorEl.querySelector('svg');
        indicatorEl.insertBefore(this.threadNumberEl, indicatorSVG);

        return indicatorEl;
    }

    /**
     * Mouseout handler. Hides dialog if we aren't creating the first one.
     *
     * @returns {void}
     * @private
     */
    _mouseoutHandler() {
        if (this._annotations.length !== 0) {
            this.hideDialog();
        }
    }

    /**
     * Saves the provided annotation to the thread and dialog if appropriate
     * and resets state to inactive.
     *
     * @param {Annotation} annotation Annotation to save
     * @returns {void}
     * @private
     */
    _saveAnnotationToThread(annotation) {
        this._annotations.push(annotation);

        if (this._dialog) {
            this._dialog.addAnnotation(annotation);
        }

        this.reset();
    }

    /**
     * Adds and positions thread number indicator HTML element to the DOM for
     * highlight annotations
     *
     * @param {Annotation} annotation Annotation
     * @returns {void}
     */
    addThreadNumberIndicator(annotation) {
        // Plain highlight annotations
        if (annotatorUtil.isPlainHighlight([annotation])) {
            this.threadNumberEl = this._dialog.getAnnotationDialog().querySelector('.annotation-thread-number');
        } else if (annotatorUtil.isHighlightAnnotation(this.type)) {
            this.createThreadNumberElement();
            this.threadNumberEl.classList.add('box-preview-annotation-thread');
            this.positionThreadNumber(this.location.page, this.type);
        }

        // Show thread number indicator relative to dialog position
        this.assignThreadNumber(annotation);
    }

    /**
     * Creates thread number HTML element and binds appropriate listeners
     *
     * @returns {void}
     */
    createThreadNumberElement() {
        this.threadNumberEl = document.createElement('div');
        this.threadNumberEl.classList.add('annotation-thread-number');
        this.threadNumberEl.setAttribute('data-type', 'annotation-indicator');
        this.threadNumberEl.innerHTML = ICON_PLACED_ANNOTATION_GREY;

        this.threadNumberEl.addEventListener('click', this.showDialog);
        this.threadNumberEl.addEventListener('mouseover', this.showDialog);
        this.threadNumberEl.addEventListener('mouseout', this._mouseoutHandler);
    }

    /**
     * Assigns thread number to thread number SVG element and displays thread
     * number HTML element
     *
     * @param {Annotation} annotation Annotation
     * @returns {void}
     */
    assignThreadNumber(annotation) {
        if (!this.threadNumberEl || this.threadNumberEl.lastChild.textContent === annotation._thread) {
            return;
        }

        this.threadNumberEl.setAttribute('data-thread-number', annotation._thread);

        const threadNumberIconEl = this.threadNumberEl.getElementsByTagName('svg')[0];
        const threadText = document.createElementNS('http://www.w3.org/2000/svg', 'text');

        threadText.setAttribute('y', '60%');
        threadText.setAttribute('x', '50%');
        threadText.setAttribute('text-anchor', 'middle');
        threadText.setAttribute('fill', '#000');
        threadText.textContent = annotation._thread;

        // Only display thread number if it has been populated
        if (threadText.textContent) {
            threadNumberIconEl.appendChild(threadText);
            annotatorUtil.showElement(this.threadNumberEl);
        }
    }

    /**
     * Positions thread number HTML element according to annotation type
     *
     * @param {Annotation} annotation Annotation
     * @returns {void}
     */
    positionThreadNumber(page, type) {
        // Get indicatorEl SVG element
        const pageEl = this._annotatedElement.querySelector(`[data-page-number="${page}"]`);
        pageEl.appendChild(this.threadNumberEl);

        // Position & show thread number indicator relative to dialog position
        const dialogEl = this._dialog.getAnnotationDialog();
        annotatorUtil.hideElementVisibility(dialogEl);
        this._dialog.position();
        let [dialogX, dialogY] = this._dialog.getDialogPosition();
        annotatorUtil.hideElement(dialogEl);
        annotatorUtil.showInvisibleElement(dialogEl);

        // Adjust thread number padding by 4 extra pixels for point thread circle icon
        const THREAD_NUMBER_INDICATOR_TOP_PADDING = annotatorUtil.isHighlightAnnotation(type) ? 17 : 21;
        const THREAD_NUMBER_INDICATOR_LEFT_PADDING = 129;

        dialogX = Number(dialogX.replace('px', '')) + THREAD_NUMBER_INDICATOR_LEFT_PADDING;
        dialogY = Number(dialogY.replace('px', '')) - THREAD_NUMBER_INDICATOR_TOP_PADDING;
        this.threadNumberEl.style.left = `${dialogX}px`;
        this.threadNumberEl.style.top = `${dialogY}px`;
    }

    /**
     * Create an annotation data object to pass to annotation service.
     *
     * @param {string} type Type of annotation
     * @param {string} text Annotation text
     * @returns {Object} Annotation data
     * @private
     */
    _createAnnotationData(type, text) {
        return {
            fileVersionID: this._fileVersionID,
            type,
            text,
            location: this._location,
            user: this._annotationService.user,
            threadID: this._threadID,
            thread: this._thread
        };
    }
}

export default AnnotationThread;
