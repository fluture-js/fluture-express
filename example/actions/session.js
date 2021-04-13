'use strict';

const {Next} = require ('../..');
const Future = require ('fluture');

module.exports = locals => req => {
  const session = {id: req.headers['x-authenticated-user']};
  const newLocals = Object.assign ({session}, locals);
  return Future.resolve (Next (newLocals));
};
