import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import App from './BoxExcel/App';

class BoxExcel {
    /**
     * [constructor]
     *
     * @param {HTMLElement} excelEl - Excel element
     * @param {Object} data - CSV data
     * @return {BoxCSV} Instance
     */
    constructor(excelEl, data) {
        this.excelEl = excelEl;
        this.data = data;

        this.excelEl.className = 'bp-excel-container';
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        if (this.gridComponent) {
            unmountComponentAtNode(this.excelEl);
            this.gridComponent = null;
        }
    }

    /**
     * Renders CSV into an html table
     *
     * @return {void}
     * @private
     */
    renderExcel() {
        this.gridComponent = render(<App data={this.data} />, this.excelEl);
    }
}

global.BoxExcel = BoxExcel;
export default BoxExcel;
