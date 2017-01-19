var express = require('express');
var app = express();
var cors = require('cors');
var escape = require('escape-html')
var bodyParser = require('body-parser');
var path = require('path');
var port = process.env.PORT || 3000;

var db = require('./pg');

app.use( bodyParser.json() );
app.use(cors());
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, '../views'));

app.get('/random', function (req, res) {
    db.getOne(questions => res.render('view', { questions: questions }));
});


app.listen(port, function () {
  console.log('Example app listening on port ' + port);
});