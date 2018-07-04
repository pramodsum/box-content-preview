import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

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
        this.gridComponent = render(<div>{this.data}</div>, this.excelEl);
    }
}

global.BoxExcel = BoxExcel;
export default BoxExcel;
