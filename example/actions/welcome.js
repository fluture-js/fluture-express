const {Render} = require ('../..');
const Future = require ('fluture');

module.exports = (req, locals) =>
  Future.resolve (
    Render (200)
           ('index')
           ({user: locals.session.id
                        ? `user ${locals.session.id}`
                        : 'stranger'}));
