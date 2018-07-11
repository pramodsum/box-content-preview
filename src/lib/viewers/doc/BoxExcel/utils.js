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
 *
 *
 * @param       {[type]} align [description]
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

/* eslint-disable */
/**
 * [st description]
 * @param  {[type]} e [description]
 * @return {[type]}   [description]
 */
function st(e) {
    return e.replace(/^\$([A-Z])/, '$1');
}

/**
 * [at description]
 * @param  {[type]} e [description]
 * @return {[type]}   [description]
 */
function at(e) {
    const r = st(e);
    let t = 0;
    let a = 0;
    for (; a !== r.length; ++a) t = 26 * t + r.charCodeAt(a) - 64;
    return t - 1;
}

/**
 * [lt description]
 * @param  {[type]} e [description]
 * @return {[type]}   [description]
 */
function lt(e) {
    return e.replace(/(\$?[A-Z]*)(\$?\d*)/, '$1,$2').split(',');
}

/**
 * [tt description]
 * @param  {[type]} e [description]
 * @return {[type]}   [description]
 */
function tt(e) {
    return e.replace(/\$(\d+)$/, '$1');
}

/**
 * [qr description]
 * @param  {[type]} e [description]
 * @return {[type]}   [description]
 */
function qr(e) {
    return parseInt(tt(e), 10) - 1;
}

/**
 * [ft description]
 * @param  {[type]} e [description]
 * @return {[type]}   [description]
 */
function ft(e) {
    const r = lt(e);
    return { c: at(r[0]), r: qr(r[1]) };
}

/**
 * [ct description]
 * @param  {[type]} e [description]
 * @return {[type]}   [description]
 */
function ct(e) {
    const r = e.split(':').map(ft);
    return { s: r[0], e: r[r.length - 1] };
}

/**
 * [nt description]
 * @param  {[type]} e [description]
 * @return {[type]}   [description]
 */
function nt(e) {
    let r = '';
    for (++e; e; e = Math.floor((e - 1) / 26)) r = String.fromCharCode(((e - 1) % 26) + 65) + r;
    return r;
}

/**
 * [ot description]
 * @param  {[type]} e [description]
 * @return {[type]}   [description]
 */
function ot(e) {
    return nt(e.c) + et(e.r);
}

/**
 * [et description]
 * @param  {[type]} e [description]
 * @return {[type]}   [description]
 */
function et(e) {
    return `${e + 1}`;
}

/**
 * [ht description]
 * @param  {[type]} e [description]
 * @param  {[type]} r [description]
 * @return {[type]}   [description]
 */
function ht(e, r) {
    if (typeof r === 'undefined' || typeof r === 'number') {
        return ht(e.s, e.e);
    }
    if (typeof e !== 'string') e = ot(e);
    if (typeof r !== 'string') r = ot(r);
    return e === r ? e : `${e}:${r}`;
}
/* eslint-enable */

export const utils = {
    decode_cell: ft,
    decode_col: at,
    decode_range: ct,
    decode_row: qr,
    encode_cell: ot,
    encode_col: nt,
    encode_range: ht,
    encode_row: et
};
