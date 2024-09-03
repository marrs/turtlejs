'use strict';

if (!Array.prototype.last) {
    Array.prototype.last = function() {
        return this[this.length -1];
    }
} else {
    console.warn("Array.prototype.last already defined");
}

function Stack () {
    return this;
}

Stack.prototype = Object.create(Array.prototype);
Object.assign(Stack.prototype, {
    backtrace: function(op) {
        return this.reduce((acc, el) => {
            return acc || el.op === op;
        }, false);
    },
    last: function() {
        if (this.length) {
            return this[this.length - 1];
        }
        return;
    }
})
