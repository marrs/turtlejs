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
    var turtle_canvas = document.createElement('canvas');
    turtle_canvas.width = canvas.width;
    turtle_canvas.height = canvas.height;
    turtle_canvas.style.left = canvas.offsetLeft + "px";
    turtle_canvas.style.top = canvas.offsetTop + "px";
    turtle_canvas.style.position = "absolute";
    canvas.after(turtle_canvas);
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

    var turtle_traits = {
        draw() {
            if (turtle.visible) {
                var {context: ctx, angle} = this;
                var {x, y} = this.pos;

                ctx.save();
                    ctx.translate(x, y);
                    ctx.rotate(-angle);
                    ctx.translate(-x, -y);
                    clear(ctx);
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
        colour: {
            r: 0,
            g: 0,
            b: 0,
            a: 1
        },
        canvas: turtle_canvas,
        context: turtle_canvas.getContext('2d'),
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
    init_context(turtle.context);

    function line_to_x_boundary(x_boundary_pos) {
        var {x, y} = turtle.pos;
        var {sin, cos} = turtle;
        var mag = abs((x_boundary_pos - x) / sin);
        var new_y= cos * mag + y;
        line_to(x_boundary_pos, new_y);
        return mag;
    }

    function line_to_y_boundary(y_boundary_pos) {
        var {x, y} = turtle.pos;
        var {sin, cos} = turtle;
        var mag = Math.abs((y_boundary_pos - y) / cos);
        const new_x = sin * mag + x;
        line_to(new_x, y_boundary_pos);
        return mag;
    }

    function line_to(x, y) {
        ctx.lineTo(x, y);
        turtle.pos.x = x;
        turtle.pos.y = y;
    }

    function forward(distance) {
        distance = +distance;

        ctx.save();
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
                    distance -= line_to_x_boundary(max_x);
                } break;
                case new_x < min_x: {
                    distance -= line_to_x_boundary(min_x);
                } break;
                case new_y > max_y: {
                    distance -= line_to_y_boundary(max_y);
                } break;
                case new_y < min_y: {
                    distance -= line_to_y_boundary(min_y);
                } break;
                default: {
                    line_to(new_x, new_y);
                    distance = 0;
                }
            }

            turtle.penDown && ctx.stroke();
            turtle.draw();
            ctx.restore();
        }
    }

    function right(deg) {
        turtle.angle += rad(+deg || 0);
        turtle.draw();
    }

    function left(deg) {
        turtle.angle -= rad(+deg || 0);
        turtle.draw();
    }

    return {
        clear: function() {
            clear(ctx);
            turtle.draw();
        },
        forward,
        fd: forward,
        left,
        lt: left,
        right,
        rt: right,
    }
}
