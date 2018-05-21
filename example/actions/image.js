'use strict';

const {Stream} = require ('../..');
const Future = require ('fluture');
const fs = require ('fs');
const path = require ('path');

const access = Future.encaseN2 (fs.access);

module.exports = req => Future.do (function* () {
  const file = path.resolve (__dirname, '..', path.basename (req.query.file));

  if (path.extname (req.query.file) !== '.jpeg') {
    yield Future.reject (new Error ('You can only load JPEGs'));
  }

  yield (access (file, fs.constants.R_OK)).mapRej (
    _ => new Error ('No read access to the requested file')
  );

  return Stream (200,
                 path.extname (req.query.file),
                 fs.createReadStream (file));
});
