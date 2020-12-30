const {Next} = require ('../..');
const Future = require ('fluture');

module.exports = (req, locals) => {
  const session = {id: req.headers['x-authenticated-user']};
  const newLocals = Object.assign ({session}, locals);
  return Future.resolve (Next (newLocals));
};
