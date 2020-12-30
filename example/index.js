'use strict';

const app = require ('express') ();
const {dispatcher} = require ('..');
const path = require ('path');
const dispatch = dispatcher (path.resolve (__dirname, 'actions'));

app.set ('view engine', 'hbs');
app.set ('views', path.join (__dirname, 'views'));

app.use (dispatch ('session'));
app.get ('/', dispatch ('welcome'));
app.get ('/json', dispatch ('welcomeJson'));
app.get ('/image', dispatch ('image'));

app.listen (3000);
