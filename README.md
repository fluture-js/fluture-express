# Fluture Express

Create Express middleware using Futures from [Fluture][].

## Usage

```sh
npm install --save fluture fluture-express
```

Allows for the definition of pure functions to be used as Express
middleware. This has benefits for testing and developer sanity.
Another benefit of this particular approach, where every middleware is
wrapped individually, is that it plays nicely with existing Express
middleware, and they can be used interchangably.

```js
//index.js

const {dispatcher} = require('fluture-express');
const app = require('express')();
const dispatch = dispatcher('./actions');

app.use(dispatch('welcome'));
app.listen(3000);
```

```js
//actions/welcome.js

const {Json} = require('fluture-express');
const Future = require('fluture');

module.exports = (req, locals) => Future.do(function*(){
  const user = yield locals.database.find('sessions', locals.session.id);
  return Json(200, {welcome: user.name});
});
```

For a more in-depth example, see the `example` directory.

## Documentation

### Pseudo types

#### `Req`

The Express Request object.

#### `Res a`

The Express Response object with a `locals` property of type `a`.

### The Response type

Fluture-Express mutates the response object for you, based on a
specification of what the response should be. This specification is
captured by the Response sum-type. It has three constructors.

<h4 name="Stream"><code><a href="https://github.com/fluture-js/fluture-express/blob/v1.0.0/index.js#L66">Stream :: (Number, String, NodeReadableStream) -⁠> Response a</a></code></h4>

Indicates a streamed response. The first argument will be the response
status code, the second will be used as a mime type, and the third will be
piped into the response to form the response data.

<h4 name="Json"><code><a href="https://github.com/fluture-js/fluture-express/blob/v1.0.0/index.js#L72">Json :: (Number, Object) -⁠> Response a</a></code></h4>

Indicates a JSON response. The first argument will be the response status
code, and the second will be converted to JSON and sent as-is.

<h4 name="Next"><code><a href="https://github.com/fluture-js/fluture-express/blob/v1.0.0/index.js#L77">Next :: a -⁠> Response a</a></code></h4>

Indicates that this middleware does not form a response. The supplied value
will be assigned to `res.locals` and the next middleware will be called.

<h4 name="middleware"><code><a href="https://github.com/fluture-js/fluture-express/blob/v1.0.0/index.js#L118">middleware :: ((Req, a) -⁠> Future b (Response a)) -⁠> (Req, Res a, (b -⁠> Undefined)) -⁠> Undefined</a></code></h4>

Converts an action to an Express middleware.

Takes a function that returns a [Future][] of a [Response][], and returns
an Express middleware that uses the returned structure to make the
appropriate mutations to the [`res`][].

If the Future rejects, the rejection reason is passed into `next` for
further [error handling with Express][].

### Middleware creation utilities

<h4 name="dispatcher"><code><a href="https://github.com/fluture-js/fluture-express/blob/v1.0.0/index.js#L134">dispatcher :: String -⁠> String -⁠> (Req, Res a, (Any -⁠> Undefined)) -⁠> Undefined</a></code></h4>

Creates middleware that uses the export from the given file in the given
directory as an "action".

It takes the file in two steps for convenience. You are encouraged to use
the first parameter to set up a sub-directory where all your actions live.

The exported value should be a function of the same signature as given to
[`middleware`][].

[Fluture]: https://github.com/fluture-js/Fluture
[Future]: https://github.com/fluture-js/Fluture#future
[Response]: #the-response-type
[`middleware`]: #middleware
[`res`]: #res-a
[error handling with Express]: https://expressjs.com/en/guide/error-handling.html
