const {Json} = require ('../..');
const Future = require ('fluture');

module.exports = (req, locals) =>
  Future.resolve (
    Json (200)
         ({welcome: locals.session.id
                      ? `user ${locals.session.id}`
                      : 'stranger'}));
