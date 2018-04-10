'use strict';

const assert = require('assert');
const Future = require('fluture');
const Z = require('sanctuary-type-classes');
const sinon = require('sinon');

const {Stream, Json, Redirect, Empty, Next, middleware, dispatcher} = require('..');


function eq(actual, expected) {
  assert.strictEqual(arguments.length, eq.length);
  assert.strictEqual(Z.toString(actual), Z.toString(expected));
  assert.strictEqual(Z.equals(actual, expected), true);
}

function methodSpy() {
  return sinon.stub().returnsThis();
}

function noop() {}

function throws(fn, expected) {
  try { fn(); } catch (e) { eq(e, expected); }
}

test('Stream', () => {
  eq(typeof Stream, 'function');
  eq(Stream.length, 3);
  eq(Stream.is(Stream(200, 'jpeg', {})), true);
});

test('Json', () => {
  eq(typeof Json, 'function');
  eq(Json.length, 2);
  eq(Json.is(Json(200, {})), true);
});

test('Redirect', () => {
  eq(typeof Redirect, 'function');
  eq(Redirect.length, 2);
  eq(Redirect.is(Redirect(200, 'example.com')), true);
});

test('Empty', () => {
  eq(typeof Empty, 'object');
  eq(Empty.is(Empty), true);
});

test('Next', () => {
  eq(typeof Next, 'function');
  eq(Next.length, 1);
  eq(Next.is(Next({})), true);
});

test('middleware', () => {
  eq(typeof middleware, 'function');
  eq(middleware.length, 1);

  /* eslint-disable prefer-arrow-callback */
  const mock = middleware(function mock() { return Future.of(Json(200, {})); });
  const mockNoFuture = middleware(function mock() { return null; });
  const mockNoResponse = middleware(function mock() { return Future.of(null); });
  /* eslint-enable prefer-arrow-callback */

  eq(typeof mock, typeof mockNoFuture);
  eq(mock.length, mockNoFuture.length);
  eq(typeof mock, typeof mockNoResponse);
  eq(mock.length, mockNoResponse.length);

  eq(typeof mock, 'function');
  eq(mock.length, 3);

  throws(_ => mockNoFuture({}, {}, noop), new TypeError(
    'The "mock" action did not return a Future, instead saw:\n\n  null'
  ));

  throws(_ => mockNoResponse({}, {}, noop), new TypeError(
    'The Future returned by the "mock" action did not resolve to a '
    + 'Response, instead saw:\n\n  null'
  ));
});

test('Next middleware', () => {
  const mock = middleware(_ => Future.of(Next({foo: 'bar'})));
  const mockRes = {status: sinon.spy(), json: sinon.spy()};
  const mockNext = sinon.spy();

  mock({}, mockRes, mockNext);

  eq(mockRes.status.args, []);
  eq(mockRes.json.args, []);
  eq(mockNext.args, [[]]);
});

test('Empty middleware', () => {
  const mock = middleware(_ => Future.of(Empty));
  const mockRes = {status: methodSpy(), end: methodSpy()};
  const mockNext = sinon.spy();

  mock({}, mockRes, mockNext);

  eq(mockRes.status.args, [[204]]);
  eq(mockRes.end.args, [[]]);
  eq(mockNext.args, []);
});

test('Redirect middleware', () => {
  const mock = middleware(_ => Future.of(Redirect(200, 'example.com')));
  const mockRes = {redirect: sinon.spy()};
  const mockNext = sinon.spy();

  mock({}, mockRes, mockNext);

  eq(mockRes.redirect.args, [[200, 'example.com']]);
  eq(mockNext.args, []);
});

test('Json middleware', () => {
  const mock = middleware(_ => Future.of(Json(200, {foo: 'bar'})));
  const mockRes = {status: methodSpy(), json: methodSpy()};
  const mockNext = sinon.spy();

  mock({}, mockRes, mockNext);

  eq(mockRes.status.args, [[200]]);
  eq(mockRes.json.args, [[{foo: 'bar'}]]);
  eq(mockNext.args, []);
});

test('Stream middleware', () => {
  const mockStream = {pipe: sinon.spy()};
  const mock = middleware(_ => Future.of(Stream(201, 'jpeg', mockStream)));
  const mockRes = {status: methodSpy(), type: methodSpy()};
  const mockNext = sinon.spy();

  mock({}, mockRes, mockNext);

  eq(mockStream.pipe.args, [[mockRes]]);
  eq(mockRes.status.args, [[201]]);
  eq(mockRes.type.args, [['jpeg']]);
  eq(mockNext.args, []);
});

test('dispatcher', () => {
  eq(typeof dispatcher, 'function');
  eq(dispatcher.length, 1);
  eq(typeof dispatcher(''), 'function');
  eq(dispatcher('').length, 1);

  const mock = dispatcher(__dirname)('mock-action');
  const mockRes = {status: methodSpy(), json: methodSpy()};
  const mockNext = sinon.spy();

  mock({}, mockRes, mockNext);

  eq(mockRes.status.args, [[200]]);
  eq(mockRes.json.args, [[{foo: 'bar'}]]);
  eq(mockNext.args, []);
});
