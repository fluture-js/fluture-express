'use strict';

const {resolve} = require ('fluture');
const {Json} = require ('..');

module.exports = _ => resolve (Json (200, {foo: 'bar'}));
