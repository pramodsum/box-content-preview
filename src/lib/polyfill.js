/* eslint-disable */
(function() {
    var testObject = {};

    if (!(Object.setPrototypeOf || testObject.__proto__)) {
        var nativeGetPrototypeOf = Object.getPrototypeOf;

        Object.getPrototypeOf = function(object) {
            if (object.__proto__) {
                return object.__proto__;
            } else {
                return nativeGetPrototypeOf.call(Object, object);
            }
        }
    }
})();

if (typeof Object.assign != 'function') {
    (function() {
        Object.assign = function(target) {
            'use strict';
            if (target === undefined || target === null) {
                throw new TypeError('Cannot convert undefined or null to object');
            }

            var output = Object(target);
            for (var index = 1; index < arguments.length; index++) {
                var source = arguments[index];
                if (source !== undefined && source !== null) {
                    for (var nextKey in source) {
                        if (source.hasOwnProperty(nextKey)) {
                            output[nextKey] = source[nextKey];
                        }
                    }
                }
            }
            return output;
        };
    })();
}

if (!Array.prototype.find) {
    Object.defineProperty(Array.prototype, 'find', {
        configurable: true,
        enumerable: false,
        writable: true,
        value: function(predicate) {
            'use strict';
            if (this === null) {
                throw new TypeError('Array.prototype.find called on null or undefined');
            }
            if (typeof predicate !== 'function') {
                throw new TypeError('predicate must be a function');
            }
            var list = Object(this);
            var length = list.length >>> 0;
            var thisArg = arguments[1];
            var value;

            for (var i = 0; i < length; i++) {
                value = list[i];
                if (predicate.call(thisArg, value, i, list)) {
                    return value;
                }
            }
            return undefined;
        }
    });
}

if (!Array.prototype.findIndex) {
    Object.defineProperty(Array.prototype, 'findIndex', {
        configurable: true,
        enumerable: false,
        writable: true,
        value: function(predicate) {
            'use strict';
            if (this === null) {
                throw new TypeError('Array.prototype.findIndex called on null or undefined');
            }
            if (typeof predicate !== 'function') {
                throw new TypeError('predicate must be a function');
            }
            var list = Object(this);
            var length = list.length >>> 0;
            var thisArg = arguments[1];
            var value;

            for (var i = 0; i < length; i++) {
                value = list[i];
                if (predicate.call(thisArg, value, i, list)) {
                    return i;
                }
            }
            return -1;
        }
    });
}
/* eslint-enable */