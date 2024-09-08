"use strict"

// User errors are returned; system errors are thrown.
//
// Animation is achieved by putting a pause of `animation_rate`
// milliseconds between drawing operations.  However, if wished,
// animation of individual drawing operations can be achieved by
// subdividing directional commands into a series of smaller
// vector operations.
//
// E.g. `forward 100` may be converted into:
// ```
// repeat 10
//   forward 10.
// ```
//
// To achieve this, we load all commands into a command buffer,
// altering them as required.  From the command buffer, operations
// are loaded into the command stack for execution.
//
// There is nothing to stop the command stack from being run
// in a web worker.

function array_last(arr) {
    return arr[arr.length -1];
}

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

function prepare_procedure(proc, args = []) {
    if (args.length) {
        var placeholders = proc.args;
        if (args.length !== placeholders.length) {
            return "Error: " + placeholders.length + " arguments expected.";
        }
        return walk(proc.body, (el) => {
            var idx = placeholders.indexOf(el);
            if (idx > -1) {
                return args[idx];
            }
        })
    } else {
        return proc.body;
    }
}

window.Turtle = function(canvas) {
    var animation_rate = 40;
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
            if (this.is_visible) {
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

                    ctx.fillStyle = this.color;
                    ctx.fill();
                ctx.restore();
            }
        },
        stop() {
            this.is_running = false;
        }
    };

    var _turtle = Object.assign(Object.create(turtle_traits), {
        pos: { x: 0, y: 0 },
        angle: 0,
        sin: Math.sin(0),
        cos: Math.cos(0),
        penDown: true,
        width: 1,
        is_visible: true,
        wrap: true,
        is_animated: true,
        is_running: false,
        shape: turtle_shapes.triangle,
        trail_color: 'white',
        color: 'green',
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

    function cue_procedure(name, args = []) {
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
            ctx.strokeStyle = turtle.trail_color;
            ctx.beginPath();
            ctx.moveTo(turtle.pos.x, turtle.pos.y);
            ctx.lineTo(x, y);
            ctx.closePath();
            ctx.stroke();
        ctx.restore();
        turtle.pos.x = x;
        turtle.pos.y = y;
    }

    var cmd_buffer = (function() {
        // TODO: Buffer is currently infinite.  This should
        // either be a ring buffer or it should be emptied
        // once in a while.
        var buffer = []
          , pc = 0 // Programme counter.
          , eop = 0 // End of programme.
        return {
            append(cmd) {
                buffer[eop++] = cmd;
            },
            next() {
                if (pc < eop) {
                    return {
                        value: buffer[pc++],
                        done: false,
                    };
                } else {
                    return {
                        value: null,
                        done: true,
                    }
                }
            },
        };
    }());

    var cmd_runner = (function(turtle) {
        var stack = []

        function push_stack_frame(line) {
            var line = line.slice();
            if (line.length > 2) {
                var body = line.pop();
                stack.push({
                    line,
                    acc: 0,
                    body,
                });
            } else {
                stack.push({
                    line,
                    acc: null,
                    body: null,
                });
            }
        }

        function load_body(body) {
            body.toReversed().forEach(line => {
                push_stack_frame(line);
            });
        }

        function load_command(cmd, done) {
            var line = cmd.line;
            var procedure = turtle.procedures[line[0]];
            switch(true) {
                case 'repeat' === line[0]: {
                    if (cmd.acc++ < line[1]) {
                        load_body(cmd.body);
                        run(done);
                    } else {
                        stack.pop();
                        run(done);
                    }
                } break;
                case procedure != null: {
                    stack.pop();
                    const body = prepare_procedure(procedure, line.slice(1));
                    body && body.length && load_body(body);
                    run(done);
                } break;
                default: {
                    ops[line[0]](line[1]);  // Run command
                    stack.pop();
                    if (turtle.is_animated) {
                        setTimeout(() => {
                            run(done);
                        }, animation_rate)
                    } else {
                        run(done);
                    }
                }
            }
        }

        function run(done) {
            if (!turtle.is_running) {
                return done();
            }
            if (stack.length) {
                var line = array_last(stack);
                load_command(line, done);
            } else {
                var cmd = cmd_buffer.next();
                var line = cmd.value;
                if (!cmd.done) {
                    push_stack_frame(line, done);
                    run(done);
                } else {
                    turtle.is_running = false;
                    done();
                }
            }
        }

        return {
            cue(list, done = function() {}) {
                for (var cmd of list) {
                    if ('to' === cmd[0]) {
                        ops.to(cmd[1], cmd[2], cmd[3]);
                    } else {
                        // TODO: Animate dir commands if req.
                        cmd_buffer.append(cmd);
                    }
                }
                turtle.is_running = true;
                run(done);
            },
        }
    }(turtle));

    function perform(script, done = function() {}) {
        cmd_runner.cue(script, done);
    }

    var ops = {
        forward(distance) {
            clear(ctx);
            distance = +distance;

            ctx.save();
                ctx.strokeStyle = turtle.trail_color;
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

        back(distance) {
            ops.right(180);
            ops.forward(distance);
            ops.right(180);
        },

        right(deg) {
            clear(ctx);
            paint_snapshot(ctx);
            turtle.angle += rad(+deg || 0);
            turtle.draw();
        },

        left(deg) {
            ops.right(-deg);
        },

        to(name, args, body) {
            turtle.procedures[name] = {args, body};
        },

        clear() {
            clear(ctx);
            take_snapshot(ctx);
            turtle.angle = 0;
            turtle.draw();
        },
    };

    ops.fd = ops.forward;
    ops.rt = ops.right;
    ops.lt = ops.left;

    var api_cmd = {
        forward: function(distance) {
            return ['forward', distance];
        },
        back: function(distance) {
            return ['back', distance];
        },
        left: function(angle) {
            return ['left', angle];
        },
        right: function(angle) {
            return ['right', angle];
        },
    };

    function Ast_Builder() {
        this.ast = [];
        return this;
    };

    Object.assign(Ast_Builder.prototype, {
        forward: function(distance) {
            this.ast.push(api_cmd.forward(distance));
            return this;
        },
        back: function(distance) {
            this.ast.push(api_cmd.back(distance));
            return this;
        },
        left: function(angle) {
            this.ast.push(api_cmd.left(angle));
            return this;
        },
        right: function(angle) {
            this.ast.push(api_cmd.right(angle));
            return this;
        },
        repeat: function(count, body) {
            var cmd = ['repeat', count];
            if (Array.isArray(body)) {
                cmd.push(body);
            } else if ('function' === typeof body) {
                var api = new Ast_Builder();
                body(api);
                cmd.push(api.ast);
            } else {
                throw new Error("Repeat expects a function or an array for its body.");
            }
            this.ast.push(cmd);
            return this;
        },
    });

    Object.assign(Ast_Builder.prototype, {
        fd: Ast_Builder.prototype.forward,
        backward: Ast_Builder.prototype.back,
        bk: Ast_Builder.prototype.back,
        fd: Ast_Builder.prototype.forward,
        lt: Ast_Builder.prototype.left,
        rt: Ast_Builder.prototype.right,
    });


    var turtle_power = {
        clear: function() {
            ops.clear();
            return this;
        },
        forward: function(distance) {
            cmd_runner.cue([api_cmd.forward(distance)]);
            return this;
        },
        back: function(distance) {
            cmd_runner.cue([api_cmd.back(distance)]);
            return this;
        },
        left: function(angle) {
            cmd_runner.cue([api_cmd.left(angle)]);
            return this;
        },
        right: function(angle) {
            cmd_runner.cue([api_cmd.right(angle)]);
            return this;
        },
        to: function(name, args, body) {
            if ('function' === typeof body) {
                var api = new Ast_Builder();
                body.apply(this, [api].concat(args));
                ops.to(name, args, api.ast);
            } else if (!Array.isArray(body)) {
                throw new Error("to expects a function or an array for its body.");
            } else {
                ops.to(name, args, body);
            }
        },
        do: function() {
            cue_procedure(arguments[0], Array.prototype.slice.call(arguments, 1));
            return this;
        },
        perform,
        repeat: function(count, body) {
            var ast_builder = new Ast_Builder()
            cmd_runner.cue(ast_builder.repeat(count, body).ast);
            return this;
        },
        stop: turtle.stop.bind(turtle),
    };

    turtle_power.fd = turtle_power.forward.bind(turtle_power);
    turtle_power.rt = turtle_power.right.bind(turtle_power);
    turtle_power.lt = turtle_power.left.bind(turtle_power);
    turtle_power.backward = turtle_power.back.bind(turtle_power);
    turtle_power.bk = turtle_power.back.bind(turtle_power);

    return turtle_power;
}
