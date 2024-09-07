'use strict';

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

function parse(tokens) {
    var stack = new Stack();
    stack.push({
        op: null,
        indent: '',
        body: [],
    });

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
                const body = [];
                stack.last().body.push([op, name, line.slice(3), body]);
                stack.push({
                    op: 'to',
                    indent,
                    body,
                });
            } break;
            case 'repeat': {
                const count = +line[2];
                if (Number.isNaN(count)) {
                    throw new Error("Parser error: Repeat expects a number as its first argument.");
                }
                const body = [];
                stack.last().body.push([op, count, body]);
                stack.push({
                    op: 'repeat',
                    indent,
                    body,
                });
            } break;
            default: {
                if (stack.length > 1) {
                    if (stack.last().indent.length < indent.length) {
                        stack.last().body.push(line.slice(1));
                    } else {
                        const prev_frame = stack.pop();
                        const cur_frame = stack.last();
                        if (stack.length) {
                            cur_frame.body.push(prev_frame.body);
                            cur_frame.body.push(line.slice(1));
                        } else {
                            prev_frame && cur_frame.body.push(prev_frame.body);
                            cur_frame.body.push(line.slice(1));
                        }
                    }
                } else {
                    stack.last().body.push(line.slice(1));
                }
            }
        }
    }
    return stack[0].body;
}

function Logo(turtle) {
    return {
        parse(script) {
            return parse(tokenise(script.toLowerCase()));
        },
        eval(script) {
            return turtle.perform(this.parse(script));
        }
    }
}
