//. # Fluture Express
//.
//. [![NPM Version](https://badge.fury.io/js/fluture-express.svg)](https://www.npmjs.com/package/fluture-express)
//. [![Dependencies](https://david-dm.org/fluture-js/fluture-express.svg)](https://david-dm.org/fluture-js/fluture-express)
//. [![Code Coverage](https://codecov.io/gh/fluture-js/fluture-express/branch/master/graph/badge.svg)](https://codecov.io/gh/fluture-js/fluture-express)
//.
//. Create Express middleware using Futures from [Fluture][].
//.
//. Allows for the definition of pure functions to be used as Express
//. middleware. This has benefits for testing and developer sanity.
//. Another benefit of this particular approach, where every middleware is
//. wrapped individually, is that it plays nicely with existing Express
//. middleware, and they can be used interchangably.
//.
//. ## Usage
//.
//. ### Node
//.
//. ```console
//. $ npm install --save fluture-express
//. ```
//.
//. On Node 12 and up, this module can be loaded directly with `import` or
//. `require`. On Node versions below 12, `require` or the [esm][]-loader can
//. be used.
//.
//. ### Deno and Modern Browsers
//.
//. You can load the EcmaScript module from various content delivery networks:
//.
//. - [Skypack](https://cdn.skypack.dev/fluture-express@5.0.0)
//. - [JSPM](https://jspm.dev/fluture-express@5.0.0)
//. - [jsDelivr](https://cdn.jsdelivr.net/npm/fluture-express@5.0.0/+esm)
//.
//. ### Usage Example
//.
//. ```js
//. // index.js
//.
//. const {dispatcher} = require ('fluture-express');
//. const app = require ('express') ();
//. const dispatch = dispatcher ('./actions');
//.
//. app.use (dispatch ('welcome'));
//. app.listen (3000);
//. ```
//.
//. ```js
//. // actions/welcome.js
//.
//. const {Json} = require ('fluture-express');
//. const Future = require ('fluture');
//.
//. module.exports = locals => req => Future.do (function* () {
//.   const user = yield locals.database.find ('sessions', locals.session.id);
//.   return withStatus (418) (Json ({welcome: user.name}));
//. });
//. ```
//.
//. For a more in-depth example, see the `example` directory.
//.
//. ## Documentation
//.
//. ### Pseudo types
//.
//. #### `Req`
//.
//. The Express Request object.
//.
//. #### `Res a`
//.
//. The Express Response object with a `locals` property of type `a`.

import daggy from 'daggy';
import {fork, isFuture} from 'fluture';
import path from 'path';
import Z from 'sanctuary-type-classes';

const requireOrImport = file => (
  /* c8 ignore next */
  typeof require === 'function' ?
  Promise.resolve (require (file)) :
  import (file).then (module => module.default)
);

const cata = cases => catamorphic => catamorphic.cata (cases);

const cataWithDefault = def => pattern => catamorphic => {
  const tags = catamorphic.constructor['@@tags'];

  const defaultPattern = (
    Object.fromEntries (tags.map (tag => [tag, _ => def]))
  );

  return catamorphic.cata ({
    ...defaultPattern,
    ...pattern,
  });
};

const cataBool = cataWithDefault (false);

const deriveEq = type => {
  const tags = type['@@tags'];
  type.prototype['fantasy-land/equals'] = function FL$equals(other) {
    const pattern = Object.fromEntries (tags.map (tag => [
      tag,
      (...xs) => cataBool ({[tag]: (...ys) => Z.equals (xs, ys)}),
    ]));
    return this.cata (pattern) (other);
  };
};

const runAction = (name, action, req, res, next) => {
  const ret = action (res.locals) (req);

  if (!isFuture (ret)) {
    throw new TypeError (
      `The "${name}" action did not return a Future, instead saw:\n\n  ${ret}`
    );
  }

  fork (next) (val => {
    if (!Response.is (val)) {
      throw new TypeError (`The Future returned by the "${
        name
      }" action did not resolve to a Response, instead saw:\n\n  ${val}`);
    }

    val.cata ({
      Respond: (head, body) => {
        head.forEach (it => it.cata ({
          Status: code => res.status (code),
          Type: type => res.type (type),
          Location: url => res.location (url),
          Links: links => res.links (links),
          Cookie: (key, value, options) => res.cookie (key, value, options),
          ClearCookie: (key, options) => res.clearCookie (key, options),
          HeaderPart: (key, value) => res.append (key, value),
          Header: (key, value) => res.set (key, value),
        }));
        body.cata ({
          None: _ => res.end (),
          Send: data => res.send (data),
          Json: data => res.json (data),
          Stream: fork (next) (it => it.pipe (res)),
          Render: (template, data) => res.render (template, data),
        });
      },
      Next: locals => {
        res.locals = locals;
        next ();
      },
    });
  }) (ret);
};

//. ### The Response type
//.
//. Fluture-Express mutates the response object for you, based on a
//. specification of what the response should be. This specification is
//. captured by the Response sum-type.
//.
//# Response :: Type
//.
//. The Response sum type encoded with [daggy][]. You probably don't need to
//. use this directly.
//.
//. ```hs
//. data Response a b = Respond (Array Head) (Body a)
//.                   | Next b
//. ```
export const Response = daggy.taggedSum ('Response', {
  Respond: ['head', 'body'],
  Next: ['locals'],
});

deriveEq (Response);

//# Head :: Type
//.
//. The Head sum type encoded with [daggy][]. You probably don't need to
//. use this directly.
//.
//. ```hs
//. data Head = Status Number
//.           | Type String
//.           | Location String
//.           | Links (StrMap String)
//.           | Cookie String String Object
//.           | ClearCookie String Object
//.           | HeaderPart String String
//.           | Header String String
//. ```
export const Head = daggy.taggedSum ('Head', {
  Status: ['code'],
  Type: ['type'],
  Location: ['url'],
  Links: ['links'],
  Cookie: ['key', 'value', 'options'],
  ClearCookie: ['key', 'options'],
  HeaderPart: ['key', 'value'],
  Header: ['key', 'value'],
});

deriveEq (Head);

//# Body :: Type
//.
//. The Body sum type encoded with [daggy][]. You probably don't need to
//. use this directly.
//.
//. ```hs
//. data Body a = None
//.             | Send Any
//.             | Json JsonValue
//.             | Stream (Future a Readable)
//.             | Render String Object
//. ```
export const Body = daggy.taggedSum ('Body', {
  None: [],
  Send: ['data'],
  Json: ['data'],
  Stream: ['stream'],
  Render: ['template', 'data'],
});

Body.prototype['fantasy-land/equals'] = function Body$FL$equals(other) {
  return this.cata ({
    None: _ => cataBool ({None: _ => true}),
    Send: a => cataBool ({Send: b => Z.equals (a, b)}),
    Json: a => cataBool ({Json: b => Z.equals (a, b)}),
    Stream: a => cataBool ({Stream: b => a === b}),
    Render: (...a) => cataBool ({Render: (...b) => Z.equals (a, b)}),
  }) (other);
};

//# Stream -> Future a Readable -> Response a b
//.
//. Creates a streamed response given a mime type and a Future that produces
//. a Readable Stream when consumed. The Future is expected to produce a new
//. Stream every time it's consumed, or if it can't, reject with a value that
//. your Express error handler can handle.
//.
//. Uses a Content-Type of `application/octet-stream` unless overridden by
//. [`withType`](#withType), [`withHeader`](#withHeader),
//. or [`withoutHeader`](#withoutHeader).
export const Stream = stream => Response.Respond (
  [Head.Type ('application/octet-stream')],
  Body.Stream (stream)
);

//# Text :: String -> Response a b
//.
//. Indicates a textual response.
//.
//. Uses a Content-Type of `text/plain` unless overridden by
//. [`withType`](#withType), [`withHeader`](#withHeader),
//. or [`withoutHeader`](#withoutHeader).
export const Text = value => Response.Respond (
  [Head.Type ('text/plain')],
  Body.Send (value),
);

//# Json :: JsonValue -> Response a b
//.
//. Indicates a JSON response.
//.
//. Uses a Content-Type of `application/json` unless overridden by
//. [`withType`](#withType), [`withHeader`](#withHeader).
export const Json = value => Response.Respond (
  [],
  Body.Json (value),
);

//# Render :: String -⁠> Object -⁠> Response a b
//.
//. Indicates a response to be rendered using a template. The first argument
//. is the path to the template file, and the second is the data to inject into
//. the template. This uses Express' render method under the hood, so you can
//. configure it globally with `app.set ('view engine', engine)` and
//. `app.set ('views', path)`.
export const Render = view => data => Response.Respond (
  [],
  Body.Render (view, data)
);

//# Redirect :: String -> Response a b
//.
//. Indicates a redirection. The first argument will be the response status
//. code, and the second will be the value of the Location header.
//.
//. Unless overridden by [`withStatus`](#withStatus), the status code will be
//. set to 301 (Moved Permanently).
export const Redirect = location => Response.Respond (
  [Head.Status (301), Head.Location (location)],
  Body.None
);

//# Empty :: Response a b
//.
//. Indicates an empty response. The response status will be set to 204, and
//. no response body or Content-Type header will be sent.
export const Empty = Response.Respond (
  [Head.Status (204)],
  Body.None,
);

//# Next :: b -> Response a b
//.
//. Indicates that this middleware does not form a response. The supplied value
//. will be assigned to `res.locals` and the next middleware will be called.
export const Next = Response.Next;

//# withStatus :: Number -> Response a b -> Response a b
//.
//. Configure the status code by setting up a call to [`res.status`][].
export const withStatus = code => cata ({
  Respond: (head, body) => Response.Respond (
    [...head, Head.Status (code)],
    body,
  ),
  Next: Response.Next,
});

//# withType :: String -> Response a b -> Response a b
//.
//. Configure the Content-Type by setting up a call to [`res.type`][].
export const withType = type => cata ({
  Respond: (head, body) => Response.Respond (
    [...head, Head.Type (type)],
    body,
  ),
  Next: Response.Next,
});

//# withLocation :: String -> Response a b -> Response a b
//.
//. Configure the Location header by setting up a call to [`res.location`][].
export const withLocation = url => cata ({
  Respond: (head, body) => Response.Respond (
    [...head, Head.Location (url)],
    body,
  ),
  Next: Response.Next,
});

//# withLinks :: StrMap String -> Response a b -> Response a b
//.
//. Configure the Link header by setting up a call to [`res.links`][].
export const withLinks = links => cata ({
  Respond: (head, body) => Response.Respond (
    [...head, Head.Links (links)],
    body,
  ),
  Next: Response.Next,
});

//# withCookie :: CookieOptions -> String -> String -> Response a b -> Response a b
//.
//. Configure the Set-Cookie header by setting up a call to [`res.cookie`][].
export const withCookie = options => key => value => cata ({
  Respond: (head, body) => Response.Respond (
    [...head, Head.Cookie (key, value, options)],
    body,
  ),
  Next: Response.Next,
});

//# withClearCookie :: CookieOptions -> String -> Response a b -> Response a b
//.
//. Configure the Set-Cookie header by setting up a call to
//. [`res.clearCookie`][].
export const withClearCookie = options => key => cata ({
  Respond: (head, body) => Response.Respond (
    [...head, Head.ClearCookie (key, options)],
    body,
  ),
  Next: Response.Next,
});

//# withClearCookie :: String -> String -> Response a b -> Response a b
//.
//. Append to a header by setting up a call to [`res.append`][].
export const withHeaderPart = key => value => cata ({
  Respond: (head, body) => Response.Respond (
    [...head, Head.HeaderPart (key, value)],
    body,
  ),
  Next: Response.Next,
});

//# withHeader :: String -> String -> Response a b -> Response a b
//.
//. Configure a header by setting up a call to [`res.set`][].
export const withHeader = key => value => cata ({
  Respond: (head, body) => Response.Respond (
    [...head, Head.Header (key, value)],
    body,
  ),
  Next: Response.Next,
});

//# withoutHeader :: String -> Response a b -> Response a b
//.
//. Removes a header from the Response. Also removes headers that would be
//. set by functions like [`withType`](#withType). For example:
//.
//. ```js
//. > withoutHeader ('Content-Type') (withType ('json') (Empty))
//. Empty
//. ```
export const withoutHeader = header => cata ({
  Respond: (head, body) => Response.Respond (head.filter (cata ({
    Status: _ => true,
    Type: _ => header.toLowerCase () !== 'content-type',
    Location: _ => header.toLowerCase () !== 'location',
    Links: _ => header.toLowerCase () !== 'link',
    Cookie: _ => header.toLowerCase () !== 'set-cookie',
    ClearCookie: _ => header.toLowerCase () !== 'set-cookie',
    HeaderPart: key => key.toLowerCase () !== header.toLowerCase (),
    Header: key => key.toLowerCase () !== header.toLowerCase (),
  })), body),
  Next: Response.Next,
});

//. ### Middleware creation utilities
//.
//# middleware :: (b -> Req -> Future a (Response a b)) -> (Req, Res b, (a -> Undefined)) -> Undefined
//.
//. Converts an action to an Express middleware.
//.
//. Takes a function that returns a [Future][] of a [Response][], and returns
//. an Express middleware that uses the returned structure to make the
//. appropriate mutations to the [`res`][].
//.
//. If the Future rejects, the rejection reason is passed into `next` for
//. further [error handling with Express][].
export const middleware = action => function dispatcher(req, res, next) {
  runAction (action.name || 'anonymous', action, req, res, next);
};

//# dispatcher :: String -> String -> (Req, Res a, (Any -> Undefined)) -> Promise Undefined
//.
//. Creates middleware that uses the export from the given file in the given
//. directory as an "action".
//.
//. It takes the file in two steps for convenience. You are encouraged to use
//. the first parameter to set up a sub-directory where all your actions live.
//.
//. The exported value should be a function of the same signature as given to
//. [`middleware`][].
export const dispatcher = directory => file => {
  const eventualAction = requireOrImport (path.resolve (directory, file));
  return function dispatcher(req, res, next) {
    return eventualAction.then (action => {
      runAction (file, action, req, res, next);
    });
  };
};

//. [Fluture]: https://github.com/fluture-js/Fluture
//. [Future]: https://github.com/fluture-js/Fluture#future
//. [Response]: #the-response-type
//. [`middleware`]: #middleware
//. [`res`]: #res-a
//. [error handling with Express]: https://expressjs.com/en/guide/error-handling.html
//. [daggy]: https://github.com/fantasyland/daggy
//. [esm]: https://github.com/standard-things/esm

//. [`res.status`]: https://expressjs.com/en/4x/api.html#res.status
//. [`res.type`]: https://expressjs.com/en/4x/api.html#res.type
//. [`res.location`]: https://expressjs.com/en/4x/api.html#res.location
//. [`res.links`]: https://expressjs.com/en/4x/api.html#res.links
//. [`res.cookie`]: https://expressjs.com/en/4x/api.html#res.cookie
//. [`res.clearCookie`]: https://expressjs.com/en/4x/api.html#res.clearCookie
//. [`res.append`]: https://expressjs.com/en/4x/api.html#res.append
//. [`res.set`]: https://expressjs.com/en/4x/api.html#res.set
