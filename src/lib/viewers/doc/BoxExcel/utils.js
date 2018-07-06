import moment from 'moment';
import _ from 'lodash';
import { specialIndexMap } from './colors';

export const dateMap = {
    m: 'M',
    d: 'D',
    y: 'Y',
    a: 'd'
};

/**
 * [dateConvertor description]
 * @param  {string} rawDate   [description]
 * @param  {string} rawFormat [description]
 * @return {string}           [description]
 */
export function dateConvertor(rawDate, rawFormat) {
    const date = moment(rawDate);
    const format = _.map(rawFormat, (c) => (dateMap[c] ? dateMap[c] : c)).join('');
    return date.format(format);
}

/**
 * [_getVertAlign description]
 * @param       {[type]} align [description]
 * @constructor
 * @return      {[type]}       [description]
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
 * [_getHoriAlign description]
 * @param       {[type]} align [description]
 * @constructor
 * @return      {[type]}       [description]
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
 * [_parseColor description]
 * @param       {[type]} color [description]
 * @constructor
 * @return      {[type]}       [description]
 */
export function _parseColor(color) {
    const specialColor = color.index ? specialIndexMap[color.index] : null;
    return specialColor || `#${color.rgb}`;
}

/**
 * [isClose description]
 * @param  {[type]}  color1 [description]
 * @param  {[type]}  color2 [description]
 * @return {boolean}        [description]
 */
export function isClose(color1, color2) {
    const rrggbb = _.map(
        [
            color1.substr(1, 2),
            color2.substr(1, 2),
            color1.substr(3, 2),
            color2.substr(3, 2),
            color1.substr(5, 2),
            color2.substr(5, 2)
        ],
        (hex) => parseInt(hex, 16)
    );

    let sum = 0;
    for (let i = 0; i < rrggbb.length; i += 2) {
        const diff = rrggbb[i + 1] - rrggbb[i];
        sum += diff * diff;
    }

    return Math.sqrt(sum) < 256;
}

/**
 * [findBetterColor description]
 * @param  {[type]} index     [description]
 * @param  {[type]} fontColor [description]
 * @return {[type]}           [description]
 */
export function findBetterColor(index, fontColor) {
    let currentIndex = index - 1;
    while (currentIndex !== index) {
        if (!isClose(specialIndexMap[currentIndex], fontColor)) {
            return specialIndexMap[currentIndex];
        }
        currentIndex = (currentIndex - 1 + 64) % 64;
    }
    // console.log(specialIndexMap[index]);
    return specialIndexMap[index];
}

/**
 * [_getBackgroundColor description]
 * @param       {[type]} index     [description]
 * @param       {[type]} fontColor [description]
 * @constructor
 * @return      {[type]}           [description]
 */
export function _getBackgroundColor(index, fontColor) {
    return isClose(specialIndexMap[index], fontColor) ? findBetterColor(index, fontColor) : specialIndexMap[index];
}

export const borderWidthMap = {
    thin: '1px',
    thick: '2px'
};
