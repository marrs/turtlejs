'use strict';

function Logo(turtle) {
    return {
        parse(script) {
            var ast = [];
            var indent = null;
            for (var line of script.split("\n")) {
                var tokens = line.split(/\s/);
                if (tokens.join('')) {
                    ast.push(tokens);
                }
            }
            return ast;
        },
        eval(script) {
            return turtle.perform(this.parse(script));
        }
    }
}
