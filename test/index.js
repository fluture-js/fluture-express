import assert from 'assert';
import {resolve} from 'fluture/index.js';
import Z from 'sanctuary-type-classes';
import sinon from 'sinon';
import test from 'oletus';

import {Response, Stream, Json, Render, Redirect, Empty, Next, middleware, dispatcher} from '../index.js';


function eq(actual, expected) {
  assert.strictEqual (arguments.length, eq.length);
  assert.strictEqual (Z.toString (actual), Z.toString (expected));
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
  eq (Response.Stream.is (Stream (200) ('jpeg') ({})), true);
});

test ('Json', () => {
  eq (Response.Json.is (Json (200) ({})), true);
});

test ('Render', () => {
  eq (Response.Render.is (Render (200) ('index') ({})), true);
});

test ('Redirect', () => {
  eq (Response.Redirect.is (Redirect (200) ('example.com')), true);
});

test ('Empty', () => {
  eq (Response.Empty.is (Empty), true);
});

test ('Next', () => {
  eq (Response.Next.is (Next ({})), true);
});

test ('middleware', () => {
  /* eslint-disable prefer-arrow-callback */
  const mock = middleware (function mock() { return resolve (Json (200) ({})); });
  const mockNoFuture = middleware (function mock() { return null; });
  const mockNoResponse = middleware (function mock() { return resolve (null); });
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
  const mock = middleware (_ => resolve (Next ({foo: 'bar'})));
  const mockRes = {status: sinon.spy (), json: sinon.spy ()};
  const mockNext = sinon.spy ();

  mock ({}, mockRes, mockNext);

  eq (mockRes.status.args, []);
  eq (mockRes.json.args, []);
  eq (mockNext.args, [[]]);
});

test ('Empty middleware', () => {
  const mock = middleware (_ => resolve (Empty));
  const mockRes = {status: methodSpy (), end: methodSpy ()};
  const mockNext = sinon.spy ();

  mock ({}, mockRes, mockNext);

  eq (mockRes.status.args, [[204]]);
  eq (mockRes.end.args, [[]]);
  eq (mockNext.args, []);
});

test ('Redirect middleware', () => {
  const mock = middleware (_ => resolve (Redirect (200) ('example.com')));
  const mockRes = {redirect: sinon.spy ()};
  const mockNext = sinon.spy ();

  mock ({}, mockRes, mockNext);

  eq (mockRes.redirect.args, [[200, 'example.com']]);
  eq (mockNext.args, []);
});

test ('Json middleware', () => {
  const mock = middleware (_ => resolve (Json (200) ({foo: 'bar'})));
  const mockRes = {status: methodSpy (), json: methodSpy ()};
  const mockNext = sinon.spy ();

  mock ({}, mockRes, mockNext);

  eq (mockRes.status.args, [[200]]);
  eq (mockRes.json.args, [[{foo: 'bar'}]]);
  eq (mockNext.args, []);
});

test ('Render middleware', () => {
  const mock = middleware (_ => resolve (Render (200) ('index') ({user: 'hello'})));
  const mockRes = {status: methodSpy (), render: methodSpy ()};
  const mockNext = sinon.spy ();

  mock ({}, mockRes, mockNext);

  eq (mockRes.status.args, [[200]]);
  eq (mockRes.render.args, [['index', {user: 'hello'}]]);
});

test ('Stream middleware', () => {
  const mockStream = {pipe: sinon.spy ()};
  const mock = middleware (_ => resolve (Stream (201) ('jpeg') (mockStream)));
  const mockRes = {status: methodSpy (), type: methodSpy ()};
  const mockNext = sinon.spy ();

  mock ({}, mockRes, mockNext);

  eq (mockStream.pipe.args, [[mockRes]]);
  eq (mockRes.status.args, [[201]]);
  eq (mockRes.type.args, [['jpeg']]);
  eq (mockNext.args, []);
});

test ('dispatcher', async () => {
  const mock = dispatcher ('test') ('mock-action.js');
  const mockRes = {status: methodSpy (), json: methodSpy ()};
  const mockNext = sinon.spy ();

  await mock ({}, mockRes, mockNext);

  eq (mockRes.status.args, [[200]]);
  eq (mockRes.json.args, [[{foo: 'bar'}]]);
  eq (mockNext.args, []);
});
