'use strict';

const {Render} = require ('../..');
const Future = require ('fluture');

module.exports = locals => _ => {
  const user = locals.session.id ? `user ${locals.session.id}` : 'stranger';
  return Future.resolve (Render ('index') ({user}));
};
