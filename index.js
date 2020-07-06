//. # Fluture Express
//.
//. [![NPM Version](https://badge.fury.io/js/fluture-express.svg)](https://www.npmjs.com/package/fluture-express)
//. [![Dependencies](https://david-dm.org/fluture-js/fluture-express.svg)](https://david-dm.org/fluture-js/fluture-express)
//. [![Code Coverage](https://codecov.io/gh/fluture-js/fluture-express/branch/master/graph/badge.svg)](https://codecov.io/gh/fluture-js/fluture-express)
//.
//. Create Express middleware using Futures from [Fluture][].
//.
//. ## Usage
//.
//. ```sh
//. npm install --save fluture fluture-express
//. ```
//.
//. Allows for the definition of pure functions to be used as Express
//. middleware. This has benefits for testing and developer sanity.
//. Another benefit of this particular approach, where every middleware is
//. wrapped individually, is that it plays nicely with existing Express
//. middleware, and they can be used interchangably.
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
//. module.exports = (req, locals) => Future.do (function* () {
//.   const user = yield locals.database.find ('sessions', locals.session.id);
//.   return Json (200, {welcome: user.name});
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
import {fork, isFuture} from 'fluture/index.js';
import path from 'path';

const requireOrImport = file => (
  /* c8 ignore next */
  typeof require === 'function' ?
  Promise.resolve (require (file)) :
  import (file).then (module => module.default)
);

const runAction = (name, action, req, res, next) => {
  const ret = action (req, res.locals);

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
      Stream: (code, mime, stream) => {
        res.type (mime);
        res.status (code);
        stream.pipe (res);
      },
      Json: (code, json) => {
        res.status (code);
        res.json (json);
      },
      Render: (code, view, data) => {
        res.status (code);
        res.render (view, data);
      },
      Redirect: (code, url) => {
        res.redirect (code, url);
      },
      Empty: () => {
        res.status (204);
        res.end ();
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
//. The [daggy][] type representative of the Response type. You'll want to
//. use one of its constructors listed below most of the time.
export const Response = daggy.taggedSum ('Response', {
  Stream: ['code', 'mime', 'stream'],
  Json: ['code', 'value'],
  Redirect: ['code', 'url'],
  Empty: [],
  Next: ['locals'],
});

//# Stream :: Number -> String -> NodeReadableStream -> Response a
//.
//. Indicates a streamed response. The first argument will be the response
//. status code, the second will be used as a mime type, and the third will be
//. piped into the response to form the response data.
export const Stream = code => mime => stream => (
  Response.Stream (code, mime, stream)
);

//# Json :: Number -> Object -> Response a
//.
//. Indicates a JSON response. The first argument will be the response status
//. code, and the second will be converted to JSON and sent as-is.
export const Json = code => value => (
  Response.Json (code, value)
);

//# Render :: Number -> String -> Object -> Response a
//.
//. Indicates a response to be rendered using a template. The first argument
//. will be the response status code, the second is the path to the template
//. file, and the third is the data to inject into the template. This uses
//. Express' render method under the hood, so you can configure it globally
//. with app.set ('view engine', engine) and app.set ('views', path).
export const Render = code => view => data => (
  Response.Render(code, view, data)
)

//# Redirect :: Number -> String -> Response a
//.
//. Indicates a redirection. The first argument will be the response status
//. code, and the second will be the value of the Location header.
export const Redirect = code => location => (
  Response.Redirect (code, location)
);

//# Empty :: Response a
//.
//. Indicates an empty response. The response status will be set to 204, and
//. no response body or Content-Type header will be sent.
export const Empty = Response.Empty;

//# Next :: a -> Response a
//.
//. Indicates that this middleware does not form a response. The supplied value
//. will be assigned to `res.locals` and the next middleware will be called.
export const Next = Response.Next;

//. ### Middleware creation utilities
//.
//# middleware :: ((Req, a) -> Future b (Response a)) -> (Req, Res a, (b -> Undefined)) -> Undefined
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
