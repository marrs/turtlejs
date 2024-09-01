'use strict';

function initLogo(turtle) {
    return {
        eval(script) {
            var ast = [];
            var indent = null;
            for (var line of script.split("\n")) {
                ast.push(line.split(/\s/));
            }
            return turtle.perform(ast);
        }
    }
}
