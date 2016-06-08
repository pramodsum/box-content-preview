/**
 * @fileoverview Document annotator class. Extends base annotator class
 * with highlight annotations.
 * @author tjin
 */

import autobind from 'autobind-decorator';
import Annotator from '../annotation/annotator';
import Browser from '../browser';
import HighlightThread from './highlight-thread';
import rangy from 'rangy';
/* eslint-disable no-unused-vars */
// Workaround for rangy npm issue: https://github.com/timdown/rangy/issues/342
import rangyClassApplier from 'rangy/lib/rangy-classapplier';
import rangyHighlight from 'rangy/lib/rangy-highlighter';
import rangySaveRestore from 'rangy/lib/rangy-selectionsaverestore';
/* eslint-enable no-unused-vars */
import throttle from 'lodash.throttle';
import * as annotatorUtil from '../annotation/annotator-util';
import * as constants from '../annotation/annotation-constants';
import { CLASS_ACTIVE } from '../constants';

const HIGHLIGHT_ANNOTATION_TYPE = 'highlight';
const HIGHLIGHT_STATE_ACTIVE = 'active';
const HIGHLIGHT_STATE_ACTIVE_HOVER = 'active-hover';
const HIGHLIGHT_STATE_HOVER = 'hover';
const IS_MOBILE = Browser.isMobile();
const MOUSEMOVE_THROTTLE_MS = 50;
const PAGE_PADDING_BOTTOM = 15;
const PAGE_PADDING_TOP = 15;
const POINT_ANNOTATION_TYPE = 'point';

@autobind
class DocAnnotator extends Annotator {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [destructor]
     *
     * @override
     * @returns {void}
     */
    destroy() {
        super.destroy();
        this.removeAllListeners('pointmodeenter');
    }

    /**
     * Initializes annotator.
     *
     * @override
     * @returns {void}
     */
    init() {
        super.init();

        // On mobile, we want to disable user-scaling since we want users to use
        // the document zoom controls
        /* Unclear whether we want this behavior or not
        if (IS_MOBILE) {
            const metaEl = document.createElement('meta');
            metaEl.setAttribute('name', 'viewport');
            metaEl.setAttribute('content', 'user-scalable=no');
            document.getElementsByTagName('head')[0].appendChild(metaEl);
        }
        */

        // If in highlight mode and we enter point mode, turn off highlight mode
        this.addListener('pointmodeenter', () => {
            if (this._isInHighlightMode()) {
                this.toggleHighlightModeHandler();
            }
        });

        // If in point mode and we enter highlight mode, turn off point mode
        this.addListener('highlightmodeenter', () => {
            if (this._isInPointMode()) {
                this.togglePointModeHandler();
            }
        });
    }

    /**
     * Toggles highlight annotation mode on and off. When highlight mode is on,
     * every selection becomes a highlight.
     *
     * @param {Event} event DOM event
     * @returns {void}
     */
    toggleHighlightModeHandler(event = {}) {
        // This unfortunately breaks encapsulation, but the header currently
        // doesn't manage its own functionality
        let buttonEl = event.target;
        if (!buttonEl) {
            const containerEl = document.querySelector('.box-preview-header');
            buttonEl = containerEl ? containerEl.querySelector('.box-preview-btn-highlight') : null;
        }

        this._destroyPendingThreads();

        // If in highlight mode, turn it off
        if (this._isInHighlightMode()) {
            this.emit('highlightmodeexit');
            this._annotatedElement.classList.remove(constants.CLASS_ANNOTATION_HIGHLIGHT_MODE);
            if (buttonEl) {
                buttonEl.classList.remove(CLASS_ACTIVE);
            }

            this._unbindHighlightModeListeners(); // Disable highlight mode
            this._bindDOMListeners(); // Re-enable other annotations

        // Otherwise, enable highlight mode
        } else {
            this.emit('highlightmodeenter');
            this._annotatedElement.classList.add(constants.CLASS_ANNOTATION_HIGHLIGHT_MODE);
            if (buttonEl) {
                buttonEl.classList.add(CLASS_ACTIVE);
            }

            this._unbindDOMListeners(); // Disable other annotations
            this._bindHighlightModeListeners(); // Enable highlight mode
        }
    }

    //--------------------------------------------------------------------------
    // Private functions
    //--------------------------------------------------------------------------

    /**
     * Annotations setup.
     *
     * @override
     * @returns {void}
     * @private
     */
    _setupAnnotations() {
        super._setupAnnotations();

        // Init rangy and rangy highlight
        this._highlighter = rangy.createHighlighter();
        this._highlighter.addClassApplier(rangy.createClassApplier('rangy-highlight', {
            ignoreWhiteSpace: true,
            tagNames: ['span', 'a']
        }));
    }

    /**
     * Binds DOM event listeners.
     *
     * @override
     * @returns {void}
     * @private
     */
    _bindDOMListeners() {
        super._bindDOMListeners();

        // If user cannot create or modify annotations, don't bind any listeners
        if (!this._annotationService.canAnnotate) {
            return;
        }

        this._annotatedElement.addEventListener('mousedown', this._highlightMousedownHandler);
        this._annotatedElement.addEventListener('contextmenu', this._highlightMousedownHandler);
        this._annotatedElement.addEventListener('mousemove', this._highlightMousemoveHandler());
        this._annotatedElement.addEventListener('mouseup', this._highlightMouseupHandler);
    }

    /**
     * Unbinds DOM event listeners.
     *
     * @override
     * @returns {void}
     * @private
     */
    _unbindDOMListeners() {
        super._unbindDOMListeners();

        if (!this._annotationService.canAnnotate) {
            return;
        }

        this._annotatedElement.removeEventListener('mousedown', this._highlightMousedownHandler);
        this._annotatedElement.removeEventListener('contextmenu', this._highlightMousedownHandler);
        this._annotatedElement.removeEventListener('mousemove', this._highlightMousemoveHandler());
        this._annotatedElement.removeEventListener('mouseup', this._highlightMouseupHandler);
    }

    /**
     * Binds point mode event listeners.
     *
     * @returns {void}
     * @private
     */
    _bindHighlightModeListeners() {
        this._annotatedElement.addEventListener('mouseup', this._highlightMouseupHandler);
    }

    /**
     * Unbinds point mode event listeners.
     *
     * @returns {void}
     * @private
     */
    _unbindHighlightModeListeners() {
        this._annotatedElement.removeEventListener('mouseup', this._highlightMouseupHandler);
    }

    /**
     * Returns an annotation location on a document from the DOM event or null
     * if no correct annotation location can be inferred from the event. For
     * point annotations, we return the (x, y) coordinates and page the
     * point is on in PDF units with the lower left corner of the document as
     * the origin. For highlight annotations, we return the PDF quad points
     * as defined by the PDF spec and page the highlight is on.
     *
     * @override
     * @param {Event} event DOM event
     * @param {string} annotationType Type of annotation
     * @returns {Object|null} Location object
     */
    _getLocationFromEvent(event, annotationType) {
        let location = null;

        if (annotationType === POINT_ANNOTATION_TYPE) {
            // If there is a selection, ignore
            if (annotatorUtil.isSelectionPresent()) {
                return location;
            }

            // If click isn't on a page, ignore
            const eventTarget = event.target;
            const { pageEl, page } = annotatorUtil.getPageElAndPageNumber(eventTarget);
            if (!pageEl) {
                return location;
            }

            // If click is inside an annotation dialog, ignore
            const dataType = annotatorUtil.findClosestDataType(eventTarget);
            if (dataType === 'annotation-dialog' || dataType === 'annotation-indicator') {
                return location;
            }

            // Store coordinates at 100% scale in PDF space in PDF units
            const pageDimensions = pageEl.getBoundingClientRect();
            const pageHeight = pageDimensions.height - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;
            const pageTop = pageDimensions.top + PAGE_PADDING_TOP;
            const browserCoordinates = [event.clientX - pageDimensions.left, event.clientY - pageTop];
            const pdfCoordinates = annotatorUtil.convertDOMSpaceToPDFSpace(browserCoordinates, pageHeight, annotatorUtil.getScale(this._annotatedElement));
            const [x, y] = pdfCoordinates;

            location = { x, y, page };
        } else if (annotationType === HIGHLIGHT_ANNOTATION_TYPE) {
            if (!annotatorUtil.isSelectionPresent()) {
                return location;
            }

            // Get correct page
            let { pageEl, page } = annotatorUtil.getPageElAndPageNumber(event.target);
            if (page === -1) {
                // The ( .. ) around assignment is required syntax
                ({ pageEl, page } = annotatorUtil.getPageElAndPageNumber(window.getSelection().anchorNode));
            }

            // Use Rangy to save the current selection because using the
            // highlight module can mess with the selection. We restore this
            // selection after we clean up the highlight
            const savedSelection = rangy.saveSelection();

            // Use highlight module to calculate quad points
            const { highlight, highlightEls } = annotatorUtil.getHighlightAndHighlightEls(this._highlighter, pageEl);
            const quadPoints = [];
            highlightEls.forEach((element) => {
                quadPoints.push(annotatorUtil.getQuadPoints(element, pageEl,
                    annotatorUtil.getScale(this._annotatedElement)));
            });

            // Remove rangy highlight and restore selection
            this._removeRangyHighlight(highlight);
            rangy.restoreSelection(savedSelection);

            location = { page, quadPoints };
        }

        return location;
    }

    /**
     * Mousedown handler on annotated element. Initializes didDrag to false -
     * this way, on the mouseup handler, we can check if didDrag was set to
     * true by the mousemove handler, and if not, delegate to click handlers
     * for highlight threads. Also delegates to mousedown handler for each
     * thread.
     *
     * @param {Event} event DOM event
     * @returns {void}
     * @private
     */
    _highlightMousedownHandler(event) {
        this._didMouseMove = false;
        this._mouseX = event.clientX;
        this._mouseY = event.clientY;

        Object.keys(this._threads).forEach((threadPage) => {
            this._getHighlightThreadsOnPage(threadPage).forEach((thread) => {
                thread.onMousedown();
            });
        });
    }

    /**
     * Throttled mousemove handler over annotated element. Delegates to
     * mousemove handler of highlight threads on the page.
     *
     * @returns {Function} mousemove handler
     * @private
     */
    _highlightMousemoveHandler() {
        if (!this._throttledHighlightMousemoveHandler) {
            this._throttledHighlightMousemoveHandler = throttle((event) => {
                // Ignore small mouse movements when figuring out if a mousedown
                // and mouseup was a click
                if (Math.abs(event.clientX - this._mouseX) > 5 ||
                    Math.abs(event.clientY - this._mouseY) > 5) {
                    this._didMouseMove = true;
                }

                const delayThreads = [];
                const page = annotatorUtil.getPageElAndPageNumber(event.target).page;
                if (page !== -1) {
                    this._getHighlightThreadsOnPage(page).forEach((thread) => {
                        const shouldDelay = thread.onMousemove(event);
                        if (shouldDelay) {
                            delayThreads.push(thread);
                        }
                    });
                }

                // If we are hovering over a highlight, we should use a hand cursor
                if (delayThreads.some((thread) => {
                    return thread.state === HIGHLIGHT_STATE_HOVER ||
                        thread.state === HIGHLIGHT_STATE_ACTIVE_HOVER;
                })) {
                    this._useHandCursor();
                } else {
                    this._removeHandCursor();
                }

                // Delayed threads (threads that should be in active or hover
                // state) should be drawn last
                delayThreads.forEach((thread) => {
                    thread.show();
                });
            }, MOUSEMOVE_THROTTLE_MS);
        }

        return this._throttledHighlightMousemoveHandler;
    }

    /**
     * Mouseup handler. Switches between creating a highlight and delegating
     * to highlight click handlers depending on whether mouse moved since
     * mousedown.
     *
     * @param {Event} event DOM event
     * @private
     */
    _highlightMouseupHandler(event) {
        // Creating highlights is disabled on mobile for now since the
        // event we would listen to, selectionchange, fires continuously and
        // is unreliable. If the mouse moved or we're in highlight mode,
        // we trigger the create handler instad of the click handler
        if (!IS_MOBILE && (this._didMouseMove || this._isInHighlightMode())) {
            this._highlightCreateHandler(event);
        } else {
            this._highlightClickHandler(event);
        }
    }

    /**
     * Handler for creating a pending highlight thread from the current
     * selection.
     *
     * @param {Event} event DOM event
     * @private
     */
    _highlightCreateHandler(event) {
        event.stopPropagation();

        // Reset active highlight threads before creating new highlight
        const threads = this._getHighlightThreadsWithStates(HIGHLIGHT_STATE_ACTIVE, HIGHLIGHT_STATE_ACTIVE_HOVER);
        threads.forEach((thread) => {
            thread.reset();
        });

        // Get annotation location from mouseup event, ignore if location is invalid
        const location = this._getLocationFromEvent(event, HIGHLIGHT_ANNOTATION_TYPE);
        if (!location) {
            return;
        }

        // Create and show pending annotation thread
        const thread = this._createAnnotationThread([], location, HIGHLIGHT_ANNOTATION_TYPE);

        // If in highlight mode, save highlight immediately
        if (this._isInHighlightMode()) {
            thread.saveAnnotation(HIGHLIGHT_ANNOTATION_TYPE, '');
            // saveAnnotation() shows the annotation afterwards
        } else {
            thread.show();
        }

        // Bind events on thread
        this._bindCustomListenersOnThread(thread);
    }

    /**
     * Highlight click handler. Delegates click event to click handlers for
     * threads on the page.
     *
     * @param {Event} event DOM event
     * @private
     */
    _highlightClickHandler(event) {
        // We use this to prevent a mousedown from activating two different
        // highlights at the same time - this tracks whether a delegated
        // mousedown activated some highlight, and then informs the other
        // keydown handlers to not activate
        let consumed = false;
        let activeThread = null;

        Object.keys(this._threads).forEach((threadPage) => {
            this._getHighlightThreadsOnPage(threadPage).forEach((thread) => {
                const threadActive = thread.onClick(event, consumed);
                if (threadActive) {
                    activeThread = thread;
                }

                consumed = consumed || threadActive;
            });
        });

        // Show active thread last
        if (activeThread) {
            activeThread.show();
        }
    }

    /**
     * Show hand cursor instead of normal cursor.
     *
     * @returns {void}
     * @private
     */
    _useHandCursor() {
        this._annotatedElement.classList.add('box-preview-use-hand-cursor');
    }

    /**
     * Use normal cursor.
     *
     * @returns {void}
     * @private
     */
    _removeHandCursor() {
        this._annotatedElement.classList.remove('box-preview-use-hand-cursor');
    }

    /**
     * Returns the highlight threads on the specified page.
     *
     * @param {Number} page Page to get highlight threads for
     * @returns {HighlightThread[]} Highlight annotation threads
     * @private
     */
    _getHighlightThreadsOnPage(page) {
        const threads = this._threads[page] || [];
        return threads.filter((thread) => thread.type === HIGHLIGHT_ANNOTATION_TYPE);
    }

    /**
     * Returns highlight threads with a state in the specified states.
     *
     * @param {...String} states States of highlight threads to find
     * @returns {HighlightThread[]} Highlight threads with the specified states
     * @private
     */
    _getHighlightThreadsWithStates(...states) {
        const threads = [];

        Object.keys(this._threads).forEach((page) => {
            // Append pending highlight threads on page to array of threads
            [].push.apply(threads, this._threads[page].filter((thread) => {
                let matchedState = false;
                states.forEach((state) => {
                    matchedState = matchedState || (thread.state === state);
                });

                return matchedState && thread.type === HIGHLIGHT_ANNOTATION_TYPE;
            }));
        });

        return threads;
    }

    /**
     * Binds custom event listeners for a thread.
     *
     * @override
     * @param {AnnotationThread} thread Thread to bind events to
     * @returns {void}
     * @private
     */
    _bindCustomListenersOnThread(thread) {
        super._bindCustomListenersOnThread(thread);

        // We need to redraw highlights on the page if a thread was deleted
        // since deleting 'cuts' out the highlight, which may have been
        // overlapping with another
        thread.addListener('threaddeleted', () => {
            this._showHighlightsOnPage(thread.location.page);
        });
    }

    /**
     * Shows highlight annotations for the specified page by re-drawing all
     * highlight annotations currently in memory for the specified page.
     *
     * @param {Number} page Page to draw annotations for
     * @returns {void}
     * @private
     */
    _showHighlightsOnPage(page) {
        // let time = new Date().getTime();

        // Clear context if needed
        const pageEl = this._annotatedElement.querySelector(`[data-page-number="${page}"]`);
        const annotationLayerEl = pageEl.querySelector('.box-preview-annotation-layer');
        if (annotationLayerEl) {
            const context = annotationLayerEl.getContext('2d');
            context.clearRect(0, 0, annotationLayerEl.width, annotationLayerEl.height);
        }

        this._getHighlightThreadsOnPage(page).forEach((thread) => {
            thread.show();
        });

        // console.log(`Drawing annotations for page ${page} took ${new Date().getTime() - time}ms`);
    }

    /**
     * Creates the proper type of thread, adds it to in-memory map, and returns
     * it.
     *
     * @override
     * @param {Annotation[]} annotations Annotations in thread
     * @param {Object} location Location object
     * @param {String} [type] Optional annotation type
     * @returns {AnnotationThread} Created annotation thread
     * @private
     */
    _createAnnotationThread(annotations, location, type) {
        if (type === HIGHLIGHT_ANNOTATION_TYPE) {
            const highlightThread = new HighlightThread({
                annotatedElement: this._annotatedElement,
                annotations,
                annotationService: this._annotationService,
                fileVersionID: this._fileVersionID,
                location,
                type
            });
            this._addThreadToMap(highlightThread);
            return highlightThread;
        }

        return super._createAnnotationThread(annotations, location, type);
    }

    /**
     * Returns whether or not annotator is in highlight mode.
     *
     * @returns {Boolean} Whether or not in highlight mode
     * @private
     */
    _isInHighlightMode() {
        return this._annotatedElement.classList.contains(constants.CLASS_ANNOTATION_HIGHLIGHT_MODE);
    }

    /**
     * Helper to remove a Rangy highlight by deleting the highlight in the
     * internal highlighter list that has a matching ID. We can't directly use
     * the highlighter's removeHighlights since the highlight could possibly
     * not be a true Rangy highlight object.
     *
     * @param {Object} highlight Highlight to delete.
     * @returns {void}
     * @private
     */
    _removeRangyHighlight(highlight) {
        const highlights = this._highlighter.highlights;
        if (!Array.isArray(highlights)) {
            return;
        }

        const matchingHighlights = highlights.filter((internalHighlight) => {
            return internalHighlight.id === highlight.id;
        });

        this._highlighter.removeHighlights(matchingHighlights);
    }
}

export default DocAnnotator;
