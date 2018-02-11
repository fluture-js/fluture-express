'use strict';

const app = require('express')();
const {dispatcher} = require('..');
const path = require('path');
const dispatch = dispatcher(path.resolve(__dirname, 'actions'));

app.use(dispatch('session'));
app.get('/', dispatch('welcome'));
app.get('/image', dispatch('image'));

app.listen(3000);
