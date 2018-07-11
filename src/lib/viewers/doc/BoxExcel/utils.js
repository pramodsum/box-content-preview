import moment from 'moment';
import { specialIndexMap } from './colors';

/**
 * map dataFormat string from excel to moment
 * need to add more in the future
 *
 * @type {Object}
 */
export const dateMap = {
    m: 'M',
    d: 'D',
    y: 'Y',
    a: 'd'
};

/**
 * convert date to right format
 *
 * @param  {Date} rawDate     JS Date
 * @param  {string} rawFormat Excel format
 * @return {string}           Well Formatted Date
 */
export function dateConvertor(rawDate, rawFormat) {
    const date = moment(rawDate);
    const format = rawFormat.map((c) => (dateMap[c] ? dateMap[c] : c)).join('');
    return date.format(format);
}

/**
 * translate vertical align format string
 *
 * @param       {string} align align format from excel
 * @return      {string} align format for flexbox
 */
export function _getVertAlign(align) {
    switch (align) {
        case 'center':
            return 'center';
        case 'top':
            return 'flex-start';
        default:
            return 'flex-end';
    }
}

/**
 * translate vertical align string
 *
 * @param       {[type]} align align format from excel
 * @return      {[type]}       align format for flexbox
 */
export function _getHoriAlign(align) {
    switch (align) {
        case 'right':
            return 'flex-end';
        case 'center':
            return 'center';
        default:
            return 'flex-start';
    }
}

/**
 * Get excel color hex string from color object of sheetjs
 *
 * @param       {Object} color color object parsed by sheetjs
 * @return      {string}       hex color string
 */
export function _parseColor(color) {
    const specialColor = color.index ? specialIndexMap[color.index] : null;
    return specialColor || `#${color.rgb}`;
}

/**
 * Helper function of _getBackgroundColor
 * Check whether two colors are close or not
 *
 * @param  {string}  color1 first color
 * @param  {string}  color2 second color
 * @return {boolean}        true if two colors are close
 */
export function isClose(color1, color2) {
    const rrggbb = [
        color1.substr(1, 2),
        color2.substr(1, 2),
        color1.substr(3, 2),
        color2.substr(3, 2),
        color1.substr(5, 2),
        color2.substr(5, 2)
    ].map((hex) => parseInt(hex, 16));

    let sum = 0;
    for (let i = 0; i < rrggbb.length; i += 2) {
        const diff = rrggbb[i + 1] - rrggbb[i];
        sum += diff * diff;
    }

    return Math.sqrt(sum) < 256;
}

/**
 * Helper function of _getBackgroundColor
 * Find two colors not close from specialIndexMap
 * Solve the problem that the backgroundColor and fontColor are too close
 *
 * @param  {number} index     excel index color, backgroundColor of a cell
 * @param  {string} fontColor hex color string
 * @return {string}           hex color string
 */
export function findBetterColor(index, fontColor) {
    let currentIndex = index - 1;
    while (currentIndex !== index) {
        if (!isClose(specialIndexMap[currentIndex], fontColor)) {
            return specialIndexMap[currentIndex];
        }
        currentIndex = (currentIndex - 1 + 64) % 64;
    }
    return specialIndexMap[index];
}

/**
 * get backgroundColor of a cell
 *
 * @param       {number} index     excel color index
 * @param       {string} fontColor hex color string
 * @return      {string}           hex color string
 */
export function _getBackgroundColor(index, fontColor) {
    return isClose(specialIndexMap[index], fontColor) ? findBetterColor(index, fontColor) : specialIndexMap[index];
}

/**
 * map excel border width format to px
 *
 * @type {Object}
 */
export const borderWidthMap = {
    thin: '1px',
    thick: '2px'
};
