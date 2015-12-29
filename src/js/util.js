'use strict';

let loadedAssets = [];
let prefetchedAssets = [];

/**
 * Create <script> element to load external script
 *
 * @public
 * @param {String} url  asset url
 * @returns {Array} script element
 */
export function createScript(url) {
    let script = document.createElement('script');
    script.src = url;
    script.async = false;
    return script;
}

/**
 * Create <link> element to prefetch external resource
 *
 * @public
 * @param {string} url  asset urls
 * @returns {HTMLElement} prefetch link element
 */
export function createPrefetch(url) {
    let link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    return link;
}

/**
 * Create <link> element to load external stylesheet
 *
 * @public
 * @param {string} url  asset urls
 * @returns {HTMLElement} css link element
 */
export function createStylesheet(url) {
    let link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = url;
    return link;
}

/**
 * Creates the content URLs
 *
 * @public
 * @param {String} url content url
 * @param {String} [token] optional auth token
 * @returns {String} content urls
 */
export function createContentUrl(url, token) {

    if (!token) {
        return url;
    }

    let delim = '?';

    if (url.indexOf('?') > 0) {
        delim = '&';
    }

    return url + delim + 'access_token=' + token;
}

/**
 * Factory to create asset URLs
 *
 * @public
 * @param {String} template url
 * @returns {Function} factory for creating asset url
 */
export function createAssetUrlCreator(template) {
    return (name) => template.replace('{{asset_name}}', name);
}

/**
 * Prefetches external stylsheets or js by appending a <link rel="prefetch"> element
 *
 * @param {Array} urls asset urls
 * @returns {void}
 */
export function prefetchAssets(urls) {
    let head = document.getElementsByTagName('head')[0];

    urls.forEach((url) => {
        if (prefetchedAssets.indexOf(url) === -1) {
            prefetchedAssets.push(url);
            head.appendChild(createPrefetch(url));
        }
    });
}

/**
 * Loads external stylsheets by appending a <link> element
 *
 * @param {Array} urls asset urls
 * @returns {void}
 */
export function loadStylesheets(urls) {
    let head = document.getElementsByTagName('head')[0];

    urls.forEach((url) => {
        if (loadedAssets.indexOf(url) === -1) {
            loadedAssets.push(url);
            head.appendChild(createStylesheet(url));
        }
    });
}

/**
 * Loads external scripts by appending a <script> element
 *
 * @param {Array} urls asset urls
 * @returns {Promise} Promise to load scripts
 */
export function loadScripts(urls) {
    let head = document.getElementsByTagName('head')[0];
    let promises = [];

    urls.forEach((url) => {
        if (loadedAssets.indexOf(url) === -1) {
            loadedAssets.push(url);
            let script = createScript(url);
            promises.push(new Promise((resolve, reject) => {
                script.addEventListener('load', resolve);
                script.addEventListener('error', reject);
            }));
            head.appendChild(script);
        }
    });

    return Promise.all(promises);
}

/**
 * Function to decode key down events into keys
 *
 * @public
 * @param {Event} event keydown event
 * @returns {String} decoded keydown key
 */
export function decodeKeydown(event) {

    let modifier = '';

    // KeyboardEvent.key is the new spec supported in Firefox and IE.
    // KeyboardEvent.keyIdentifier is the old spec supported in Chrome and Safari.
    // Priority is given to the new spec.
    let key = event.key || event.keyIdentifier;

    // Get the modifiers on their own
    if (event.ctrlKey) {
        modifier = 'Control';
    } else if (event.shiftKey) {
        modifier = 'Shift';
    } else if (event.metaKey) {
        modifier = 'Meta';
    }

    // The key and keyIdentifier specs also include modifiers.
    // Since we are manually getting the modifiers above we do
    // not want to trap them again here.
    if (key === modifier) {
        key = '';
    }

    // keyIdentifier spec returns UTF8 char codes
    // Need to convert them back to ascii.
    if (key.indexOf('U+') === 0) {
        if (key === 'U+001B') {
            key = 'Escape';
        } else {
            key = String.fromCharCode(key.replace('U+', '0x'));
        }
    }

    // If nothing was pressed just return
    if (!key) {
        return '';
    }

    // Special casing for space bar
    if (key === ' ') {
        key = 'Space';
    }

    // keyIdentifier spec does not prefix the word Arrow.
    // Newer key spec does it automatically.
    if (key === 'Right' || key === 'Left' || key === 'Down' || key === 'Up') {
        key = 'Arrow' + key;
    }

    if (modifier) {
        modifier += '+';
    }

    return modifier + key;
}