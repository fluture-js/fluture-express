const {Render} = require ('../..');
const Future = require ('fluture');

module.exports = (req, locals) => {
  const user = locals.session.id ? `user ${locals.session.id}` : 'stranger';
  return Future.resolve (Render (200) ('index') ({user}));
};
