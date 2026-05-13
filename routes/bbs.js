var express = require('express');
var router = express.Router();

var oracledb = require('oracledb');
oracledb.autoCommit = true;

var dbconfig = require('../config/dbconfig');

// 글쓰기/수정/삭제처럼 인증이 필요한 요청에서 공통으로 쓰는 간단한 로그인 확인.
function requireLogin(req, res) {
    if (!req.session.user) {
        res.redirect('/bbs/login');
        return false;
    }
    return true;
}

router.get('/', function (req, res, next) {
    res.redirect('/bbs/list');
});

router.get('/login', function (req, res, next) {
    var code = 0;
    if (req.session.user) code = 3;
    res.render('bbs/login', { errcode: code });
});

router.post('/logincheck', function (req, res, next) {
    var id = req.body.id;
    var pw = req.body.password;
    var code = 0;

    oracledb.getConnection(dbconfig, function (err, connection) {
        if (err) {
            console.error("err : " + err);
            return next(err);
        }

        var sql = "SELECT OK, PASSWORD FROM LOGIN WHERE ID = '" + id + "'";

        connection.execute(sql, function (err, result) {
            if (err) {
                connection.release();
                console.error("err : " + err);
                return next(err);
            }

            if (result.rows.length < 1) {
                console.log('login id not found.');
                code = 1;
                connection.release();
                res.render('bbs/login', { errcode: code });
                return;
            }
            else if (result.rows[0][1] == pw) {
                var paramID = req.body.id || req.query.id;

                if (req.session.user) {
                    console.log("already logged in.");
                }
                else {
                    console.log("new session created.");
                    req.session.user = {
                        id: paramID,
                        authorized: true
                    };
                }
            }
            else {
                console.log("password mismatch.");
                code = 2;
                connection.release();
                res.render('bbs/login', { errcode: code });
                return;
            }

            connection.release();
            res.redirect('/bbs/list');
        });
    });
});

router.get('/logout', function (req, res, next) {
    if (req.session.user) req.session.destroy();
    res.redirect('/bbs/list');
});

router.get('/signup', function (req, res, next) {
    var code = 0;
    if (req.session.user) code = 1;
    res.render('bbs/signup', { code: code });
});

router.post('/signupsave', function (req, res, next) {
    var id = req.body.id,
        pw1 = req.body.pw1,
        pw2 = req.body.pw2;
    var name = req.body.name;
    var email = req.body.email;

    var code = 0;

    if (pw1 != pw2) {
        code = 1;
        res.render('error', { errcode: code });
        return;
    }

    if (id == "" || pw1 == "" || name == "") {
        code = 2;
        res.render('error', { errcode: code });
        return;
    }

    var sql = "INSERT INTO LOGIN VALUES('" +
        id + "','" +
        pw1 + "','" +
        name + "','" +
        email + "', 1)";

    console.log("sql : " + sql);
    oracledb.getConnection(dbconfig, function (err, connection) {
        if (err) {
            console.error("err : " + err);
            return next(err);
        }

        connection.execute(sql, function (err, result) {
            if (err) {
                connection.release();
                code = 3;
                res.render('error', { errcode: code });
                return;
            }
            connection.release();
            res.redirect('/bbs/login');
        });
    });
});

router.get('/updatesignup', function (req, res, next) {
    if (req.session.user) {
        oracledb.getConnection(dbconfig, function (err, connection) {
            if (err) {
                console.error("err : " + err);
                return next(err);
            }
            var sql = "SELECT ID, PASSWORD, NAME, EMAIL FROM LOGIN WHERE ID = '" + req.session.user.id + "'";
            console.log("sql : " + sql);
            connection.execute(sql, function (err, rows) {
                if (err) {
                    connection.release();
                    console.error("err : " + err);
                    return next(err);
                }
                res.render('bbs/updatesignform', rows);
                connection.release();
            });
        });
    }
    else {
        res.redirect('/bbs/login');
    }
});

router.post('/updatesignsave', function (req, res, next) {
    var id = req.body.id, pw = req.body.pw1, name = req.body.name, email = req.body.email;
    var pw2 = req.body.pw2;

    if (!requireLogin(req, res)) return;

    if (pw != pw2) {
        res.render('bbs/updatesignform', { rows: [[id, pw, name, email]] });
        return;
    }

    var oldId = req.session.user.id;
    oracledb.getConnection(dbconfig, function (err, connection) {
        if (err) {
            console.error("err : " + err);
            return next(err);
        }
        var sql = "UPDATE LOGIN" +
            " SET ID= '" + id + "', PASSWORD='" + pw + "', NAME='" + name + "'" +
            ", EMAIL='" + email + "' " + "WHERE ID='" + oldId + "'";
        console.log("sql : " + sql);
        connection.execute(sql, function (err, rows) {
            if (err) {
                connection.release();
                console.error("err : " + err);
                return next(err);
            }
            req.session.user.id = id;
            connection.release();
            res.redirect('/bbs/list');
        });
    });
});

router.get('/list', function (req, res, next) {
    oracledb.getConnection(dbconfig, function (err, connection) {
        if (err) {
            console.error("err : " + err);
            return next(err);
        }
        // soft delete된 글은 목록에서 제외하고 최신 글부터 보여준다.
        var sql = "SELECT NO, TITLE, WRITER, CONTENT, to_char(REGDATE,'yyyy-mm-dd hh24:mi:ss'), OK FROM BBS WHERE OK=1 ORDER BY NO DESC";

        connection.execute(sql, function (err, rows) {
            if (err) {
                connection.release();
                console.error("err : " + err);
                return next(err);
            }

            res.render('bbs/list', rows);
            connection.release();
        });
    });
});

router.get('/form', function (req, res, next) {
    if (!requireLogin(req, res)) return;
    res.render('bbs/form');
});

router.post('/save', function (req, res, next) {
    if (!requireLogin(req, res)) return;

    oracledb.getConnection(dbconfig, function (err, connection) {
        if (err) {
            console.error("err : " + err);
            return next(err);
        }

        var sql = "INSERT INTO BBS(NO, TITLE, CONTENT, WRITER, REGDATE) VALUES(bbs_seq.nextval, '"
            + req.body.brdtitle + "', '"
            + req.body.brdmemo + "', '"
            + req.body.brdwriter + "', sysdate)";

        console.log("sql : " + sql);

        connection.execute(sql, function (err, rows) {
            if (err) {
                connection.release();
                console.error("err : " + err);
                return next(err);
            }

            connection.release();
            res.redirect('/bbs/list');
        });
    });
});

router.get('/read', function (req, res, next) {
    oracledb.getConnection(dbconfig, function (err, connection) {
        if (err) {
            console.error("err : " + err);
            return next(err);
        }

        // 삭제 처리된 글은 직접 URL로 접근해도 열리지 않게 막는다.
        var sql = "SELECT NO, TITLE, CONTENT, " +
            "WRITER, to_char(REGDATE,'yyyy-mm-dd') " +
            " FROM BBS" +
            " WHERE OK=1 AND NO=" + req.query.brdno;

        console.log("rows : " + sql);

        connection.execute(sql, function (err, rows) {
            if (err) {
                connection.release();
                console.error("err : " + err);
                return next(err);
            }

            if (rows.rows.length < 1) {
                connection.release();
                res.redirect('/bbs/list');
                return;
            }

            console.log("rows : " + JSON.stringify(rows));
            res.render('bbs/read', rows);
            connection.release();
        });
    });
});

router.get('/delete', function (req, res, next) {
    if (!requireLogin(req, res)) return;

    oracledb.getConnection(dbconfig, function (err, connection) {
        if (err) {
            console.error("err : " + err);
            return next(err);
        }

        // 실제 DELETE 대신 상태값만 내려 과제 흐름에 맞는 soft delete를 유지한다.
        var sql = "UPDATE BBS SET OK=0 " +
            "WHERE NO=" + req.query.brdno;

        console.log("row : " + req.query.brdno);

        connection.execute(sql, function (err, rows) {
            if (err) {
                connection.release();
                console.error("err : " + err);
                return next(err);
            }

            connection.release();
            res.redirect('/bbs/list');
        });
    });
});

router.get('/update', function (req, res, next) {
    if (!requireLogin(req, res)) return;

    oracledb.getConnection(dbconfig, function (err, connection) {
        if (err) {
            console.error("err : " + err);
            return next(err);
        }

        // 수정 화면도 활성 글만 대상으로 제한한다.
        var sql = "SELECT NO, TITLE, CONTENT, WRITER, to_char(REGDATE,'yyyy-mm-dd') " +
            "FROM BBS WHERE OK=1 AND NO=" + req.query.brdno;

        connection.execute(sql, function (err, rows) {
            if (err) {
                connection.release();
                console.error("err : " + err);
                return next(err);
            }

            if (rows.rows.length < 1) {
                connection.release();
                res.redirect('/bbs/list');
                return;
            }

            res.render('bbs/updateform', rows);
            connection.release();
        });
    });
});

router.post('/updatesave', function (req, res, next) {
    if (!requireLogin(req, res)) return;

    oracledb.getConnection(dbconfig, function (err, connection) {
        if (err) {
            console.error("err : " + err);
            return next(err);
        }

        var sql = "";

        if (req.body.brdno) {

            sql = "UPDATE BBS " +
                "SET TITLE='" + req.body.brdtitle +
                "', CONTENT='" + req.body.brdmemo +
                "', WRITER='" + req.body.brdwriter +
                "' WHERE NO=" + req.body.brdno;
        }

        console.log("sql : " + sql);

        connection.execute(sql, function (err, rows) {
            if (err) {
                connection.release();
                console.error("err : " + err);
                return next(err);
            }

            connection.release();
            res.redirect('/bbs/list');
        });
    });
});

router.get('/search', function (req, res, next) {

    oracledb.getConnection(dbconfig, function (err, connection) {
        if (err) {
            console.error("err : " + err);
            return next(err);
        }

        var sql;

        if (req.query.choice == 'TITLE_CONTENT') {
            // 제목+내용 검색은 OR 조건을 괄호로 묶어 OK=1 조건과 함께 적용한다.

            sql = "SELECT NO, TITLE, WRITER, CONTENT, to_char(REGDATE,'yyyy-mm-dd hh24:mi:ss'), OK " +
                "FROM BBS WHERE OK=1 AND (TITLE LIKE '%" + req.query.search + "%' " +
                "OR CONTENT LIKE '%" + req.query.search + "%') " +
                "ORDER BY NO DESC";
        }
        else {
            sql = "SELECT NO, TITLE, WRITER, CONTENT, to_char(REGDATE,'yyyy-mm-dd hh24:mi:ss'), OK " +
                "FROM BBS WHERE OK=1 AND " + req.query.choice + " LIKE '%" + req.query.search + "%' " +
                "ORDER BY NO DESC";
        }
        connection.execute(sql, function (err, rows) {
            if (err) {
                connection.release();
                console.error("err : " + err);
                return next(err);
            }

            res.render('bbs/list', rows);
            connection.release();
        });
    });
});

module.exports = router;
