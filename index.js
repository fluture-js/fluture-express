//. # Fluture Express
//.
//. [![NPM Version](https://badge.fury.io/js/fluture-express.svg)](https://www.npmjs.com/package/fluture-express)
//. [![Dependencies](https://david-dm.org/fluture-js/fluture-express.svg)](https://david-dm.org/fluture-js/fluture-express)
//. [![Build Status](https://travis-ci.org/fluture-js/fluture-express.svg?branch=master)](https://travis-ci.org/fluture-js/fluture-express)
//. [![Code Coverage](https://codecov.io/gh/fluture-js/fluture-express/branch/master/graph/badge.svg)](https://codecov.io/gh/fluture-js/fluture-express)
//. [![Greenkeeper badge](https://badges.greenkeeper.io/fluture-js/fluture-express.svg)](https://greenkeeper.io/)
//.
//. Create Express middleware using Futures from [Fluture][].

'use strict';

const daggy = require('daggy');
const Future = require('fluture');
const path = require('path');

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
//. //index.js
//.
//. const {dispatcher} = require('fluture-express');
//. const app = require('express')();
//. const dispatch = dispatcher('./actions');
//.
//. app.use(dispatch('welcome'));
//. app.listen(3000);
//. ```
//.
//. ```js
//. //actions/welcome.js
//.
//. const {Json} = require('fluture-express');
//. const Future = require('fluture');
//.
//. module.exports = (req, locals) => Future.do(function*(){
//.   const user = yield locals.database.find('sessions', locals.session.id);
//.   return Json(200, {welcome: user.name});
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
//.
//. ### The Response type
//.
//. Fluture-Express mutates the response object for you, based on a
//. specification of what the response should be. This specification is
//. captured by the Response sum-type. It has these constructors:
//.
//# Stream :: (Number, String, NodeReadableStream) -> Response a
//.
//. Indicates a streamed response. The first argument will be the response
//. status code, the second will be used as a mime type, and the third will be
//. piped into the response to form the response data.
//.
//# Json :: (Number, Object) -> Response a
//.
//. Indicates a JSON response. The first argument will be the response status
//. code, and the second will be converted to JSON and sent as-is.
//.
//# Redirect :: (Number, String) -> Response a
//.
//. Indicates a redirection. The first argument will be the response status
//. code, and the second will be the value of the Location header.
//.
//# Empty :: Response a
//.
//. Indicates an empty response. The response status will be set to 204, and
//. no response body or Content-Type header will be sent.
//.
//# Next :: a -> Response a
//.
//. Indicates that this middleware does not form a response. The supplied value
//. will be assigned to `res.locals` and the next middleware will be called.
const Response = daggy.taggedSum('Response', {
  Stream: ['code', 'mime', 'stream'],
  Json: ['code', 'value'],
  Redirect: ['code', 'url'],
  Empty: [],
  Next: ['locals'],
});

const runAction = (name, action, req, res, next) => {
  const ret = action(req, res.locals);

  if (!Future.isFuture(ret)) {
    throw new TypeError(
      `The "${name}" action did not return a Future, instead saw:\n\n  ${ret}`
    );
  }

  ret.fork(next, val => {
    if (!Response.is(val)) {
      throw new TypeError(`The Future returned by the "${
        name
      }" action did not resolve to a Response, instead saw:\n\n  ${val}`);
    }

    val.cata({
      Stream: (code, mime, stream) => {
        stream.pipe(res.type(mime).status(code));
      },
      Json: (code, json) => {
        res.status(code).json(json);
      },
      Redirect: (code, url) => {
        res.redirect(code, url);
      },
      Empty: () => {
        res.status(204).end();
      },
      Next: locals => {
        res.locals = locals;
        next();
      },
    });
  });
};

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
const middleware = action => function dispatcher(req, res, next) {
  runAction(action.name || 'anonymous', action, req, res, next);
};

//# dispatcher :: String -> String -> (Req, Res a, (Any -> Undefined)) -> Undefined
//.
//. Creates middleware that uses the export from the given file in the given
//. directory as an "action".
//.
//. It takes the file in two steps for convenience. You are encouraged to use
//. the first parameter to set up a sub-directory where all your actions live.
//.
//. The exported value should be a function of the same signature as given to
//. [`middleware`][].
const dispatcher = directory => file => {
  const action = require(path.resolve(directory, file));
  return function dispatcher(req, res, next) {
    runAction(file, action, req, res, next);
  };
};

module.exports = {
  dispatcher,
  middleware,
  Response,
  Stream: Response.Stream,
  Json: Response.Json,
  Redirect: Response.Redirect,
  Empty: Response.Empty,
  Next: Response.Next,
};

//. [Fluture]: https://github.com/fluture-js/Fluture
//. [Future]: https://github.com/fluture-js/Fluture#future
//. [Response]: #the-response-type
//. [`middleware`]: #middleware
//. [`res`]: #res-a
//. [error handling with Express]: https://expressjs.com/en/guide/error-handling.html
