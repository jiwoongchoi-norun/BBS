var express = require('express'); //express로 만든 
var router = express.Router(); //파일 간 이동하게하는 중요 변수 

var oracledb = require('oracledb'); //오라클 디비 접근 가능하게하는 변수
oracledb.autoCommit = true; //게시판 글을 쓰면 자동 커밋 
//일반적으로 웹서버 디비 서버 분리 됨 ,, 웹서버에서 오라클 디비 그리고 리턴 
 
var dbconfig = require('../config/dbconfig');

router.get('/', function(req, res, next) { //파일 이동 이벤트 기본 도메인 입력시 이벤트,,요청 응답 다음
    res.redirect('/bbs/list'); //시작 페이지
});

router.get('/login', function(req, res, next) {
    var code = 0; //세션이 없으면 0
    if(req.session.user) code = 3; //세션이 살아있으면 한번 더 로그인 방지
    res.render('bbs/login', {errcode : code}); //errcode넣어 가져가라
});

router.post('/logincheck', function(req, res, next) {
    var id = req.body.id;
    var pw = req.body.password;
    var code = 0;

    oracledb.getConnection(dbconfig, function(err, connection) {
        var sql = "SELECT OK, PASSWORD FROM LOGIN WHERE ID = '" + id + "'";

        connection.execute(sql, function(err, result) {
            if(err) console.error("err : " + err);

            if(result.rows.length < 1) {//resurt의 행의 길이 1보다 작다
                console.log('로그인 아이디가 없습니다.');
                code = 1;
                res.render('bbs/login', {errcode: code});
                return; 
            }
            else if(result.rows[0][1] == pw) { //pw확인
                const paramID = req.body.id || req.query.id;
                const pwd = req.body.password || req.query.password;

                if(req.session.user) {//세션이 살아있니
                    console.log("이미 로그인 되어 있습니다.");
                }
                else {
                    console.log("새로운 세션을 만듭니다.");
                    req.session.user = {
                        id: paramID,
                        pw: pwd,
                        authorized: true
                    };
                }
            }
            else {
                    console.log("패스워드가 틀렸습니다.");
                    code = 2;
                    res.render('bbs/login', {errcode: code});
                    return;
                }
                //탈퇴회원 재가입 조건 있어야함 ok=0
                res.redirect('/bbs/list');
                connection.release();
            });
        });
    });

router.get('/logout', function(req, res, next) {
    if(req.session.user) req.session.destroy();
    res.redirect('/bbs/list');
});

router.get('/signup', function(req, res, next) {
    var code = 0;
    if(req.session.user) code = 1;
    res.render('bbs/signup', {code : code});
});

router.post('/signupsave', function(req, res, next) {
    var id = req.body.id,
        pw1 = req.body.pw1,
        pw2 = req.body.pw2;
    var name = req.body.name;
    var email = req.body.email;

    var code = 0; // 1-두개의 패스워드 틀린경우

    if(pw1 != pw2) {
        code = 1;
        res.render('bbs/error', {errcode : code});
        return;
    }

    if(id == "" || pw1 == "" || name == "") {//회원가입중 공백
        code = 2;
        res.render('bbs/error', {errcode : code});
        return;
    }

    var sql = "INSERT INTO LOGIN VALUES('" +
              id + "','" +
              pw1 + "','" +
              name + "','" +
              email + "', 1)"; //디비 추가

    console.log("sql : " + sql);
    oracledb.getConnection(dbconfig, function(err, connection) {

    connection.execute(sql, function(err, result) {
        if(err) {
            code = 3; //이미 있으면
            res.render('bbs/error', {errcode : code});
            return;
        }
        res.redirect('/bbs/login'); //로그인창으로
    });
});
});

router.get('/list', function(req, res, next) { // /list로 이동시 이벤트 호출 되면
    oracledb.getConnection(dbconfig, function(err, connection){ //연결 되면
        var sql = "SELECT NO, TITLE, WRITER, CONTENT, to_char(REGDATE,'yyyy-mm-dd hh24:mi:ss'), OK FROM BBS"; //이거 리턴 ,,오라클과 정상 연결되면

        connection.execute(sql, function(err, rows){  //에러나면 이거 리턴
            if(err) console.error("err : " + err); //콘솔에 표시
            
            if(rows) {
                //console.log("rows : " + JSON.stringify(rows));
                //console.log("===== render 직전 =====");
                res.render('bbs/list', rows); // views폴더로 움직이고 bbs파일안에 list.ejs, rows데이터 가지고
            }
        });
        connection.release(); //디비 연결 클로즈
    });
});

router.get('/form', function(req, res, next){
    res.render('bbs/form');
});

router.post('/save', function(req, res, next){ //post로 던지고 post로 받기
    oracledb.getConnection(dbconfig, function(err, connection){
        var sql = "";

        sql = "INSERT INTO BBS(NO, TITLE, CONTENT, WRITER, REGDATE) VALUES(bbs_seq.nextval, '"
            + req.body.brdtitle + "', '"
            + req.body.brdmemo + "', '"
            + req.body.brdwriter + "', sysdate)";

        console.log("sql : " + sql); //콘솔 확인용

        connection.execute(sql, function(err, rows){
            if(err) console.error("err : " + err);

            if(rows) res.redirect('/bbs/list');

        });
        connection.release();
    });
});

router.get('/read', function(req, res, next){
    oracledb.getConnection(dbconfig, function(err, connection){
        var sql = "SELECT NO, TITLE, CONTENT, " +
                  "WRITER, to_char(REGDATE,'yyyy-mm-dd') " +
                  " FROM BBS" + //공백 필요 글자 합
                  " WHERE NO=" + req.query.brdno;

        console.log("rows : " + sql);

        connection.execute(sql, function(err, rows){
            if(err) console.error("err : " + err);

            if(rows){
                console.log("rows : " + JSON.stringify(rows));
                res.render('bbs/read', rows);
            }
        });
        connection.release();
    });
});

router.get('/delete', function(req, res, next) {
    oracledb.getConnection(dbconfig, function(err, connection) {

        var sql = "UPDATE BBS SET OK=0 " +
                  "WHERE NO=" + req.query.brdno;

        console.log("row : " + req.query.brdno);

        connection.execute(sql, function(err, rows) {
            if(err) console.error("err : " + err);
            if(rows) res.redirect('/bbs/list');

            connection.release();
        });
    });
});
//DELETE FROM BBS WHERE NO=req.query.brdno 왜 이 sql을 사용하지 않을까요?

router.get('/update', function(req, res, next) {
    oracledb.getConnection(dbconfig, function(err, connection) {

        var sql = "SELECT NO, TITLE, CONTENT, WRITER, to_char(REGDATE,'yyyy-mm-dd') " +
                  "FROM BBS WHERE NO=" + req.query.brdno;

        connection.execute(sql, function(err, rows) {
            if(err) console.error("err : " + err);
            if(rows) res.render('bbs/updateform', rows);
        });
        connection.release();
    });
});

router.post('/updatesave', function(req, res, next) {

    oracledb.getConnection(dbconfig, function(err, connection) {

        var sql = "";

        if(req.body.brdno) {

            sql = "UPDATE BBS " +
                  "SET TITLE='" + req.body.brdtitle +
                  "', CONTENT='" + req.body.brdmemo +
                  "', WRITER='" + req.body.brdwriter +
                  "' WHERE NO=" + req.body.brdno;
        }

        console.log("sql : " + sql);

        connection.execute(sql, function(err, rows) {
            if(err) console.error("err : " + err);
            if(rows) res.redirect('/bbs/list');
        });
        connection.release();
    });
});

router.get('/search', function(req, res, next) {

    oracledb.getConnection(dbconfig, function(err, connection) {
        var sql;

        if(req.query.choice == 'TITLE_CONTENT') {//디비에 해당 내용이 없어서 따로 처리

            sql = "SELECT NO, TITLE, WRITER, CONTENT, to_char(REGDATE,'yyyy-mm-dd hh24:mi:ss'), OK " +
                  "FROM BBS WHERE TITLE LIKE '%" + req.query.search + "%' " +
                  "OR CONTENT LIKE '%" + req.query.search + "%' " +
                  "ORDER BY NO DESC";
        } 
        else {
            sql = "SELECT NO, TITLE, WRITER, CONTENT, to_char(REGDATE,'yyyy-mm-dd hh24:mi:ss'), OK " +
                  "FROM BBS WHERE " + req.query.choice + " LIKE '%" + req.query.search + "%' " +
                  "ORDER BY NO DESC";
        }
        connection.execute(sql, function(err, rows) {
            if(err) console.error("err : " + err);
            if(rows) res.render('bbs/list', rows);
        });
        connection.release();
    });
});



module.exports = router;
