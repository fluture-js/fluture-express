import assert from 'assert';
import {resolve} from 'fluture';
import Z from 'sanctuary-type-classes';
import sinon from 'sinon';
import test from 'oletus';
import {emptyStream} from 'fluture-node';
import show from 'sanctuary-show';

import * as lib from '../index.js';


function eq(actual, expected) {
  assert.strictEqual (arguments.length, eq.length);
  assert.strictEqual (show (actual), show (expected));
  assert.strictEqual (Z.equals (actual, expected), true);
}

function methodSpy() {
  return (sinon.stub ()).returnsThis ();
}

function noop() {}

function throws(fn, expected) {
  try { fn (); } catch (e) { eq (e, expected); }
}

test ('Stream', () => {
  eq (lib.Response.is (lib.Stream (emptyStream)), true);
});

test ('Text', () => {
  eq (lib.Response.is (lib.Text ('')), true);
});

test ('Json', () => {
  eq (lib.Response.is (lib.Json (null)), true);
});

test ('Render', () => {
  eq (lib.Response.is (lib.Render ('') ('')), true);
});

test ('Redirect', () => {
  eq (lib.Response.is (lib.Redirect ('')), true);
});

test ('Empty', () => {
  eq (lib.Response.is (lib.Empty), true);
});

test ('Next', () => {
  eq (lib.Response.is (lib.Next (null)), true);
});

test ('withStatus', () => {
  eq (lib.Response.is (lib.withStatus (201) (lib.Empty)), true);
  eq (lib.withStatus (201) (lib.Next (null)), lib.Next (null));
});

test ('withType', () => {
  eq (lib.Response.is (lib.withType ('json') (lib.Empty)), true);
  eq (lib.withType ('json') (lib.Next (null)), lib.Next (null));
});

test ('withLocation', () => {
  eq (lib.Response.is (lib.withLocation ('/') (lib.Empty)), true);
  eq (lib.withLocation ('/') (lib.Next (null)), lib.Next (null));
});

test ('withLinks', () => {
  eq (lib.Response.is (lib.withLinks ({foo: 'example.com'}) (lib.Empty)), true);
  eq (lib.withLinks ({foo: 'example.com'}) (lib.Next (null)), lib.Next (null));
});

test ('withCookie', () => {
  eq (lib.Response.is (lib.withCookie ({}) ('user') ('bob') (lib.Empty)), true);
  eq (lib.withCookie ({}) ('user') ('bob') (lib.Next (null)), lib.Next (null));
});

test ('withClearCookie', () => {
  eq (lib.Response.is (lib.withClearCookie ({}) ('user') (lib.Empty)), true);
  eq (lib.withClearCookie ({}) ('user') (lib.Next (null)), lib.Next (null));
});

test ('withHeaderPart', () => {
  eq (lib.Response.is (lib.withHeaderPart ('X-Answer') ('42') (lib.Empty)), true);
  eq (lib.withHeaderPart ('X-Answer') ('42') (lib.Next (null)), lib.Next (null));
});

test ('withHeader', () => {
  eq (lib.Response.is (lib.withHeader ('X-Answer') ('42') (lib.Empty)), true);
  eq (lib.withHeader ('X-Answer') ('42') (lib.Next (null)), lib.Next (null));
});

test ('withoutHeader', () => {
  eq (lib.withoutHeader ('Content-Type') (lib.withType ('json') (lib.Empty)), lib.Empty);
  eq (lib.withoutHeader ('Location') (lib.withLocation ('/') (lib.Empty)), lib.Empty);
  eq (lib.withoutHeader ('Link') (lib.withLinks ({foo: 'example.com'}) (lib.Empty)), lib.Empty);
  eq (lib.withoutHeader ('Set-Cookie') (lib.withCookie ({}) ('user') ('bob') (lib.Empty)), lib.Empty);
  eq (lib.withoutHeader ('Set-Cookie') (lib.withClearCookie ({}) ('user') (lib.Empty)), lib.Empty);
  eq (lib.withoutHeader ('X-Answer') (lib.withHeaderPart ('X-Answer') ('42') (lib.Empty)), lib.Empty);
  eq (lib.withoutHeader ('X-Answer') (lib.withHeader ('X-Answer') ('42') (lib.Empty)), lib.Empty);
  eq (lib.withoutHeader ('X-Other') (lib.withHeader ('X-Answer') ('42') (lib.Empty)), lib.withHeader ('X-Answer') ('42') (lib.Empty));
});

test ('middleware', () => {
  /* eslint-disable prefer-arrow-callback */
  const mock = lib.middleware (function mock() { return _ => resolve (lib.Json ({})); });
  const mockNoFuture = lib.middleware (function mock() { return _ => null; });
  const mockNoResponse = lib.middleware (function mock() { return _ => resolve (null); });
  /* eslint-enable prefer-arrow-callback */

  eq (typeof mock, typeof mockNoFuture);
  eq (mock.length, mockNoFuture.length);
  eq (typeof mock, typeof mockNoResponse);
  eq (mock.length, mockNoResponse.length);

  eq (typeof mock, 'function');
  eq (mock.length, 3);

  throws (_ => mockNoFuture ({}, {}, noop), new TypeError (
    'The "mock" action did not return a Future, instead saw:\n\n  null'
  ));

  throws (_ => mockNoResponse ({}, {}, noop), new TypeError (
    'The Future returned by the "mock" action did not resolve to a '
    + 'Response, instead saw:\n\n  null'
  ));
});

test ('Next middleware', () => {
  const mock = lib.middleware (_ => _ => resolve (lib.Next ({foo: 'bar'})));
  const mockRes = {status: sinon.spy (), json: sinon.spy ()};
  const mockNext = sinon.spy ();

  mock ({}, mockRes, mockNext);

  eq (mockRes.status.args, []);
  eq (mockRes.json.args, []);
  eq (mockNext.args, [[]]);
});

test ('Empty middleware', () => {
  const mock = lib.middleware (_ => _ => resolve (lib.Empty));
  const mockRes = {status: methodSpy (), end: methodSpy ()};
  const mockNext = sinon.spy ();

  mock ({}, mockRes, mockNext);

  eq (mockRes.status.args, [[204]]);
  eq (mockRes.end.args, [[]]);
  eq (mockNext.args, []);
});

test ('Redirect middleware', () => {
  const mock = lib.middleware (_ => _ => resolve (lib.Redirect ('example.com')));
  const mockRes = {location: methodSpy (), status: methodSpy (), end: methodSpy ()};
  const mockNext = sinon.spy ();

  mock ({}, mockRes, mockNext);

  eq (mockRes.status.args, [[301]]);
  eq (mockRes.location.args, [['example.com']]);
  eq (mockRes.end.args, [[]]);
  eq (mockNext.args, []);
});

test ('Json middleware', () => {
  const mock = lib.middleware (_ => _ => resolve (lib.Json ({foo: 'bar'})));
  const mockRes = {type: methodSpy (), send: methodSpy ()};
  const mockNext = sinon.spy ();

  mock ({}, mockRes, mockNext);

  eq (mockRes.type.args, [['application/json']]);
  eq (mockRes.send.args, [['{"foo":"bar"}']]);
  eq (mockNext.args, []);
});

test ('Render middleware', () => {
  const mock = lib.middleware (_ => _ => resolve (lib.Render ('index') ({user: 'hello'})));
  const mockRes = {render: methodSpy ()};
  const mockNext = sinon.spy ();

  mock ({}, mockRes, mockNext);

  eq (mockRes.render.args, [['index', {user: 'hello'}]]);
});

test ('Stream middleware', () => {
  const mockStream = {pipe: sinon.spy ()};
  const mock = lib.middleware (_ => _ => resolve (lib.Stream (resolve (mockStream))));
  const mockRes = {type: methodSpy ()};
  const mockNext = sinon.spy ();

  mock ({}, mockRes, mockNext);

  eq (mockStream.pipe.args, [[mockRes]]);
  eq (mockNext.args, []);
});

test ('withLinks middleware', () => {
  const mock = lib.middleware (_ => _ => resolve (lib.withLinks ({foo: 'bar'}) (lib.Empty)));
  const mockRes = {status: methodSpy (), links: methodSpy (), end: methodSpy ()};
  const mockNext = sinon.spy ();

  mock ({}, mockRes, mockNext);

  eq (mockRes.status.args, [[204]]);
  eq (mockRes.links.args, [[{foo: 'bar'}]]);
  eq (mockRes.end.args, [[]]);
  eq (mockNext.args, []);
});

test ('withCookie middleware', () => {
  const mock = lib.middleware (_ => _ => resolve (lib.withCookie ({foo: 'bar'}) ('a') ('b') (lib.Empty)));
  const mockRes = {status: methodSpy (), cookie: methodSpy (), end: methodSpy ()};
  const mockNext = sinon.spy ();

  mock ({}, mockRes, mockNext);

  eq (mockRes.status.args, [[204]]);
  eq (mockRes.cookie.args, [['a', 'b', {foo: 'bar'}]]);
  eq (mockRes.end.args, [[]]);
  eq (mockNext.args, []);
});

test ('withClearCookie middleware', () => {
  const mock = lib.middleware (_ => _ => resolve (lib.withClearCookie ({foo: 'bar'}) ('a') (lib.Empty)));
  const mockRes = {status: methodSpy (), clearCookie: methodSpy (), end: methodSpy ()};
  const mockNext = sinon.spy ();

  mock ({}, mockRes, mockNext);

  eq (mockRes.status.args, [[204]]);
  eq (mockRes.clearCookie.args, [['a', {foo: 'bar'}]]);
  eq (mockRes.end.args, [[]]);
  eq (mockNext.args, []);
});

test ('withHeaderPart middleware', () => {
  const mock = lib.middleware (_ => _ => resolve (lib.withHeaderPart ('a') ('b') (lib.Empty)));
  const mockRes = {status: methodSpy (), append: methodSpy (), end: methodSpy ()};
  const mockNext = sinon.spy ();

  mock ({}, mockRes, mockNext);

  eq (mockRes.status.args, [[204]]);
  eq (mockRes.append.args, [['a', 'b']]);
  eq (mockRes.end.args, [[]]);
  eq (mockNext.args, []);
});

test ('withHeader middleware', () => {
  const mock = lib.middleware (_ => _ => resolve (lib.withHeader ('a') ('b') (lib.Empty)));
  const mockRes = {status: methodSpy (), set: methodSpy (), end: methodSpy ()};
  const mockNext = sinon.spy ();

  mock ({}, mockRes, mockNext);

  eq (mockRes.status.args, [[204]]);
  eq (mockRes.set.args, [['a', 'b']]);
  eq (mockRes.end.args, [[]]);
  eq (mockNext.args, []);
});

test ('dispatcher', async () => {
  const mock = lib.dispatcher ('test') ('mock-action.js');
  const mockRes = {type: methodSpy (), send: methodSpy ()};
  const mockNext = sinon.spy ();

  await mock ({}, mockRes, mockNext);

  eq (mockRes.type.args, [['application/json']]);
  eq (mockRes.send.args, [['{"foo":"bar"}']]);
  eq (mockNext.args, []);
});
