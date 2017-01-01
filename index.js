var express = require('express');
var app = express();
var cors = require('cors');
var escape = require('escape-html')
var bodyParser = require('body-parser');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('db.sqlite', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, function (err) {
  if(err) {
    console.log('error opening db:', err);
  } else {
    db.run("CREATE TABLE IF NOT EXISTS images (id INTEGER PRIMARY KEY, src TEXT, dataUri TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS questions (id INTEGER PRIMARY KEY, updated DATETIME DEFAULT CURRENT_TIMESTAMP, text TEXT, explanation TEXT)");
    db.run("ALTER TABLE questions ADD COLUMN explanation TEXT", function (err) {});
    db.run("CREATE TABLE IF NOT EXISTS answers (id INTEGER PRIMARY KEY, aid INTEGER, qid INTEGER, text TEXT, correct INTEGER, checked INTEGER)");
    db.run("CREATE TABLE IF NOT EXISTS answering (id INTEGER PRIMARY KEY, created DATETIME DEFAULT CURRENT_TIMESTAMP, version TEXT, href TEXT)");
  }
});


app.use( bodyParser.json() );
app.use(cors());
app.set('view engine', 'pug');




var corsOptions = {
  origin: "*",
  methods: "POST"
};

app.get('/', function (req, res) {
    db.all("SELECT q.id AS qid, q.text AS question, q.explanation AS explanation, i.dataUri AS image, T2.id AS aid, T2.text AS answer, T2.correct FROM questions q " +
           "LEFT JOIN (SELECT qid, MAX(aid) AS maxid FROM answers GROUP BY qid) AS T1 ON q.id = T1.qid " +
           "LEFT JOIN answers AS T2 ON T2.aid = T1.maxid AND T2.qid = q.id " +
           "LEFT JOIN images AS i ON i.id = q.id " +
           "ORDER BY T2.id DESC",
           function (err, rows) {
      if (err) {
        console.log('error:', err);
        res.sendStatus(500);
      }
      var prevQid, index = -1;
      var questions = rows.reduce(function(questions, row) {
        var a = { answer: row.answer, correct: row.correct };
        if (prevQid != row.qid) {
          questions[++index] = { id: row.qid, question: row.question, explanation: row.explanation, image: row.image, answers: [a] };
        } else {
          questions[index].answers.push(a);
        }
        prevQid = row.qid;
        return questions;
      }, []);
      console.log('total questions:', questions.length);
      res.render('index', { questions: questions });
    });
});

app.post('/explanation/:id', function (req, res) {
  var id = req.params.id;
  var data = req.body;
  if (id && data.explanation) {
    console.log('updating', id, 'with', data);
    db.run('UPDATE questions SET explanation = $explanation WHERE id = $id', {
      $id: id,
      $explanation: escape(data.explanation)
    }, function (err) {
      if (err) {
        console.log('error updating explanation for', id, ':', err);
        res.sendStatus(500);
      } else {
        res.sendStatus(200);
      }
    });
  } else {
    console.log('invalid explanation for', id, ':', data);
    res.sendStatus(400);
  }
});

app.post('/qa', cors(corsOptions), function (req, res) {
  var data = req.body;
  console.log('NEW QA DATA:', JSON.stringify(data));
  if (!data.version || !data.data || data.data.length < 15) {
    console.log('invalid qa data', !data.version, !data.data, data.data.length < 15);
    return res.sendStatus(400);
  }
  db.serialize(function() {
    var aid = null;
    db.run("INSERT INTO answering (version, href) VALUES ($version,$href)", {
      $version: data.version,
      $href: data.href
    }, function(err) {
      if (err) {
        console.log('inserting answering failed:', err);
        return;
      }
      console.log('inserted:', this.changes, 'lastID:', this.lastID);
      aid = this.lastID;
      if (aid) {
        var qstmt = db.prepare("REPLACE INTO questions (id, text) VALUES (?,?)");
        var astmt = db.prepare("INSERT INTO answers (aid, qid, text, correct, checked) VALUES (?,?,?,?,?)");
        for (var i = 0; i < data.data.length; i++) {
          var q = data.data[i];
          qstmt.run(q.id, q.question);
          for (var j = 0; j < q.answers.length; j++) {
            var a = q.answers[j];
            astmt.run(aid, q.id, a.text, a.correct, a.checked);
          }
        }
        qstmt.finalize();
        astmt.finalize();

        res.sendStatus(200);
      } else {
        console.log('no answering id');
        res.sendStatus(400);
      }
    });
  });
});

app.post('/img', cors(corsOptions), function (req, res) {
  var data = req.body;
  if (!data.version || !data.data.id || !data.data.src || !data.data.dataUri) {
    console.log('invalid img data', !data.version, !data.data.id, !data.data.src, !data.data.dataUri);
    return res.sendStatus(400);
  }
  var img = data.data;
  console.log('NEW IMG DATA:', JSON.stringify(data).substring(0,200));

  var istmt = db.run("REPLACE INTO images (id, src, dataUri) VALUES (?,?,?)", img.id, img.src, img.dataUri, function (err) {
    if (err) {
      console.log('saving image ' + img.id + 'failed:', err);
      res.sendStatus(400);
    } else {
      res.sendStatus(200);
    }
  });

});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
});
