/**
 * @fileoverview Base document viewer class. The document and presentation
 * viewers extend this class.
 * @author tjin
 */

import autobind from 'autobind-decorator';
import AnnotationService from '../../annotations/annotation-service';
import Base from '../../base';
import Browser from '../../browser';
import cache from '../../cache';
import Controls from '../../controls';
import DocAnnotator from '../../annotations/doc/doc-annotator';
import DocFindBar from './doc-find-bar';
import fullscreen from '../../fullscreen';
import throttle from 'lodash.throttle';
import { CLASS_BOX_PREVIEW_FIND_BAR } from '../../constants';
import { get, createAssetUrlCreator, decodeKeydown } from '../../util';

const CURRENT_PAGE_MAP_KEY = 'doc-current-page-map';
const DEFAULT_SCALE_DELTA = 1.1;
const LOAD_TIMEOUT_MS = 300000; // 5 min timeout
const PRINT_TIMEOUT_MS = 1000; // Wait 1s before trying to print
const MAX_SCALE = 10.0;
const MIN_SCALE = 0.1;
const MIN_RANGE_REQUEST_SIZE_BYTES = 5242880; // 5MB
const PRESENTATION_MODE_STATE = {
    UNKNOWN: 0,
    NORMAL: 1,
    CHANGING: 2,
    FULLSCREEN: 3
};
const PRESENTATION_VIEWER_NAME = 'Presentation';
const RANGE_REQUEST_CHUNK_SIZE = 1048576; // 1MB
const SHOW_PAGE_NUM_INPUT_CLASS = 'show-page-number-input';
const WHEEL_THROTTLE = 200;

@autobind
class DocBase extends Base {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     *
     * @param {string|HTMLElement} container Container node
     * @param {object} [options] Some options
     * @returns {DocBase} DocBase instance
     */
    constructor(container, options) {
        super(container, options);
        this.docEl = this.containerEl.appendChild(document.createElement('div'));
        this.docEl.classList.add('box-preview-doc');

        this.viewerEl = this.docEl.appendChild(document.createElement('div'));
        this.viewerEl.classList.add('pdfViewer');
        this.loadTimeout = LOAD_TIMEOUT_MS;

        this.findBarEl = this.containerEl.appendChild(document.createElement('div'));
        this.findBarEl.classList.add(CLASS_BOX_PREVIEW_FIND_BAR);

        this.isPresentation = (this.options.viewerName === PRESENTATION_VIEWER_NAME);
    }

    /**
     * [destructor]
     *
     * @returns {void}
     */
    destroy() {
        this.unbindDOMListeners();

        // Clean up print blob
        this.printBlob = null;

        if (this.controls && typeof this.controls.destroy === 'function') {
            this.controls.destroy();
        }

        // Destroy the annotator
        if (this.annotator && typeof this.annotator.destroy === 'function') {
            this.annotator.removeAllListeners('pointmodeenter');
            this.annotator.removeAllListeners('pointmodeexit');
            this.annotator.destroy();
        }

        // Clean up the find bar
        if (this.findBar) {
            this.findBar.destroy();
        }

        // Clean up PDF network requests
        if (this.pdfLoadingTask) {
            try {
                this.pdfLoadingTask.destroy();
            } catch (e) {
                // Ignore these errors
            }
        }

        // Clean up viewer and PDF document object
        if (this.pdfViewer) {
            this.pdfViewer.cleanup();

            if (this.pdfViewer.pdfDocument) {
                this.pdfViewer.pdfDocument.destroy();
            }
        }

        super.destroy();
    }

    /**
     * Loads a document.
     *
     * @param {String} pdfUrl The pdf to load
     * @returns {Promise} Promise to load a pdf
     */
    load(pdfUrl) {
        this.pdfUrl = pdfUrl;

        this.setupPdfjs();
        this.initViewer(this.pdfUrl);
        this.initPrint();
        this.initFind();

        super.load();
    }

    /**
     * Initializes the Find Bar and Find Controller
     * @returns {void}
     */
    initFind() {
        if (!this.findBarEl) { // doesn't initialize find controller if find bar doesn't exists
            return;
        }

        this.findController = new PDFJS.PDFFindController({
            pdfViewer: this.pdfViewer
        });
        this.pdfViewer.setFindController(this.findController);
        this.findBar = new DocFindBar(this.findBarEl, this.findController);
    }

    /**
     * Prints the document by providing the PDF representation to the user.
     *
     * @returns {void}
     */
    print() {
        // If print blob is still not ready, explictitly fetch it
        if (!this.printBlob) {
            this.fetchPrintBlob(this.pdfUrl).then(this.print);
            return;
        }

        // For IE & Edge, use the open or save dialog since we can't open
        // in a new tab due to security restrictions, see:
        // http://stackoverflow.com/questions/24007073/open-links-made-by-createobjecturl-in-ie11
        if (typeof window.navigator.msSaveOrOpenBlob === 'function') {
            const printResult = window.navigator.msSaveOrOpenBlob(this.printBlob, 'print.pdf');

            // If open/save notification is not shown, broadcast error
            if (!printResult) {
                this.emit('printerror');
            } else {
                this.emit('printsuccess');
            }

        // For other browsers, open and print in a new tab
        } else {
            const printURL = URL.createObjectURL(this.printBlob);
            const printResult = window.open(printURL);

            // Open print popup if possible
            if (printResult && typeof printResult.print === 'function') {
                const browser = Browser.getName();

                // Chrome supports printing on load
                if (browser === 'Chrome') {
                    printResult.addEventListener('load', () => {
                        printResult.print();
                    });

                // Safari print on load produces blank page, so we use a timeout
                } else if (browser === 'Safari') {
                    setTimeout(() => {
                        printResult.print();
                    }, PRINT_TIMEOUT_MS);
                }

                // Firefox has a blocking bug: https://bugzilla.mozilla.org/show_bug.cgi?id=911444
            }

            // If new window/tab was blocked, broadcast error
            if (!printResult || printResult.closed || typeof printResult.closed === 'undefined') {
                this.emit('printerror');
            } else {
                this.emit('printsuccess');
            }

            URL.revokeObjectURL(printURL);
        }
    }

    /**
     * Re-sizing logic.
     *
     * @returns {void}
     */
    resize() {
        // Save page and return after resize
        const currentPageNumber = this.pdfViewer.currentPageNumber;

        this.pdfViewer.currentScaleValue = this.pdfViewer.currentScaleValue || 'auto';
        this.pdfViewer.update();

        this.setPage(currentPageNumber);

        // Redraw annotations if needed
        if (this.annotator) {
            this.annotator.setScale(this.pdfViewer.currentScale);
            this.reRenderAnnotations = true;
        }

        super.resize();
    }

    /**
     * Go to previous page
     *
     * @returns {void}
     */
    previousPage() {
        this.setPage(this.pdfViewer.currentPageNumber - 1);
    }

    /**
     * Go to next page
     *
     * @returns {void}
     */
    nextPage() {
        this.setPage(this.pdfViewer.currentPageNumber + 1);
    }

    /**
     * Go to specified page
     *
     * @param {number} pageNum Page to navigate to
     * @returns {void}
     */
    setPage(pageNum) {
        this.pdfViewer.currentPageNumber = pageNum;
        this.cachePage(this.pdfViewer.currentPageNumber);

        // Forces rendering of page - without this, fullscreen pages sometimes don't load
        if (fullscreen.isFullscreen(this.containerEl)) {
            this.pdfViewer.update();
        }
    }

    /**
     * Gets the cached current page.
     *
     * @returns {Number} Current page
     */
    getCachedPage() {
        let page = 1;

        if (cache.has(CURRENT_PAGE_MAP_KEY)) {
            const currentPageMap = cache.get(CURRENT_PAGE_MAP_KEY);
            page = currentPageMap[this.options.file.id] || page;
        }

        return page;
    }

    /**
     * Sets the current page into localstorage if available. Otherwise saves
     * it in-memory as a property on the document viewer.
     *
     * @param {Number} page Current page
     * @returns {void}
     */
    cachePage(page) {
        let currentPageMap = {};
        if (cache.has(CURRENT_PAGE_MAP_KEY)) {
            currentPageMap = cache.get(CURRENT_PAGE_MAP_KEY);
        }

        currentPageMap[this.options.file.id] = page;
        cache.set(CURRENT_PAGE_MAP_KEY, currentPageMap, true /* useLocalStorage */);
    }

    /**
     * Disables or enables previous/next pagination buttons depending on
     * current page number.
     *
     * @returns {void}
     */
    checkPaginationButtons() {
        const pagesCount = this.pdfViewer.pagesCount;
        const currentPageNum = this.pdfViewer.currentPageNumber;
        const pageNumButtonEl = this.containerEl.querySelector('.box-preview-doc-page-num');
        const previousPageButtonEl = this.containerEl.querySelector('.box-preview-previous-page');
        const nextPageButtonEl = this.containerEl.querySelector('.box-preview-next-page');

        // Disable page number selector for Safari fullscreen, see https://jira.inside-box.net/browse/COXP-997
        const isSafariFullscreen = Browser.getName() === 'Safari' && fullscreen.isFullscreen(this.containerEl);

        // Disable page number selector if there is only one page or less
        if (pageNumButtonEl) {
            if (pagesCount <= 1 || isSafariFullscreen) {
                pageNumButtonEl.disabled = true;
            } else {
                pageNumButtonEl.disabled = false;
            }
        }

        // Disable previous page if on first page, otherwise enable
        if (previousPageButtonEl) {
            if (currentPageNum === 1) {
                previousPageButtonEl.disabled = true;
            } else {
                previousPageButtonEl.disabled = false;
            }
        }

        // Disable next page if on last page, otherwise enable
        if (nextPageButtonEl) {
            if (currentPageNum === this.pdfViewer.pagesCount) {
                nextPageButtonEl.disabled = true;
            } else {
                nextPageButtonEl.disabled = false;
            }
        }
    }

    /**
     * Zoom into document.
     *
     * @param {Number} ticks Number of times to zoom in
     * @returns {void}
     */
    zoomIn(ticks = 1) {
        let numTicks = ticks;
        let newScale = this.pdfViewer.currentScale;
        do {
            newScale = (newScale * DEFAULT_SCALE_DELTA).toFixed(2);
            newScale = Math.ceil(newScale * 10) / 10;
            newScale = Math.min(MAX_SCALE, newScale);
        } while (--numTicks > 0 && newScale < MAX_SCALE);

        this.setScale(newScale);
    }

    /**
     * Zoom out of document.
     *
     * @param {Number} ticks Number of times to zoom out
     * @returns {void}
     */
    zoomOut(ticks = 1) {
        let numTicks = ticks;
        let newScale = this.pdfViewer.currentScale;
        do {
            newScale = (newScale / DEFAULT_SCALE_DELTA).toFixed(2);
            newScale = Math.floor(newScale * 10) / 10;
            newScale = Math.max(MIN_SCALE, newScale);
        } while (--numTicks > 0 && newScale > MIN_SCALE);

        this.setScale(newScale);
    }

    /**
     * Sets zoom scale.
     *
     * @param {Number} scale Numerical zoom scale
     * @returns {void}
     */
    setScale(scale) {
        // Redraw annotations if needed
        if (this.annotator) {
            this.annotator.setScale(scale);
            this.reRenderAnnotations = true;
        }

        this.pdfViewer.currentScaleValue = scale;
    }

    /**
     * Rotates documents by delta degrees
     *
     * @param {number} delta Degrees to rotate
     * @returns {void}
     */
    rotateLeft(delta = -90) {
        const currentPageNum = this.pdfViewer.currentPageNumber;

        // Calculate and set rotation
        this.pageRotation = this.pageRotation || 0;
        this.pageRotation = (this.pageRotation + 360 + delta) % 360;
        this.pdfViewer.pagesRotation = this.pageRotation;

        // Re-render and scroll to appropriate page
        this.pdfViewer.update();
        this.setPage(currentPageNum);
    }

    /**
     * Enters or exits fullscreen.
     *
     * @returns {void}
     */
    toggleFullscreen() {
        super.toggleFullscreen();
        this.pdfViewer.presentationModeState = PRESENTATION_MODE_STATE.CHANGING;
    }

    /**
     * Returns whether or not viewer is annotatable with the provided annotation
     * type.
     *
     * @param {String} type Type of annotation
     * @returns {Boolean} Whether or not viewer is annotatable
     */
    isAnnotatable(type) {
        if (type !== 'point' && type !== 'highlight') {
            return false;
        }

        const viewerName = this.options.viewerName;
        return this.options.viewers && this.options.viewers[viewerName] &&
            this.options.viewers[viewerName].annotations;
    }

    /**
     * Returns click handler for toggling point annotation mode.
     *
     * @returns {Function|null} Click handler
     */
    getPointModeClickHandler() {
        if (!this.isAnnotatable('point')) {
            return null;
        }

        return this.annotator.togglePointModeHandler;
    }

    /**
     * Handles keyboard events for document viewer.
     *
     * @param {String} key keydown key
     * @returns {Boolean} consumed or not
     */
    onKeydown(key) {
        switch (key) {
            case 'ArrowLeft':
                this.previousPage();
                break;
            case 'ArrowRight':
                this.nextPage();
                break;
            case '[':
                this.previousPage();
                break;
            case ']':
                this.nextPage();
                break;
            default:
                return false;
        }

        return true;
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Sets options for PDF.js.
     *
     * @returns {void}
     * @private
     */
    setupPdfjs() {
        // Disable worker in IE and Edge due to a CORS origin bug: https://goo.gl/G9iR54
        if (Browser.getName() === 'Edge' || Browser.getName() === 'Explorer') {
            PDFJS.disableWorker = true;
        }

        // Set PDFJS worker & character maps
        const assetUrlCreator = createAssetUrlCreator(this.options.location);
        PDFJS.workerSrc = assetUrlCreator('third-party/doc/pdf.worker.js');
        PDFJS.cMapUrl = `${this.options.location.staticBaseURI}third-party/doc/cmaps/`;
        PDFJS.cMapPacked = true;

        // Open links in new tab
        PDFJS.externalLinkTarget = PDFJS.LinkTarget.BLANK;

        // Disable range requests for files smaller than the minimum size
        PDFJS.disableRange = (this.options.file && this.options.file.size) ?
            this.options.file.size < MIN_RANGE_REQUEST_SIZE_BYTES :
            false;

        // Disable range requests for Safari, see: https://github.com/mozilla/pdf.js/issues/4927
        PDFJS.disableRange = PDFJS.disableRange || Browser.getName() === 'Safari';

        // Disable range requests for watermarked files since they are streamed
        PDFJS.disableRange = PDFJS.disableRange ||
            (this.options.file.watermark_info && this.options.file.watermark_info.is_watermarked);

        // Disable text layer if user doesn't have download permissions
        PDFJS.disableTextLayer = this.options.file && this.options.file.permissions ?
            !this.options.file.permissions.can_download :
            false;
    }

    /**
     * Loads PDF.js with provided PDF.
     *
     * @param {String} pdfUrl The URL of the PDF to load
     * @returns {void}
     * @private
     */
    initViewer(pdfUrl) {
        // Initialize PDF.js in container
        this.pdfViewer = new PDFJS.PDFViewer({
            container: this.docEl,
            linkService: new PDFJS.PDFLinkService()
        });

        // Overwrite scrollPageIntoView for presentations since we have custom pagination
        if (this.isPresentation) {
            this.pdfViewer.scrollPageIntoView = this.setPage;
        }

        // Load PDF from representation URL
        this.pdfLoadingTask = PDFJS.getDocument({
            url: pdfUrl,
            httpHeaders: this.appendAuthHeader(),
            rangeChunkSize: RANGE_REQUEST_CHUNK_SIZE
        });

        // Set document for PDF.js
        this.pdfLoadingTask.then((doc) => {
            this.pdfViewer.setDocument(doc);

            const linkService = this.pdfViewer.linkService;
            if (linkService instanceof PDFJS.PDFLinkService) {
                linkService.setDocument(doc, pdfUrl);
                linkService.setViewer(this.pdfViewer);
            }
        }).catch((err) => {
            /* eslint-disable no-console */
            console.log(err);
            /* eslint-enable no-console */
            this.emit('error', err);
        });

        this.bindDOMListeners();
    }

    /**
     * Sets up print notification & prepare PDF for printing.
     *
     * @returns {void}
     * @private
     */
    initPrint() {
        const printNotificationEl = document.createElement('p');
        printNotificationEl.classList.add('box-preview-print-notification');
        printNotificationEl.textContent = __('print_notification');
        this.containerEl.appendChild(printNotificationEl);

        this.fetchPrintBlob(this.pdfUrl);
    }

    /**
     * Initializes annotations.
     *
     * @returns {void}
     * @private
     */
    initAnnotations() {
        const fileVersionID = this.options.file.file_version.id;
        // Users can currently only view annotations on mobile
        const canAnnotate = !!this.options.file.permissions.can_annotate && !Browser.isMobile();
        const annotationService = new AnnotationService({
            api: this.options.api,
            fileID: this.options.file.id,
            token: this.options.token,
            canAnnotate
        });

        // Construct and init annotator
        this.annotator = new DocAnnotator({
            annotatedElement: this.docEl,
            annotationService,
            fileVersionID
        });
        this.annotator.init();
        this.annotator.setScale(this.pdfViewer.currentScale);

        // Disable controls during point annotation mode
        this.annotator.addListener('pointmodeenter', () => {
            if (this.controls) {
                this.controls.disable();
            }
        });

        this.annotator.addListener('pointmodeexit', () => {
            this.annotator.exitPointMode();

            if (this.controls) {
                this.controls.enable();
            }
        });
    }

    /**
     * Initializes page number selector.
     *
     * @returns {void}
     * @private
     */
    initPageNumEl() {
        const pageNumEl = this.controls.controlsEl.querySelector('.box-preview-doc-page-num');

        // Update total page number
        const totalPageEl = pageNumEl.querySelector('.box-preview-doc-total-pages');
        totalPageEl.textContent = this.pdfViewer.pagesCount;

        // Keep reference to page number input and current page elements
        this.pageNumInputEl = pageNumEl.querySelector('.box-preview-doc-page-num-input');
        this.currentPageEl = pageNumEl.querySelector('.box-preview-doc-current-page');
    }

    /**
     * Fetches PDF and converts to blob for printing.
     *
     * @param {String} pdfUrl URL to PDF
     * @returns {Promise} Promise setting print blob
     * @private
     */
    fetchPrintBlob(pdfUrl) {
        return get(pdfUrl, this.appendAuthHeader(), 'blob').then((blob) => {
            this.printBlob = blob;
        });
    }

    /**
     * Creates UI for preview controls.
     *
     * @returns {void}
     * @private
     */
    loadUI() {
        this.controls = new Controls(this.containerEl);
        this.bindControlListeners();
        this.initPageNumEl();
    }

	/**
	 * Replaces the page number display with an input box that allows the user to type in a page number
     *
	 * @returns {void}
     * @private
	 */
    showPageNumInput() {
        // show the input box with the current page number selected within it
        this.controls.controlsEl.classList.add(SHOW_PAGE_NUM_INPUT_CLASS);

        this.pageNumInputEl.value = this.currentPageEl.textContent;
        this.pageNumInputEl.focus();
        this.pageNumInputEl.select();

        // finish input when input is blurred or enter key is pressed
        this.pageNumInputEl.addEventListener('blur', this.pageNumInputBlurHandler);
        this.pageNumInputEl.addEventListener('keydown', this.pageNumInputKeydownHandler);
    }

    /**
	 * Hide the page number input
	 *
	 * @returns {void}
     * @private
	 */
    hidePageNumInput() {
        this.controls.controlsEl.classList.remove(SHOW_PAGE_NUM_INPUT_CLASS);
        this.pageNumInputEl.removeEventListener('blur', this.pageNumInputBlurHandler);
        this.pageNumInputEl.removeEventListener('keydown', this.pageNumInputKeydownHandler);
    }

    /**
     * Update page number in page control widget.
     *
     * @param {number} pageNum Nubmer of page to update to
     * @returns {void}
     * @private
     */
    updateCurrentPage(pageNum) {
        let truePageNum = pageNum;
        const pagesCount = this.pdfViewer.pagesCount;

        // refine the page number to fall within bounds
        if (pageNum > pagesCount) {
            truePageNum = pagesCount;
        } else if (pageNum < 1) {
            truePageNum = 1;
        }

        if (this.pageNumInputEl) {
            this.pageNumInputEl.value = truePageNum;
        }

        if (this.currentPageEl) {
            this.currentPageEl.textContent = truePageNum;
        }

        this.checkPaginationButtons();
    }

    //--------------------------------------------------------------------------
    // Event Listeners
    //--------------------------------------------------------------------------

    /**
     * Binds DOM listeners for document viewer.
     *
     * @returns {void}
     * @protected
     */
    bindDOMListeners() {
        // When page structure is initialized, set default zoom, load controls,
        // and broadcast that preview has loaded
        this.docEl.addEventListener('pagesinit', this.pagesinitHandler);

        // When a page is rendered, rerender annotations if needed
        this.docEl.addEventListener('pagerendered', this.pagerenderedHandler);

        // When text layer is rendered, show annotations if enabled
        this.docEl.addEventListener('textlayerrendered', this.textlayerrenderedHandler);

        // Update page number when page changes
        this.docEl.addEventListener('pagechange', this.pagechangeHandler);

        // We set passive: true to make page more responsive
        this.docEl.addEventListener('wheel', this.wheelHandler(), { passive: true });

        // Fullscreen
        fullscreen.addListener('enter', this.enterfullscreenHandler);
        fullscreen.addListener('exit', this.exitfullscreenHandler);
    }

    /**
     * Unbinds DOM listeners for document viewer.
     *
     * @returns {void}
     * @protected
     */
    unbindDOMListeners() {
        if (this.docEl) {
            this.docEl.removeEventListener('pagesinit', this.pagesinitHandler);
            this.docEl.removeEventListener('pagerendered', this.pagerenderedHandler);
            this.docEl.removeEventListener('pagechange', this.pagechangeHandler);
            this.docEl.removeEventListener('textlayerrendered', this.textlayerrenderedHandler);

            // We set passive: true to make page more responsive
            this.docEl.removeEventListener('wheel', this.wheelHandler(), { passive: true });
        }

        fullscreen.removeListener('enter', this.enterfullscreenHandler);
        fullscreen.removeListener('exit', this.exitfullscreenHandler);
    }

    /**
     * Binds listeners for document controls. Overridden.
     *
     * @returns {void}
     * @protected
     */
    bindControlListeners() {}

    /**
	 * Blur handler for page number input.
     *
	 * @param  {Event} event Blur event
	 * @returns {void}
     * @private
	 */
    pageNumInputBlurHandler(event) {
        const target = event.target;
        const pageNum = parseInt(target.value, 10);

        if (!isNaN(pageNum)) {
            this.setPage(pageNum);
        }

        this.hidePageNumInput();
    }

	/**
	 * Keydown handler for page number input.
     *
	 * @param {Event} event Keydown event
	 * @returns {void}
     * @private
	 */
    pageNumInputKeydownHandler(event) {
        const key = decodeKeydown(event);

        switch (key) {
            case 'Enter':
                // We normally trigger the blur handler by blurring the input
                // field, but this doesn't work for IE in fullscreen. For IE,
                // we blur the page behind the controls - this unfortunately
                // is an IE-only solution that doesn't work with other browsers
                if (Browser.getName() === 'Explorer') {
                    this.docEl.focus();
                } else {
                    event.target.blur();
                }

                event.stopPropagation();
                event.preventDefault();
                break;

            case 'Esc':
                this.hidePageNumInput();
                this.docEl.focus();

                event.stopPropagation();
                event.preventDefault();
                break;
            default:
                return;
        }
    }

    /**
     * Handler for 'pagesinit' event.
     *
     * @returns {void}
     * @private
     */
    pagesinitHandler() {
        this.pdfViewer.currentScaleValue = 'auto';

        // Initialize annotations before other UI
        // @TODO maybe this should move out to individual viewers
        if ((this.options.viewers.Document && this.options.viewers.Document.annotations) ||
            (this.options.viewers.Presentation && this.options.viewers.Presentation.annotations)) {
            this.initAnnotations();
        }

        this.loadUI();
        this.checkPaginationButtons();

        // Set current page to previously opened page or first page
        this.setPage(this.getCachedPage());

        // Broadcast that preview has loaded
        if (!this.loaded) {
            this.loaded = true;
            this.emit('load');
        }
    }

    /**
     * Handler for 'pagerendered' event.
     *
     * @returns {void}
     * @private
     */
    pagerenderedHandler() {
        if (this.annotator && this.reRenderAnnotations) {
            this.annotator.renderAnnotations();
            this.reRenderAnnotations = false;
        }
    }

    /**
     * Handler for 'textlayerrendered' event.
     *
     * @returns {void}
     * @private
     */
    textlayerrenderedHandler() {
        if (!this.annotator || this.annotationsLoaded) {
            return;
        }

        // Show existing annotations after text layer is rendered
        this.annotator.showAnnotations();
        this.annotationsLoaded = true;
    }

    /**
     * Handler for 'pagechange' event.
     *
     * @param {Event} event Pagechange event
     * @returns {void}
     * @private
     */
    pagechangeHandler(event) {
        const pageNum = event.pageNumber;
        this.updateCurrentPage(pageNum);

        // We only set cache the current page if 'pagechange' was fired after
        // preview is loaded - this filters out pagechange events fired by
        // the viewer's initialization
        if (this.loaded) {
            this.cachePage(pageNum);
        }
    }

    /**
     * Fullscreen entered handler. Add presentation mode class, set
     * presentation mode state, and set zoom to fullscreen zoom.
     *
     * @returns {void}
     * @private
     */
    enterfullscreenHandler() {
        this.pdfViewer.presentationModeState = PRESENTATION_MODE_STATE.FULLSCREEN;
        this.pdfViewer.currentScaleValue = 'page-fit';

        // Force resize for annotations
        this.resize();
    }

    /**
     * Fullscreen exited handler. Remove presentation mode class, set
     * presentation mode state, and reset zoom.
     *
     * @returns {void}
     * @private
     */
    exitfullscreenHandler() {
        this.pdfViewer.presentationModeState = PRESENTATION_MODE_STATE.NORMAL;
        this.pdfViewer.currentScaleValue = 'auto';

        // Force resize for annotations
        this.resize();
    }

    /**
     * Mousewheel handler - scrolls presentations by page
     *
     * @returns {Function} Throttled mousewheel handler
     * @private
     */
    wheelHandler() {
        if (!this.throttledWheelHandler) {
            this.throttledWheelHandler = throttle((event) => {
                if (event.deltaY > 0) {
                    this.nextPage();
                } else if (event.deltaY < 0) {
                    this.previousPage();
                }
            }, WHEEL_THROTTLE);
        }

        return this.throttledWheelHandler;
    }
}

export default DocBase;
