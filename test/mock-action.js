'use strict';

const Future = require('fluture');
const {Json} = require('..');

module.exports = _ => Future.of(Json(200, {foo: 'bar'}));
