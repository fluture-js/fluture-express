const {Stream} = require ('../..');
const Future = require ('fluture');
const fs = require ('fs');
const path = require ('path');

const access = x => y => Future.node (c => fs.access (x, y, c));

module.exports = req => Future.go (function* () {
  if (!req.query.file) {
    yield Future.reject (
      new Error ('You need to provide a query named "file"')
    );
  }

  const file = path.resolve (__dirname, '..', path.basename (req.query.file));

  if (path.extname (req.query.file) !== '.jpeg') {
    yield Future.reject (new Error ('You can only load JPEGs'));
  }

  yield Future.mapRej
    (_ => new Error ('No read access to the requested file'))
    (access (file) (fs.constants.R_OK));

  return Stream (200)
                (path.extname (req.query.file))
                (fs.createReadStream (file));
});
