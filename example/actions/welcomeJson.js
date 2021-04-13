'use strict';

const {Json} = require ('../..');
const Future = require ('fluture');

module.exports = locals => _ => {
  const welcome = locals.session.id ? `user ${locals.session.id}` : 'stranger';
  return Future.resolve (Json ({welcome}));
};
