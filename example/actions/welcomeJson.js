const {Json} = require ('../..');
const Future = require ('fluture');

module.exports = (req, locals) => {
  const welcome = locals.session.id ? `user ${locals.session.id}` : 'stranger';
  Future.resolve (Json (200) ({welcome}));
};
