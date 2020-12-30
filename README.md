# Fluture Express

[![NPM Version](https://badge.fury.io/js/fluture-express.svg)](https://www.npmjs.com/package/fluture-express)
[![Dependencies](https://david-dm.org/fluture-js/fluture-express.svg)](https://david-dm.org/fluture-js/fluture-express)
[![Code Coverage](https://codecov.io/gh/fluture-js/fluture-express/branch/master/graph/badge.svg)](https://codecov.io/gh/fluture-js/fluture-express)

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
// index.js

const {dispatcher} = require ('fluture-express');
const app = require ('express') ();
const dispatch = dispatcher ('./actions');

app.use (dispatch ('welcome'));
app.listen (3000);
```

```js
// actions/welcome.js

const {Json} = require ('fluture-express');
const Future = require ('fluture');

module.exports = (req, locals) => Future.do (function* () {
  const user = yield locals.database.find ('sessions', locals.session.id);
  return Json (200, {welcome: user.name});
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
captured by the Response sum-type.

#### <a name="Response" href="https://github.com/fluture-js/fluture-express/blob/v4.0.0/index.js#L120">`Response :: Type`</a>

The [daggy][] type representative of the Response type. You'll want to
use one of its constructors listed below most of the time.

#### <a name="Stream" href="https://github.com/fluture-js/fluture-express/blob/v4.0.0/index.js#L133">`Stream :: Number -⁠> String -⁠> NodeReadableStream -⁠> Response a`</a>

Indicates a streamed response. The first argument will be the response
status code, the second will be used as a mime type, and the third will be
piped into the response to form the response data.

#### <a name="Json" href="https://github.com/fluture-js/fluture-express/blob/v4.0.0/index.js#L142">`Json :: Number -⁠> Object -⁠> Response a`</a>

Indicates a JSON response. The first argument will be the response status
code, and the second will be converted to JSON and sent as-is.

#### <a name="Render" href="https://github.com/fluture-js/fluture-express/blob/v4.0.0/index.js#L150">`Render :: Number -⁠> String -⁠> Object -⁠> Response a`</a>

Indicates a response to be rendered using a template. The first argument
will be the response status code, the second is the path to the template
file, and the third is the data to inject into the template. This uses
Express' render method under the hood, so you can configure it globally
with `app.set ('view engine', engine)` and `app.set ('views', path)`.

#### <a name="Redirect" href="https://github.com/fluture-js/fluture-express/blob/v4.0.0/index.js#L161">`Redirect :: Number -⁠> String -⁠> Response a`</a>

Indicates a redirection. The first argument will be the response status
code, and the second will be the value of the Location header.

#### <a name="Empty" href="https://github.com/fluture-js/fluture-express/blob/v4.0.0/index.js#L169">`Empty :: Response a`</a>

Indicates an empty response. The response status will be set to 204, and
no response body or Content-Type header will be sent.

#### <a name="Next" href="https://github.com/fluture-js/fluture-express/blob/v4.0.0/index.js#L175">`Next :: a -⁠> Response a`</a>

Indicates that this middleware does not form a response. The supplied value
will be assigned to `res.locals` and the next middleware will be called.

### Middleware creation utilities

#### <a name="middleware" href="https://github.com/fluture-js/fluture-express/blob/v4.0.0/index.js#L183">`middleware :: ((Req, a) -⁠> Future b (Response a)) -⁠> (Req, Res a, (b -⁠> Undefined)) -⁠> Undefined`</a>

Converts an action to an Express middleware.

Takes a function that returns a [Future][] of a [Response][], and returns
an Express middleware that uses the returned structure to make the
appropriate mutations to the [`res`][].

If the Future rejects, the rejection reason is passed into `next` for
further [error handling with Express][].

#### <a name="dispatcher" href="https://github.com/fluture-js/fluture-express/blob/v4.0.0/index.js#L197">`dispatcher :: String -⁠> String -⁠> (Req, Res a, (Any -⁠> Undefined)) -⁠> Promise Undefined`</a>

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
[daggy]: https://github.com/fantasyland/daggy
