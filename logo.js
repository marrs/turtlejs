'use strict';

if (!Array.prototype.last) {
    Array.prototype.last = function() {
        return this[this.length -1];
    }
} else {
    console.warn("Array.prototype.last already defined");
}


function leading_ws(str) {
    var chars = {
        space: '',
        tab: '',
    };
    for (var ch of str) {
        switch(ch) {
            case ' ': {
                chars.space += ' ';
            } break;
            case '\t': {
                chars.tab += '\t';
            } break;
            default: break;
        }
    }

    if (chars.space && chars.tab) {
        throw new Error("Inconsitent indentation. Both tabs and spaces were found.");
    }

    return chars.space || chars.tab || '';
}

function tokenise(script) {
    var tokens = [];
    var indent_str = '';
    for (var line of script.split("\n")) {
        indent_str = leading_ws(line)
        var tkns = line.trim().split(/\s/);
        if (tkns.join('')) {
            tokens.push([indent_str].concat(tkns));
        }
    }
    return tokens;
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

function parse(tokens) {
    var ast = [];
    var stack = new Stack();

    for (var line of tokens) {
        var indent = line[0];
        var op = line[1];
        switch(op) {
            case 'to': {
                if (stack.backtrace(op)) {
                    throw new Error("Parser error: Already defining a procedure");
                }
                const name = line[2];
                if (!name) {
                    throw new Error("Parser error: Procedure definition - no name given.");
                }
                ast.push([op, name, line.slice(3), []]);
                stack.push({
                    op: 'to',
                    indent,
                    indent_level: 0,
                });
            } break;
            default: {
                if (stack.length) {
                    if (stack.last().indent.length < indent.length) {
                        ast.last().last().push(line.slice(1));
                    } else {
                        stack.pop();
                        ast.push(line.slice(1));
                    }
                } else {
                    ast.push(line.slice(1));
                }
            }
        }
    }
    return ast;
}

function Logo(turtle) {
    return {
        parse(script) {
            return parse(tokenise(script));
        },
        eval(script) {
            return turtle.perform(this.parse(script));
        }
    }
}
