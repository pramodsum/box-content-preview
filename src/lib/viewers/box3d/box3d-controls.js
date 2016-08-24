import EventEmitter from 'events';
import Controls from '../../controls';
import autobind from 'autobind-decorator';

import {
    EVENT_RESET,
    EVENT_SCENE_LOADED,
    EVENT_TOGGLE_FULLSCREEN,
    EVENT_TOGGLE_VR
} from './box3d-constants';

import {
    ICON_FULLSCREEN_IN,
    ICON_FULLSCREEN_OUT,
    ICON_3D_VR
} from '../../icons/icons';

import { CLASS_HIDDEN } from '../../constants';
import { UIRegistry } from './box3d-ui-utils';

@autobind
class Box3DControls extends EventEmitter {

    /**
     * Base class for building 3D previews on. Contains events for VR, Fullscreen,
     * Scene Reset, and Scene Loaded. Also, used for programmatic building of control
     * bar UI.
     * @constructor
     * @param {HTMLElement} containerEl The container element to put controls ui into
     * @returns {Box3DControls} Instance of Box3DControls
     */
    constructor(containerEl) {
        super();

        this.el = containerEl;
        this.controls = new Controls(this.el);

        this.uiRegistry = new UIRegistry();
    }

    /**
     * Add and create any UI to the container element and control bar
     * @returns {void}
     */
    addUi() {
        this.addVRButton();
        this.addFullscreenButton();
        this.hideVrButton();
    }

    /**
     * Adds full screen button
     * @returns {void}
     */
    addFullscreenButton() {
        this.controls.add(__('enter_fullscreen'), this.handleToggleFullscreen, 'box-preview-enter-fullscreen-icon', ICON_FULLSCREEN_IN);
        this.controls.add(__('exit_fullscreen'), this.handleToggleFullscreen, 'box-preview-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
    }

    /**
     * Adds vr toggle button
     * @returns {void}
     */
    addVRButton() {
        this.vrButtonEl = this.controls.add(__('box3d_toggle_vr'), this.handleToggleVr, '', ICON_3D_VR);
    }

    /**
     * Emit scene loaded message
     * @returns {void}
     */
    handleSceneLoaded() {
        this.emit(EVENT_SCENE_LOADED);
    }

    /**
     * Handle a toggle of VR event, and emit a message
     * @returns {void}
     */
    handleToggleVr() {
        this.emit(EVENT_TOGGLE_VR);
    }

    /**
     * Handle toggling fullscreen, and update control bar items
     * @returns {[type]} [description]
     */
    handleToggleFullscreen() {
        this.emit(EVENT_TOGGLE_FULLSCREEN);
    }

    /**
     * Send a reset event message
     * @returns {void}
     */
    handleReset() {
        this.emit(EVENT_RESET);
    }

    /**
     * Enables the VR button
     * @returns {void}
     */
    showVrButton() {
        if (this.vrButtonEl) {
            this.vrButtonEl.classList.remove(CLASS_HIDDEN);
        }
    }

    /**
     * Disables the VR button
     * @returns {void}
     */
    hideVrButton() {
        if (this.vrButtonEl) {
            this.vrButtonEl.classList.add(CLASS_HIDDEN);
        }
    }

    /**
     * Set visibility of an element
     * @param {HTMLElement} element The element we are setting visibility on
     * @param {Boolean} visible True for visible, false for hidden
     * @returns {void}
     */
    setElementVisibility(element, visible) {
        if (visible) {
            element.classList.remove(CLASS_HIDDEN);
        } else {
            element.classList.add(CLASS_HIDDEN);
        }
    }

    /**
     * Toggle the visibility of an elements
     * @param {HTMLElement} element The element we want to toggle visibility on
     * @returns {void}
     */
    toggleElementVisibility(element) {
        element.classList.toggle(CLASS_HIDDEN);
    }

    /**
     * Destroy all controls, and this module
     * @returns {void}
     */
    destroy() {
        if (this.controls) {
            this.controls.destroy();
        }
        this.uiRegistry.unregisterUiItems();
        this.uiRegistry = null;
    }

}

export default Box3DControls;