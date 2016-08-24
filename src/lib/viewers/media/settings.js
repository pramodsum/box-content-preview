import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import cache from '../../cache';
import { insertTemplate } from '../../util';
import { ICON_ARROW_LEFT, ICON_ARROW_RIGHT, ICON_CHECK_MARK } from '../../icons/icons';

const CLASS_SETTINGS = 'box-preview-media-settings';
const CLASS_SETTINGS_SELECTED = 'box-preview-media-settings-selected';
const CLASS_SETTINGS_OPEN = 'box-preview-media-settings-is-open';
const SELECTOR_SETTINGS_SUB_ITEM = '.box-preview-media-settings-sub-item';
const SELECTOR_SETTINGS_VALUE = '.box-preview-media-settings-value';

const SETTINGS_TEMPLATE = `<div class="box-preview-media-settings">
    <div class="box-preview-media-settings-item box-preview-media-settings-item-speed" data-type="speed">
        <div class="box-preview-media-settings-label">${__('media_speed')}</div>
        <div class="box-preview-media-settings-value">${__('media_speed_normal')}</div>
        <div class="box-preview-media-settings-arrow">${ICON_ARROW_RIGHT}</div>
    </div>
    <div class="box-preview-media-settings-item box-preview-media-settings-item-quality" data-type="quality">
        <div class="box-preview-media-settings-label">${__('media_quality')}</div>
        <div class="box-preview-media-settings-value">${__('media_quality_auto')}</div>
        <div class="box-preview-media-settings-arrow">${ICON_ARROW_RIGHT}</div>
    </div>
    <div class="box-preview-media-settings-sub-item box-preview-media-settings-options-speed box-preview-media-settings-sub-item-speed" data-type="menu">
        <div class="box-preview-media-settings-arrow">${ICON_ARROW_LEFT}</div>
        <div class="box-preview-media-settings-label">${__('media_speed')}</div>
    </div>
    <div class="box-preview-media-settings-sub-item box-preview-media-settings-options-speed" data-type="speed" data-value="0.25">
        <div class="box-preview-media-settings-icon">${ICON_CHECK_MARK}</div>
        <div class="box-preview-media-settings-value">0.25</div>
    </div>
    <div class="box-preview-media-settings-sub-item box-preview-media-settings-options-speed" data-type="speed" data-value="0.5">
        <div class="box-preview-media-settings-icon">${ICON_CHECK_MARK}</div>
        <div class="box-preview-media-settings-value">0.5</div>
    </div>
    <div class="box-preview-media-settings-sub-item box-preview-media-settings-options-speed box-preview-media-settings-selected" data-type="speed" data-value="1.0">
        <div class="box-preview-media-settings-icon">${ICON_CHECK_MARK}</div>
        <div class="box-preview-media-settings-value">${__('media_speed_normal')}</div>
    </div>
    <div class="box-preview-media-settings-sub-item box-preview-media-settings-options-speed" data-type="speed" data-value="1.25">
        <div class="box-preview-media-settings-icon">${ICON_CHECK_MARK}</div>
        <div class="box-preview-media-settings-value">1.25</div>
    </div>
    <div class="box-preview-media-settings-sub-item box-preview-media-settings-options-speed" data-type="speed" data-value="1.5">
        <div class="box-preview-media-settings-icon">${ICON_CHECK_MARK}</div>
        <div class="box-preview-media-settings-value">1.5</div>
    </div>
    <div class="box-preview-media-settings-sub-item box-preview-media-settings-options-speed" data-type="speed" data-value="2.0">
        <div class="box-preview-media-settings-icon">${ICON_CHECK_MARK}</div>
        <div class="box-preview-media-settings-value">2.0</div>
    </div>
    <div class="box-preview-media-settings-sub-item box-preview-media-settings-options-quality box-preview-media-settings-sub-item-quality" data-type="menu">
        <div class="box-preview-media-settings-arrow">${ICON_ARROW_LEFT}</div>
        <div class="box-preview-media-settings-label">${__('media_quality')}</div>
    </div>
    <div class="box-preview-media-settings-sub-item box-preview-media-settings-options-quality" data-type="quality" data-value="sd">
        <div class="box-preview-media-settings-icon">${ICON_CHECK_MARK}</div>
        <div class="box-preview-media-settings-value">480p</div>
    </div>
    <div class="box-preview-media-settings-sub-item box-preview-media-settings-options-quality" data-type="quality" data-value="hd">
        <div class="box-preview-media-settings-icon">${ICON_CHECK_MARK}</div>
        <div class="box-preview-media-settings-value">1080p</div>
    </div>
    <div class="box-preview-media-settings-sub-item box-preview-media-settings-options-quality box-preview-media-settings-selected" data-type="quality" data-value="auto">
        <div class="box-preview-media-settings-icon">${ICON_CHECK_MARK}</div>
        <div class="box-preview-media-settings-value">${__('media_quality_auto')}</div>
    </div>
</div>`;

@autobind
class Settings extends EventEmitter {

    /**
     * Service to handle the position and movement of a slider element
     *
     * [constructor]
     * @param {HTMLElement} containerEl container node
     * @returns {Settings} Settings menu instance
     */
    constructor(containerEl) {
        super();
        this.containerEl = containerEl;

        insertTemplate(this.containerEl, SETTINGS_TEMPLATE);

        this.settings = this.containerEl.lastElementChild;
        this.settings.addEventListener('click', this.menuClickHandler);
        this.visible = false;
        this.init();
    }

    /**
     * Inits the menu
     *
     * @returns {void}
     */
    init() {
        const quality = cache.get('media-quality') || 'auto';
        const speed = cache.get('media-speed') || '1.0';

        this.chooseOption('quality', quality);
        this.chooseOption('speed', speed);
    }

    /**
     * [destructor]
     * @returns {void}
     */
    destroy() {
        if (this.settings) {
            this.settings.removeEventListener('click', this.menuClickHandler);
        }
        document.removeEventListener('click', this.blurHandler);
    }

    /**
     * [destructor]
     * @returns {void}
     */
    reset() {
        this.settings.className = CLASS_SETTINGS;
    }

    /**
     * Finds the parent node that has dataset type
     *
     * @param {HTMLElement} target start dom location
     * @returns {HTMLElement} parent that has dataset type
     */
    findParentDataType(target) {
        let currentNode = target;
        while (currentNode && currentNode !== this.settings) {
            if (typeof currentNode.getAttribute('data-type') === 'string') {
                return currentNode;
                /* eslint-disable no-else-return */
            } else {
                /* eslint-enable no-else-return */
                currentNode = currentNode.parentNode;
            }
        }
        return null;
    }

    /**
     * Extracts info out of the click target
     *
     * @param {Event} event click event
     * @returns {void}
     */
    menuClickHandler(event) {
        // Extract the parent target dataset element
        const target = this.findParentDataType(event.target);
        if (!target) {
            return;
        }

        const type = target.getAttribute('data-type');
        const value = target.getAttribute('data-value');

        if (type === 'menu') {
            // We are in the sub menu and going back to the main menu
            this.reset();
        } else if (type && value) {
            // We are in the sub-menu and clicked a valid option
            this.chooseOption(type, value);
        } else if (type) {
            // We are in the main menu and clicked a valid option
            this.settings.classList.add(`box-preview-media-settings-show-${type}`);
        }
    }

    /**
     * Handles option selection
     *
     * @param {String} type of menu option
     * @param {String} value of menu option
     * @returns {void}
     */
    chooseOption(type, value) {
        // Hide the menu
        this.hide();

        // Save the value
        cache.set(`media-${type}`, value);

        // Emit to the listener what was chosen
        this.emit(type);

        // Figure out the target option
        const option = this.settings.querySelector(`[data-type="${type}"][data-value="${value}"]`);

        // Fetch the menu label to use
        const label = option.querySelector(SELECTOR_SETTINGS_VALUE).textContent;

        // Copy the value of the selected option to the main top level menu
        this.settings.querySelector(`[data-type="${type}"] ${SELECTOR_SETTINGS_VALUE}`).textContent = label;

        // Remove the checkmark from the prior selected option in the sub menu
        this.settings.querySelector(`[data-type="${type}"]${SELECTOR_SETTINGS_SUB_ITEM}.${CLASS_SETTINGS_SELECTED}`).classList.remove(CLASS_SETTINGS_SELECTED);

        // Add a checkmark to the new selected option in the sub menu
        option.classList.add(CLASS_SETTINGS_SELECTED);
    }

    /**
     * Handles blur of the menu
     *
     * @private
     * @param {Event} event click event
     * @returns {void}
     */
    blurHandler(event) {
        if (!this.settings.contains(event.target)) {
            this.hide();
        }
    }

    /**
     * Getter for the value of quality
     *
     * @public
     * @returns {String} The quality
     */
    isVisible() {
        return this.visible;
    }

    /**
     * Shows the menu
     *
     * @public
     * @returns {void}
     */
    show() {
        this.visible = true;
        this.containerEl.classList.add(CLASS_SETTINGS_OPEN);

        // Asynchronously add a blur handler.
        // Needs to be async so that event is not caught on bubble when box-preview-media-settings icon is clicked
        setTimeout(() => {
            document.addEventListener('click', this.blurHandler);
        }, 0);
    }

    /**
     * Hides the menu
     *
     * @public
     * @returns {void}
     */
    hide() {
        this.reset();
        this.containerEl.classList.remove(CLASS_SETTINGS_OPEN);
        this.visible = false;
        document.removeEventListener('click', this.blurHandler);
    }
}

export default Settings;