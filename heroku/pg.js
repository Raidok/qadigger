var pg = require("pg");
var conString = process.env.DATABASE_URL;
var client = new pg.Client(conString);
client.connect();

function getRandomQuestion(cb) {
  var query = client.query("SELECT q.id AS qid, q.text AS question, q.explanation AS explanation, i.dataUri AS image FROM questions q " +
           "LEFT JOIN (SELECT qid, MAX(aid) AS maxid FROM answers GROUP BY qid) AS T1 ON q.id = T1.qid " +
           "LEFT JOIN images AS i ON i.id = q.id " +
           "ORDER BY random() LIMIT 1");
  query.on("row", function (row, result) {
    result.addRow(row);
  });
  query.on("end", function (result) {
    getAnswers(result.rows.map(row => row.qid), (answers) => {
      mapAnswers(result.rows, answers);
      cb(result.rows);
    });
  });
}

function mapAnswers(questions, answers) {
  var map = questions.reduce((map, q) => (map[q.qid] = q) && map, {});
  answers.forEach(a => (map[a.qid].answers || (map[a.qid].answers = [])).push(a));
}


function getAnswers(questionIds, cb) {
  var inSql = questionIds.map(function(item, idx) {return '$' + (idx+1);});
  var query = client.query("SELECT a.qid AS qid, a.id AS aid, a.text AS answer, a.correct FROM answers a " +
           "JOIN (SELECT qid, MAX(aid) AS maxid FROM answers GROUP BY qid) AS a2 ON a2.qid = a.qid AND a2.maxid = a.aid WHERE a.qid IN (" + inSql + ")", questionIds);
  query.on("row", function (row, result) {
    result.addRow(row);
  });
  query.on("end", function (result) {
    cb(result.rows);
  });
}

exports.getOne = cb => {
  getRandomQuestion(cb);
};

