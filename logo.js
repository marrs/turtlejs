'use strict';

function initLogo(turtle) {
    return {
        parse(script) {
            var ast = [];
            var indent = null;
            for (var line of script.split("\n")) {
                ast.push(line.split(/\s/));
            }
            return ast;
        },
        eval(script) {
            return turtle.perform(this.parse(script));
        }
    }
}
