import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import Workbook from './workbook';

class BoxExcel {
    /**
     * [constructor]
     *
     * @param {HTMLElement} excelEl - Excel element
     * @param {Object} data - Excel data parsed by sheetjs
     * @param {Object} controls - Controls
     * @return {BoxExcel} Instance
     */
    constructor(excelEl, data, controls) {
        this.excelEl = excelEl;
        this.data = data;
        this.controls = controls;
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
     * Renders Excel
     *
     * @return {void}
     * @private
     */
    renderExcel() {
        this.gridComponent = render(<Workbook workbook={this.data} controls={this.controls} />, this.excelEl);
    }
}

global.BoxExcel = BoxExcel;
export default BoxExcel;
