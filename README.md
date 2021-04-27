# Fluture Express

[![NPM Version](https://badge.fury.io/js/fluture-express.svg)](https://www.npmjs.com/package/fluture-express)
[![Dependencies](https://david-dm.org/fluture-js/fluture-express.svg)](https://david-dm.org/fluture-js/fluture-express)
[![Code Coverage](https://codecov.io/gh/fluture-js/fluture-express/branch/master/graph/badge.svg)](https://codecov.io/gh/fluture-js/fluture-express)

Create Express middleware using Futures from [Fluture][].

Allows for the definition of pure functions to be used as Express
middleware. This has benefits for testing and developer sanity.
Another benefit of this particular approach, where every middleware is
wrapped individually, is that it plays nicely with existing Express
middleware, and they can be used interchangably.

## Usage

### Node

```console
$ npm install --save fluture-express
```

On Node 12 and up, this module can be loaded directly with `import` or
`require`. On Node versions below 12, `require` or the [esm][]-loader can
be used.

### Deno and Modern Browsers

You can load the EcmaScript module from various content delivery networks:

- [Skypack](https://cdn.skypack.dev/fluture-express@6.0.0)
- [JSPM](https://jspm.dev/fluture-express@6.0.0)
- [jsDelivr](https://cdn.jsdelivr.net/npm/fluture-express@6.0.0/+esm)

### Usage Example

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

module.exports = locals => req => Future.go (function* () {
  const user = yield locals.database.find ('sessions', locals.session.id);
  return withStatus (418) (Json ({welcome: user.name}));
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

#### <a name="Response" href="https://github.com/fluture-js/fluture-express/blob/v6.0.0/index.js#L164">`Response :: Type`</a>

The Response sum type encoded with [daggy][]. You probably don't need to
use this directly.

```hs
data Response a b = Respond (Array Head) (Body a)
                  | Next b
```

#### <a name="Head" href="https://github.com/fluture-js/fluture-express/blob/v6.0.0/index.js#L180">`Head :: Type`</a>

The Head sum type encoded with [daggy][]. You probably don't need to
use this directly.

```hs
data Head = Status Number
          | Type String
          | Location String
          | Links (StrMap String)
          | Cookie String String Object
          | ClearCookie String Object
          | HeaderPart String String
          | Header String String
```

#### <a name="Body" href="https://github.com/fluture-js/fluture-express/blob/v6.0.0/index.js#L208">`Body :: Type`</a>

The Body sum type encoded with [daggy][]. You probably don't need to
use this directly.

```hs
data Body a = None
            | Send Any
            | Json JsonValue
            | Stream (Future a Readable)
            | Render String Object
```

#### <a name="Stream -> Future a Readable -> Response a b" href="https://github.com/fluture-js/fluture-express/blob/v6.0.0/index.js#L238">`Stream -⁠> Future a Readable -⁠> Response a b`</a>

Creates a streamed response given a mime type and a Future that produces
a Readable Stream when consumed. The Future is expected to produce a new
Stream every time it's consumed, or if it can't, reject with a value that
your Express error handler can handle.

Uses a Content-Type of `application/octet-stream` unless overridden by
[`withType`](#withType), [`withHeader`](#withHeader),
or [`withoutHeader`](#withoutHeader).

#### <a name="Text" href="https://github.com/fluture-js/fluture-express/blob/v6.0.0/index.js#L253">`Text :: String -⁠> Response a b`</a>

Indicates a textual response.

Uses a Content-Type of `text/plain` unless overridden by
[`withType`](#withType), [`withHeader`](#withHeader),
or [`withoutHeader`](#withoutHeader).

#### <a name="Json" href="https://github.com/fluture-js/fluture-express/blob/v6.0.0/index.js#L265">`Json :: JsonValue -⁠> Response a b`</a>

Indicates a JSON response.

Uses a Content-Type of `application/json` unless overridden by
[`withType`](#withType), [`withHeader`](#withHeader).

#### <a name="Render" href="https://github.com/fluture-js/fluture-express/blob/v6.0.0/index.js#L276">`Render :: String -⁠> Object -⁠> Response a b`</a>

Indicates a response to be rendered using a template. The first argument
is the path to the template file, and the second is the data to inject into
the template. This uses Express' render method under the hood, so you can
configure it globally with `app.set ('view engine', engine)` and
`app.set ('views', path)`.

#### <a name="Redirect" href="https://github.com/fluture-js/fluture-express/blob/v6.0.0/index.js#L288">`Redirect :: String -⁠> Response a b`</a>

Indicates a redirection. The first argument will be the response status
code, and the second will be the value of the Location header.

Unless overridden by [`withStatus`](#withStatus), the status code will be
set to 301 (Moved Permanently).

#### <a name="Empty" href="https://github.com/fluture-js/fluture-express/blob/v6.0.0/index.js#L300">`Empty :: Response a b`</a>

Indicates an empty response. The response status will be set to 204, and
no response body or Content-Type header will be sent.

#### <a name="Next" href="https://github.com/fluture-js/fluture-express/blob/v6.0.0/index.js#L309">`Next :: b -⁠> Response a b`</a>

Indicates that this middleware does not form a response. The supplied value
will be assigned to `res.locals` and the next middleware will be called.

#### <a name="withStatus" href="https://github.com/fluture-js/fluture-express/blob/v6.0.0/index.js#L315">`withStatus :: Number -⁠> Response a b -⁠> Response a b`</a>

Configure the status code by setting up a call to [`res.status`][].

#### <a name="withType" href="https://github.com/fluture-js/fluture-express/blob/v6.0.0/index.js#L326">`withType :: String -⁠> Response a b -⁠> Response a b`</a>

Configure the Content-Type by setting up a call to [`res.type`][].

#### <a name="withLocation" href="https://github.com/fluture-js/fluture-express/blob/v6.0.0/index.js#L337">`withLocation :: String -⁠> Response a b -⁠> Response a b`</a>

Configure the Location header by setting up a call to [`res.location`][].

#### <a name="withLinks" href="https://github.com/fluture-js/fluture-express/blob/v6.0.0/index.js#L348">`withLinks :: StrMap String -⁠> Response a b -⁠> Response a b`</a>

Configure the Link header by setting up a call to [`res.links`][].

#### <a name="withCookie" href="https://github.com/fluture-js/fluture-express/blob/v6.0.0/index.js#L359">`withCookie :: CookieOptions -⁠> String -⁠> String -⁠> Response a b -⁠> Response a b`</a>

Configure the Set-Cookie header by setting up a call to [`res.cookie`][].

#### <a name="withClearCookie" href="https://github.com/fluture-js/fluture-express/blob/v6.0.0/index.js#L370">`withClearCookie :: CookieOptions -⁠> String -⁠> Response a b -⁠> Response a b`</a>

Configure the Set-Cookie header by setting up a call to
[`res.clearCookie`][].

#### <a name="withClearCookie" href="https://github.com/fluture-js/fluture-express/blob/v6.0.0/index.js#L382">`withClearCookie :: String -⁠> String -⁠> Response a b -⁠> Response a b`</a>

Append to a header by setting up a call to [`res.append`][].

#### <a name="withHeader" href="https://github.com/fluture-js/fluture-express/blob/v6.0.0/index.js#L393">`withHeader :: String -⁠> String -⁠> Response a b -⁠> Response a b`</a>

Configure a header by setting up a call to [`res.set`][].

#### <a name="withoutHeader" href="https://github.com/fluture-js/fluture-express/blob/v6.0.0/index.js#L404">`withoutHeader :: String -⁠> Response a b -⁠> Response a b`</a>

Removes a header from the Response. Also removes headers that would be
set by functions like [`withType`](#withType). For example:

```js
> withoutHeader ('Content-Type') (withType ('json') (Empty))
Empty
```

### Middleware creation utilities

#### <a name="middleware" href="https://github.com/fluture-js/fluture-express/blob/v6.0.0/index.js#L429">`middleware :: (b -⁠> Req -⁠> Future a (Response a b)) -⁠> (Req, Res b, (a -⁠> Undefined)) -⁠> Undefined`</a>

Converts an action to an Express middleware.

Takes a function that returns a [Future][] of a [Response][], and returns
an Express middleware that uses the returned structure to make the
appropriate mutations to the [`res`][].

If the Future rejects, the rejection reason is passed into `next` for
further [error handling with Express][].

#### <a name="dispatcher" href="https://github.com/fluture-js/fluture-express/blob/v6.0.0/index.js#L443">`dispatcher :: String -⁠> String -⁠> (Req, Res a, (Any -⁠> Undefined)) -⁠> Promise Undefined`</a>

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
[esm]: https://github.com/standard-things/esm

[`res.status`]: https://expressjs.com/en/4x/api.html#res.status
[`res.type`]: https://expressjs.com/en/4x/api.html#res.type
[`res.location`]: https://expressjs.com/en/4x/api.html#res.location
[`res.links`]: https://expressjs.com/en/4x/api.html#res.links
[`res.cookie`]: https://expressjs.com/en/4x/api.html#res.cookie
[`res.clearCookie`]: https://expressjs.com/en/4x/api.html#res.clearCookie
[`res.append`]: https://expressjs.com/en/4x/api.html#res.append
[`res.set`]: https://expressjs.com/en/4x/api.html#res.set
