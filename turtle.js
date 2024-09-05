"use strict"

function centre_context(ctx) {
    var {width, height} = ctx.canvas;
    ctx.translate(width / 2, height / 2);
    ctx.transform(1, 0, 0, -1, 0, 0);
}

function init_context(ctx) {
    centre_context(ctx);
}

function clear(ctx) {
    const {width, height} = ctx.canvas;
    ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, width, height);
    ctx.restore();
};

function rad(deg) {
    return deg / 180 * Math.PI;
}

function deg(rad) {
    return rad * 180 / Math.PI;
}


window.turtle = function(canvas) {
    var ctx = canvas.getContext('2d');

    var turtle_shapes = Object.freeze({
        turtle: [
            [0, 16], [-2, 14], [-1, 10], [-4, 7], [-7, 9],
            [-9, 8], [-6, 5], [-7, 1], [-5, -3], [-8, -6],
            [-6, -8], [-4, -5], [0, -7], [4, -5], [6, -8],
            [8, -6], [5, -3], [7, 1], [6, 5], [9, 8],
            [7, 9], [4, 7], [1, 10], [2, 14]
        ],
        triangle: [[-5, 0], [5, 0], [0, 15]],
    });

    var snapshot;

    function take_snapshot(ctx) {
        ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            snapshot = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
    }

    function paint_snapshot(ctx) {
        const {width, height} = ctx.canvas;
        ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.putImageData(snapshot, 0, 0);
        ctx.restore();
    }

    take_snapshot(ctx);

    var turtle_traits = {
        draw() {
            if (turtle.visible) {
                var {angle} = this;
                var {x, y} = this.pos;

                ctx.save();
                    ctx.translate(x, y);
                    ctx.rotate(-angle);
                    ctx.translate(-x, -y);
                    ctx.beginPath();
                    var { shape, pos } = this;
                    if (shape.length > 0)
                        ctx.moveTo(x + shape[0][0], y + shape[0][1]);
                    for (const [cx, cy] of shape.slice(1)) {
                        ctx.lineTo(x + cx, y + cy);
                    }
                    ctx.closePath();

                    ctx.fillStyle = 'green';
                    ctx.fill();
                ctx.restore();
            }
        }
    };

    var _turtle = Object.assign(Object.create(turtle_traits), {
        pos: {
            x: 0,
            y: 0
        },
        angle: 0,
        sin: Math.sin(0),
        cos: Math.cos(0),
        penDown: true,
        width: 1,
        visible: true,
        wrap: true,
        shape: turtle_shapes.triangle,
        color: 'white',
        canvas: canvas,
        procedures: {},
    });

    var turtle = new Proxy(_turtle, {
        set (target, prop, value) {
            switch(prop) {
                case 'angle': {
                    target[prop] = value;
                    target.sin = Math.sin(value);
                    target.cos = Math.cos(value);
                } break;
                case 'cos':
                case 'sin': {
                    return false;
                }
                default: {
                    target[prop] = value;
                }
            }
            return true;
        },
    });

    init_context(ctx);

    function draw_line_to_x_boundary(x_boundary_pos) {
        var {x, y} = turtle.pos;
        var {sin, cos} = turtle;
        var mag = abs((x_boundary_pos - x) / sin);
        var new_y= cos * mag + y;
        draw_line_to(x_boundary_pos, new_y);
        return mag;
    }

    function draw_line_to_y_boundary(y_boundary_pos) {
        var {x, y} = turtle.pos;
        var {sin, cos} = turtle;
        var mag = Math.abs((y_boundary_pos - y) / cos);
        const new_x = sin * mag + x;
        draw_line_to(new_x, y_boundary_pos);
        return mag;
    }

    function draw_line_to(x, y) {
        ctx.save();
            ctx.strokeStyle = turtle.color;
            ctx.beginPath();
            ctx.moveTo(turtle.pos.x, turtle.pos.y);
            ctx.lineTo(x, y);
            ctx.closePath();
            ctx.stroke();
        ctx.restore();
        turtle.pos.x = x;
        turtle.pos.y = y;
    }

    function perform(script) {
        var msg = "";
        if (script.length) {
            for (var line of script) {
                if (!Array.isArray(line)) {
                    throw new Error("Array expected");
                }
                var op = line[0];
                if (ops[op]) {
                    ops[op].apply(ops, line.slice(1));
                } else if (turtle.procedures[op]) {
                    _do(op, line.slice(1));
                } else {
                    msg = "Unknown operator: " + op;
                    break;
                }
            }
        }
        return msg;
    }

    var ops = {
        forward(distance) {
            clear(ctx);
            distance = +distance;

            ctx.save();
                ctx.strokeStyle = turtle.color;
                ctx.beginPath();

                var {width, height} = canvas,
                    max_x = width / 2,
                    min_x = -max_x,
                    max_y = height / 2,
                    min_y = -max_y,
                    {x, y} = turtle.pos;

                while (distance > 0) {
                    ctx.moveTo(x, y);

                    var {sin, cos} = turtle,
                        new_x = x + sin * distance,
                        new_y = y + cos * distance;

                    switch (turtle.wrap) {
                        case new_x > max_x: {
                            distance -= draw_line_to_x_boundary(max_x);
                        } break;
                        case new_x < min_x: {
                            distance -= draw_line_to_x_boundary(min_x);
                        } break;
                        case new_y > max_y: {
                            distance -= draw_line_to_y_boundary(max_y);
                        } break;
                        case new_y < min_y: {
                            distance -= draw_line_to_y_boundary(min_y);
                        } break;
                        default: {
                            draw_line_to(new_x, new_y);
                            distance = 0;
                        }
                    }

                    paint_snapshot(ctx);
                    turtle.penDown && ctx.stroke();
                    take_snapshot(ctx);
                    turtle.draw();
                ctx.restore();
            }
        },

        right(deg) {
            clear(ctx);
            paint_snapshot(ctx);
            turtle.angle += rad(+deg || 0);
            turtle.draw();
        },

        left(deg) {
            clear(ctx);
            paint_snapshot(ctx);
            turtle.angle -= rad(+deg || 0);
            turtle.draw();
        },

        to(name, args, body) {
            turtle.procedures[name] = {args, body};
        },

        clear() {
            clear(ctx);
            turtle.angle = 0;
            turtle.draw();
        },

        repeat(count, body) {
            var fn = false;
            if (typeof body === 'function') {
                fn = true;
            } else if (!Array.isArray(body)) {
                throw new Error("Repeat expects a function or an array for its body.");
            }

            for (var x = 0; x < count; ++x) {
                var msg = fn? body() : perform(body);
                if (msg) {
                    return msg;
                }
            }
        }
    };

    ops.fd = ops.forward;
    ops.rt = ops.right;
    ops.lt = ops.left;

    function walk(arr, fn) {
        var new_arr = [];
        for (var idx = 0, len = arr.length; idx < len; ++idx) {
            if (Array.isArray(arr[idx])) {
                new_arr[idx] = walk(arr[idx], fn);
            } else {
                new_arr[idx] = fn(arr[idx]) || arr[idx];
            }
        }
        return new_arr;
    }

    function _do(name, args = []) {
        var proc = turtle.procedures[name];
        if (!proc) {
            return name + " is not defined.";
        }
        if (args.length) {
            var _args = proc.args;
            if (args.length !== _args.length) {
                return "Error: " + _args.length + " arguments expected.";
            }
            perform(
                walk(proc.body, (el) => {
                    var idx = _args.indexOf(el);
                    if (idx > -1) {
                        return args[idx];
                    }
                })
            );
        } else {
            return perform(proc.body);
        }
    }

    var turtle_power = {
        clear: ops.clear,
        forward: ops.forward,
        fd: ops.forward,
        left: ops.left,
        lt: ops.left,
        right: ops.right,
        rt: ops.right,
        to: ops.to,
        do: _do,
        perform,
        repeat: ops.repeat,
    };

    return turtle_power;
}
