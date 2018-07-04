import BaseViewer from '../BaseViewer';
import Controls from '../../Controls';
import { get } from '../../util';
import './Excel.scss';
import { VIEWER_EVENT } from '../../events';
import { ICON_FULLSCREEN_IN, ICON_FULLSCREEN_OUT } from '../../icons/icons';

const JS = ['excel.js'];

class ExcelViewer extends BaseViewer {
    /**
     * @inheritdoc
     */
    setup() {
        // Call super() first to set up common layout
        super.setup();

        this.excelEl = this.containerEl.appendChild(document.createElement('div'));
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        if (this.excelComponent) {
            this.excelComponent.destroy();
        }
        super.destroy();
    }

    /**
     * Loads a csv file.
     *
     * @return {void}
     */
    load() {
        this.setup();
        super.load();

        const { representation } = this.options;
        const template = representation.content.url_template;

        return Promise.all([this.loadAssets(JS), this.getRepStatus().getPromise()])
            .then(() => {
                this.startLoadTimer();
                this.data = this.createContentUrlWithAuthParams(template);
                this.finishLoading();
            })
            .catch(this.handleAssetError);
    }

    /**
     * Loads controls for zooming and fullscreen.
     *
     * @return {void}
     * @protected
     */
    loadUI() {
        this.controls = new Controls(this.containerEl);
        this.controls.add(
            __('enter_fullscreen'),
            this.toggleFullscreen,
            'bp-enter-fullscreen-icon',
            ICON_FULLSCREEN_IN
        );
        this.controls.add(__('exit_fullscreen'), this.toggleFullscreen, 'bp-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
    }

    /**
     * Prefetches assets for CSV Viewer.
     *
     * @param {boolean} [options.assets] - Whether or not to prefetch static assets
     * @param {boolean} [options.content] - Whether or not to prefetch rep content
     * @return {void}
     */
    prefetch({ assets = true, content = true }) {
        if (assets) {
            this.prefetchAssets(JS);
        }

        const { representation } = this.options;
        if (content && this.isRepresentationReady(representation)) {
            const template = representation.content.url_template;
            get(this.createContentUrlWithAuthParams(template), 'any');
        }
    }

    /**
     * Resize handler
     *
     * @override
     * @return {void}
     */
    resize() {
        if (this.excelComponent) {
            this.excelComponent.renderExcel();
        }

        super.resize();
    }

    /**
     * Finishes loading the csv data
     *
     * @private
     * @return {void}
     */
    finishLoading() {
        /* global BoxExcel */
        this.excelComponent = new BoxExcel(this.excelEl, this.data);
        this.excelComponent.renderExcel();

        this.loadUI();
        this.loaded = true;
        this.emit(VIEWER_EVENT.load);
    }
}

export default ExcelViewer;
