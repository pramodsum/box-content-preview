import BaseViewer from '../BaseViewer';
import Browser from '../../Browser';
import { VIEWER_EVENT } from '../../events';
import { PERMISSION_DOWNLOAD } from '../../constants';
import { get, appendQueryParams, getHeaders } from '../../util';
import { checkPermission, getDownloadURL } from '../../file';
import ScratchCanvas from './ScratchCanvas';
import './ScratchViewer.scss';

const CSS_CLASS_PANNING = 'panning';
const CSS_CLASS_ZOOMABLE = 'zoomable';
const CSS_CLASS_PANNABLE = 'pannable';
const CSS_CLASS_SCRATCH_VIEWER = 'bp-scratch-viewer';

const MODES = {
    none: 0,
    line: 1
};

let lastX = 0;
let lastY = 0;
// used to determine if we are allowed to draw
let isDrawing = false;

class ScratchViewer extends BaseViewer {
    mode = MODES.line;

    /** @inheritdoc */
    constructor(options) {
        super(options);

        // Explicit event handler bindings
        this.pan = this.pan.bind(this);
        this.stopPanning = this.stopPanning.bind(this);
        this.zoomIn = this.zoomIn.bind(this);
        this.zoomOut = this.zoomOut.bind(this);

        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);

        this.cancelDragEvent = this.cancelDragEvent.bind(this);
        this.finishLoading = this.finishLoading.bind(this);
        this.errorHandler = this.errorHandler.bind(this);

        if (this.isMobile) {
            if (Browser.isIOS()) {
                this.mobileZoomStartHandler = this.mobileZoomStartHandler.bind(this);
                this.mobileZoomEndHandler = this.mobileZoomEndHandler.bind(this);
            } else {
                this.mobileZoomStartHandler = this.mobileZoomStartHandler.bind(this);
                this.mobileZoomChangeHandler = this.mobileZoomChangeHandler.bind(this);
                this.mobileZoomEndHandler = this.mobileZoomEndHandler.bind(this);
            }
        }
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        this.unbindDOMListeners();

        // Destroy the controls
        if (this.controls && typeof this.controls.destroy === 'function') {
            this.controls.destroy();
        }

        super.destroy();
    }

    /**
     * Builds a list of required XHR headers.
     *
     * @private
     * @param {string} [token] - Access token
     * @return {Object} Headers
     */
    getRequestHeaders(token) {
        return getHeaders({}, token || this.options.token, this.options.sharedLink, this.options.sharedLinkPassword);
    }

    setup() {
        // Call super() to set up common layout
        super.setup();

        this.wrapperEl = this.containerEl.appendChild(document.createElement('div'));
        this.wrapperEl.classList.add(CSS_CLASS_SCRATCH_VIEWER);

        this.imageEl = document.createElement('img');
        this.imageEl.crossOrigin = 'Anonymous';
        this.canvas = new ScratchCanvas(this.wrapperEl);
        this.canvas.hide();
    }

    /**
     * Loads a Scratch.
     *
     * @return {void}
     */
    load() {
        this.setup();
        super.load();

        const { apiHost, queryParams, file } = this.options;
        this.bindDOMListeners();

        if (checkPermission(file, PERMISSION_DOWNLOAD)) {
            // Append optional query params
            const downloadUrl = appendQueryParams(getDownloadURL(file.id, apiHost), queryParams);
            get(downloadUrl, this.getRequestHeaders()).then((data) => {
                this.imageEl.src = data.download_url;
            });
        }
    }

    /**
     * Finishes loading the images.
     *
     * @return {void}
     */
    finishLoading() {
        if (this.isDestroyed()) {
            return;
        }

        this.loaded = true;
        this.emit(VIEWER_EVENT.load);
        this.canvas.resize(this.imageEl.width, this.imageEl.height);
        this.canvas.renderImage(this.imageEl);
        this.canvas.show();
    }

    /**
     * Zooms in.
     *
     * @return {void}
     */
    zoomIn() {
        this.zoom('in');
    }

    /**
     * Zooms out.
     *
     * @return {void}
     */
    zoomOut() {
        this.zoom('out');
    }

    /**
     * Resize image by calling zoom.
     *
     * @return {void}
     */
    resize() {
        this.canvas.resize();
        super.resize();
    }

    /**
     * Start panning the image if the image is pannable
     *
     * @param {number} x - The initial x position of the mouse
     * @param {number} y - The initial y position of the mouse
     * @return {void}
     */
    startPanning(x, y) {
        if (!this.isPannable) {
            return;
        }

        this.panStartX = x;
        this.panStartY = y;
        this.panStartScrollLeft = this.wrapperEl.scrollLeft;
        this.panStartScrollTop = this.wrapperEl.scrollTop;

        document.addEventListener('mousemove', this.pan);
        document.addEventListener('mouseup', this.stopPanning);
        this.imageEl.classList.add(CSS_CLASS_PANNING);

        this.isPanning = true;
        this.emit('panstart');
    }

    /**
     * Pan the image to the given x/y position
     *
     * @private
     * @param {Event} event - The mousemove event
     * @return {void}
     */
    pan(event) {
        if (!this.isPanning) {
            return;
        }
        const offsetX = event.clientX - this.panStartX;
        const offsetY = event.clientY - this.panStartY;

        this.wrapperEl.scrollLeft = this.panStartScrollLeft - offsetX;
        this.wrapperEl.scrollTop = this.panStartScrollTop - offsetY;
        this.didPan = true;
        this.emit('pan');
    }

    /**
     * Stop panning the image
     *
     * @private
     * @return {void}
     */
    stopPanning() {
        document.removeEventListener('mousemove', this.pan);
        document.removeEventListener('mouseup', this.stopPanning);
        this.imageEl.classList.remove(CSS_CLASS_PANNING);
        this.isPanning = false;
        this.emit('panend');
    }

    /**
     * Updates cursors on image content
     *
     * @private
     * @return {void}
     */
    updateCursor() {
        if (this.isPannable) {
            this.isZoomable = false;
            this.imageEl.classList.add(CSS_CLASS_PANNABLE);
            this.imageEl.classList.remove(CSS_CLASS_ZOOMABLE);
        } else {
            this.isZoomable = true;
            this.imageEl.classList.remove(CSS_CLASS_PANNABLE);
            this.imageEl.classList.add(CSS_CLASS_ZOOMABLE);
        }
    }

    /**
     * Adds UI controls
     *
     * @private
     * @return {void}
     */
    loadUI() {
        // this.controls = new Controls(this.containerEl);
        this.bindControlListeners();
    }

    //--------------------------------------------------------------------------
    // Event Listeners
    //--------------------------------------------------------------------------

    /**
     * Bind event listeners for document controls
     *
     * @private
     * @return {void}
     */
    bindControlListeners() {
        // this.controls.add(__('zoom_out'), this.zoomOut, 'bp-image-zoom-out-icon', ICON_ZOOM_OUT);
        // this.controls.add(__('zoom_in'), this.zoomIn, 'bp-image-zoom-in-icon', ICON_ZOOM_IN);
    }

    /**
     * Binds DOM listeners for image viewers.
     *
     * @protected
     * @return {void}
     */
    bindDOMListeners() {
        this.imageEl.addEventListener('load', this.finishLoading);
        this.imageEl.addEventListener('error', this.errorHandler);

        this.wrapperEl.addEventListener('mousedown', this.handleMouseDown);
        this.wrapperEl.addEventListener('mouseup', this.handleMouseUp);
        this.wrapperEl.addEventListener('mousemove', this.handleMouseMove);

        // this.imageEl.addEventListener('mousedown', this.handleMouseDown);
        // this.imageEl.addEventListener('mouseup', this.handleMouseUp);
        // this.imageEl.addEventListener('dragstart', this.cancelDragEvent);

        // if (this.isMobile) {
        //     this.imageEl.addEventListener('orientationchange', this.handleOrientationChange);

        //     if (Browser.isIOS()) {
        //         this.imageEl.addEventListener('gesturestart', this.mobileZoomStartHandler);
        //         this.imageEl.addEventListener('gestureend', this.mobileZoomEndHandler);
        //     } else {
        //         this.imageEl.addEventListener('touchstart', this.mobileZoomStartHandler);
        //         this.imageEl.addEventListener('touchmove', this.mobileZoomChangeHandler);
        //         this.imageEl.addEventListener('touchend', this.mobileZoomEndHandler);
        //     }
        // }
    }

    /**
     * Unbinds DOM listeners for image viewers.
     *
     * @protected
     * @return {void}
     */
    unbindDOMListeners() {
        document.removeEventListener('mousemove', this.pan);
        document.removeEventListener('mouseup', this.stopPanning);

        if (!this.imageEl) {
            return;
        }

        this.imageEl.removeEventListener('mousedown', this.handleMouseDown);
        this.imageEl.removeEventListener('mouseup', this.handleMouseUp);
        this.imageEl.removeEventListener('dragstart', this.cancelDragEvent);

        this.imageEl.removeEventListener('gesturestart', this.mobileZoomStartHandler);
        this.imageEl.removeEventListener('gestureend', this.mobileZoomEndHandler);
        this.imageEl.removeEventListener('touchstart', this.mobileZoomStartHandler);
        this.imageEl.removeEventListener('touchmove', this.mobileZoomChangeHandler);
        this.imageEl.removeEventListener('touchend', this.mobileZoomEndHandler);
    }

    /**
     * Handles image element loading errors.
     *
     * @private
     * @param {Error} err - Error to handle
     * @return {void}
     */
    errorHandler(err) {
        /* eslint-disable no-console */
        console.error(err);
        /* eslint-enable no-console */

        // Display a generic error message but log the real one
        const error = err;
        if (err instanceof Error) {
            error.displayMessage = __('error_refresh');
        }
        this.emit('error', error);
    }

    /**
     * Handles keyboard events for media
     *
     * @private
     * @param {string} key - Keydown key
     * @return {boolean} Consumed or not
     */
    onKeydown(key) {
        // Return false when media controls are not ready or are focused
        if (!this.controls) {
            return false;
        }

        if (key === 'Shift++') {
            this.zoomIn();
            return true;
        } else if (key === 'Shift+_') {
            this.zoomOut();
            return true;
        }

        return false;
    }

    /**
     * Handles mouse down event.
     *
     * @param {Event} event - The mousemove event
     * @return {void}
     */
    handleMouseDown(event) {
        const { button, ctrlKey, metaKey, offsetX, offsetY } = event;

        lastX = offsetX;
        lastY = offsetY;
        isDrawing = true;

        switch (this.mode) {
            case MODES.line:
                break;
            case MODES.none:
            default:
                console.log('yay, nothing');
        }
    }

    /**
     * Handles mouse up event.
     *
     * @param {Event} event - The mousemove event
     * @return {void}
     */
    handleMouseUp(event) {
        isDrawing = false;

        const { button, ctrlKey, metaKey } = event;

        // If this is not a left click, then ignore
        // If this is a CTRL or CMD click, then ignore
        if ((typeof button !== 'number' || button < 2) && !ctrlKey && !metaKey) {
            if (!this.isPannable && this.isZoomable) {
                // If the mouse up was not due to panning, and the image is zoomable, then zoom in.
                this.zoom('in');
            } else if (!this.didPan) {
                // If the mouse up was not due to ending of panning, then assume it was a regular
                // click mouse up. In that case reset the image size, mimicking single-click-unzoom.
                this.zoom('reset');
            }
            event.preventDefault();
        }
    }

    handleMouseMove(event) {
        if (!isDrawing) {
            return;
        }

        const { button, ctrlKey, metaKey, offsetX, offsetY } = event;

        switch (this.mode) {
            case MODES.line:
                this.canvas.bezierTo(lastX, lastY, offsetX, offsetY);
                break;
            case MODES.none:
            default:
                console.log('yay, nothing');
        }

        lastX = offsetX;
        lastY = offsetY;
    }

    /**
     * Prevents drag events on the image
     *
     * @param {Event} event - The mousemove event
     * @return {void}
     */
    cancelDragEvent(event) {
        event.preventDefault();
        event.stopPropagation();
    }

    //--------------------------------------------------------------------------
    // Abstract
    //--------------------------------------------------------------------------

    /**
     * Must be implemented to zoom image.
     *
     * @return {void}
     */
    zoom() {}
}

export default ScratchViewer;
