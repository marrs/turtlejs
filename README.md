# TurtleJS - A Logo API for the web

TurtleJS provides an engine for performing drawing operations on a 2D canvas
using the classic LOGO language.

TurtleJS has no dependencies and is as small as is practically possible without sacrificing utility.

In the world of LOGO, a turtle is a drawing entity that can be directed by the
user to draw lines on a canvas with commands such as as `forward`, `back`, `right`, and `left`.

You can provide commands, either by calling drawing operations of the turtle
instance directly, or by providing an expression in the form of an abstract
syntax tree.  This allows you to implement a LOGO interpreter without having
to worry about implementing any of the underlying drawing operations yourself.

TurtleJS does not provide a LOGO interpreter itself, but see [logo.js ](demo/logo.js) for inspiration.

## Demo

This repository contains a demo of TurtleJS that can be run by serving it
from the project root.

## Developer Guide

> [!WARNING]
> The API herein is experimental and subject to change. As such, there
> is no release as yet.

## Licensing

This code is licensed under the GNU General Public Licence (GPL) v3.  In
short, you are free to use this code, even for commercial use, as long as
you provide the source code of both this software and your derivative work
to the end user under the terms and conditions of the GPL.  See
[LICENCE](LICENCE) for more information.

If you would like to license this software for proprietary use, please
send me a message on Github.

### Setting Up

A turtle can be instantiated by calling `Turtle` with the canvas
element as an argument.

```html
<!DOCTYPE HTML>
<html>
  <body>
    <canvas id="turtle-canvas"></canvas>
    <script src="turtle.js"></script>
    <script>
    var turtle = Turtle(document.getElementById('turtle-canvas'));
    </script>
  </body>
</html>
```

If everything is working correctly, a turtle (represented by a green
arrow) will appear in the centre of the canvas, facing up.

### Direct API calls

Various methods are provided for controlling the turtle.

To get started, try drawing a square with the following set of commands.

```js
turtle
  .forward(100)
  .right(90)
  .forward(100)
  .right(90)
  .forward(100)
  .right(90)
  .forward(100)
```

You should see a square appear on the canvas.

You can clear the canvas and reset the turtle position by calling
`turtle.clear()`.

You can simplify the above by making use of the `repeat` operator.

```js
turtle.repeat(4, (api) => {
  api
    .forward(100)
    .right(90)
})
```

In the example above, the contents of the callback passed to
`repeat` will be run 4 times. Its first argument is an API for
building commands, similar to the `turtle` object we've been using
so far.

> [!IMPORTANT]  
> Although they have the same interface, `api` and `turtle` perform
> different operations and using `turtle` in the place of `api` in the
> example above will produce unexpected behaviour.

It is also possible to define procedures using the `to` operator.
For example, to draw a square of any size, try the following:

```
turtle.to('square', ['size'], (api, size) => {
  api.repeat(4, (api) => {
    api.fd(size).rt(90)
  })
})
```

To define the procedure, we provided a name for the procedure to
the first argument, and an array containing the names of any
expected arguments next.  If no arguments are expected, pass an
empty array.  Finally the body of the procedure is passed as a
callback.

The callback's first argument is the api object, followed by the
arguments defined in the previous array.

Alternatively, the body can be represented by an array of
AST instructions.

Redefinition of procedures is allowed by the API.

You can now draw different sized squares by calling `turtle.do`.
```
turtle
  .do('square', 30)
  .do('square', 60)
  .do('square', 90)
```

### AST

The other way to interact with a turtle is to provide it with
instructions already compiled to an AST.

This is done by passing an array of instructions to `turtle.perform`.

For directional operations (and other primitives), this is of
the form `[$op $arg]`; e.g. `['forward', 100]` or `['right', 90]`.
> [!NOTE]
> `['right', '90']` will also work.  String will be converted
> to the correct type by the engine.

Repeat is performed using `['repeat', $count, $body]`, where
`$count` is the number of times to repeat the instructions
in `$body`, and `$body` is an array of instructions.

So to draw a square, as above, one could write:
```
turtle.perform([
  ['repeat', 4, [
    ['forward' 100]
    ['right' 90]
  ]]
])
```

Procedures are defined using the following syntax:
```
['to', $name, $args, $body]
```
where:
- `$name` is a string representing the name of the procedure
- `$args` is an array naming the arguments the procedure accepts
- `$body` is an array containing the instructions for the procedure.

To define the square procedure above, we can write
```
turtle.perform([
  ['to', 'square', ['size'], [
    ['repeat', 4, [
      ['forward', 'size']
      ['right' 90]
    ]]
  ]]
])
```
To define a procedure with no arguments, leave the argument array
empty.
```
turtle.perform([
  ['to', 'square', [], [
    ['repeat', 4, [
      ['forward', 100]
      ['right' 90]
    ]]
  ]]
])
```

Procedures are called like so:
```
turtle.perform([
  ['square', 30]
  ['square', 60]
  ['square', 90]
])
```

### Known issues

#### Memory leak

Turtle performs its operations by first putting them on a queue and then
running them asynchronously.  At the time of writing, this queue does not
get cleaned up after the operations are run and will simply grow with use.
