import BaseViewer from '../BaseViewer';
import Controls from '../../Controls';
import { get } from '../../util';
import './Excel.scss';
import { VIEWER_EVENT } from '../../events';
import { ICON_FULLSCREEN_IN, ICON_FULLSCREEN_OUT } from '../../icons/icons';
import { DOC_STATIC_ASSETS_VERSION } from '../../constants';

const JS = [
    `third-party/doc/${DOC_STATIC_ASSETS_VERSION}/cpexcel.js`,
    `third-party/doc/${DOC_STATIC_ASSETS_VERSION}/jszip.js`,
    `third-party/doc/${DOC_STATIC_ASSETS_VERSION}/xlsx.full.min.js`,
    'excel.js'
];

class ExcelViewer extends BaseViewer {
    /**
     * @inheritdoc
     */
    setup() {
        // Call super() first to set up common layout
        super.setup();

        this.excelEl = this.containerEl.appendChild(document.createElement('div'));

        // disable zooming until zooming handler is implemented
        document.addEventListener('gesturestart', (event) => {
            event.preventDefault();
        });
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
     * Disable ArrowLeft and ArrowRight for excel viewer.
     *
     * @param {string} key - keydown key
     * @return {boolean} consumed or not
     */
    onKeydown(key) {
        switch (key) {
            case 'ArrowLeft':
                break;
            case 'ArrowRight':
                break;
            default:
                return false;
        }

        return true;
    }

    /**
     * Loads an excel file.
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
                get(this.createContentUrlWithAuthParams(template), 'blob').then((excelBlob) => {
                    this.startLoadTimer();
                    const fileReader = new FileReader();
                    fileReader.readAsArrayBuffer(excelBlob);
                    fileReader._parseBuffer = this._parseBuffer;
                    fileReader.onload = function onload() {
                        this._parseBuffer(this.result);
                    };
                });
            })
            .catch(this.handleAssetError);
    }

    /**
     * Parses an excel file.
     * @param  {ArrayBuffer} buffer ArrayBuffer parsed by fileReader
     * @return {void}
     */
    _parseBuffer = (buffer) => {
        /* global XLSX */
        this.data = XLSX.read(buffer, {
            type: 'array',
            cellStyles: true,
            cellNF: true,
            cellDates: true
        });
        this.finishLoading();
    };

    /**
     * Loads controls for fullscreen.
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
     * Prefetches assets for Excel Viewer.
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
     * Finishes loading and parsing the excel data
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
