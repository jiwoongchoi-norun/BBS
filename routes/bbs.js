var express = require('express');
var router = express.Router();
var oracledb = require('oracledb');
var crypto = require('crypto');
var bcrypt = require('bcrypt');
var fs = require('fs');
var path = require('path');
var multer = require('multer');
oracledb.autoCommit = true;

var dbconfig = require('../config/dbconfig');
var bcryptSaltRounds = 12;
var uploadDir = path.join(__dirname, '..', 'uploads', 'bbs');
var skipViewCountTokens = Object.create(null);
var allowedFileExts = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.pdf',
  '.txt',
  '.zip',
  '.hwp',
  '.hwpx',
  '.docx',
  '.pptx',
  '.xlsx'
];
var blockedFileExts = ['.exe', '.js', '.sh', '.bat', '.cmd', '.ps1'];

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

var upload = multer({
  storage: multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, uploadDir);
    },
    filename: function (_req, file, cb) {
      var ext = path.extname(file.originalname || '').toLowerCase();
      var saveName = Date.now() + '-' + crypto.randomBytes(8).toString('hex') + ext;
      cb(null, saveName);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: function (_req, file, cb) {
    var ext = path.extname(file.originalname || '').toLowerCase();

    if (blockedFileExts.indexOf(ext) >= 0 || allowedFileExts.indexOf(ext) < 0) {
      cb(new Error('허용되지 않는 파일 형식입니다.'));
      return;
    }

    cb(null, true);
  }
});

// 글쓰기, 수정, 삭제처럼 로그인이 필요한 요청에서 공통으로 사용하는 인증 가드.
function requireLogin(req, res) {
  if (!req.session.user) {
    res.redirect('/bbs/login');
    return false;
  }
  return true;
}

// 추천 처리 후 read 화면으로 돌아갈 때 조회수가 증가하지 않도록 1회용 토큰을 만든다.
function createSkipViewCountToken(bbsno) {
  var token = crypto.randomBytes(16).toString('hex');
  skipViewCountTokens[token] = bbsno;
  return token;
}

// 일반 글 읽기는 조회수를 올리고, 좋아요/싫어요 후 내부 이동은 조회수를 올리지 않는다.
function shouldSkipViewCount(req, brdno) {
  var token = cleanText(req.query.skip_view_token, 64);

  if (token && skipViewCountTokens[token] === brdno) {
    delete skipViewCountTokens[token];
    return true;
  }

  if (req.session && toValidNumber(req.session.skipViewCountBbsno) === brdno) {
    delete req.session.skipViewCountBbsno;
    return true;
  }

  return false;
}

// express-session 저장 타이밍 때문에 리다이렉트 전에 session.save를 명시적으로 호출한다.
function redirectReadWithoutViewCount(req, res, next, bbsno) {
  var token = createSkipViewCountToken(bbsno);
  req.session.skipViewCountBbsno = bbsno;
  req.session.save(function (err) {
    if (err) {
      return next(err);
    }

    res.redirect(
      '/bbs/read?brdno=' +
        encodeURIComponent(bbsno) +
        '&skip_view_token=' +
        encodeURIComponent(token)
    );
  });
}

// 기존 SHA-512 + salt 계정 검증용 해시 함수. 로그인 성공 시 bcrypt로 자동 전환한다.
function createPasswordHash(password, salt) {
  return crypto
    .createHash('sha512')
    .update(password + salt)
    .digest('base64');
}

function isBcryptPassword(algo, storedPassword) {
  return algo === 'bcrypt' || /^\$2[aby]\$/.test(storedPassword || '');
}

// 신규 가입과 회원정보 수정은 bcrypt만 저장한다.
function createBcryptPassword(password, callback) {
  bcrypt.hash(password, bcryptSaltRounds, callback);
}

function getPaging(req) {
  var pageSize = 10;
  var currentPage = parseInt(req.query.page, 10);

  if (isNaN(currentPage) || currentPage < 1) {
    currentPage = 1;
  }

  return {
    currentPage: currentPage,
    pageSize: pageSize
  };
}

function getPagingViewData(currentPage, pageSize, totalCount) {
  var totalPage = Math.ceil(totalCount / pageSize);
  var startPage = Math.max(1, currentPage - 5);
  var endPage = Math.min(totalPage, currentPage + 5);

  return {
    currentPage: currentPage,
    pageSize: pageSize,
    totalCount: totalCount,
    totalPage: totalPage,
    startPage: startPage,
    endPage: endPage
  };
}

function getUploadOriginalName(file) {
  if (!file || !file.originalname) {
    return '';
  }

  return Buffer.from(file.originalname, 'latin1').toString('utf8');
}

// 蹂댁븞 媛뺥솕 異붽?
function cleanText(value, maxLength) {
  var text = (value || '').trim();

  if (maxLength && text.length > maxLength) {
    return '';
  }

  return text;
}

// 蹂댁븞 媛뺥솕 異붽?
function isValidNumber(value) {
  var numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0;
}

// 蹂댁븞 媛뺥솕 異붽?
function toValidNumber(value) {
  return isValidNumber(value) ? Number(value) : null;
}

// 蹂댁븞 媛뺥솕 異붽?
function isValidEmail(value) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// 蹂댁븞 媛뺥솕 異붽?
function renderForbidden(res) {
  res.status(403);
  res.send('권한이 없습니다.');
}

// 蹂댁븞 媛뺥솕 異붽?
function renderBadRequest(res, message) {
  res.status(400);
  res.send(message || '잘못된 요청입니다.');
}

function isValidReactionType(value) {
  return value === 'LIKE' || value === 'DISLIKE';
}

router.get('/', function (req, res) {
  res.redirect('/bbs/list');
});

router.get('/login', function (req, res) {
  var code = 0;
  if (req.session.user) code = 3;
  res.render('bbs/login', { errcode: code });
});

router.post('/logincheck', function (req, res, next) {
  var id = cleanText(req.body.id, 50); // 蹂댁븞 媛뺥솕 異붽?
  var pw = cleanText(req.body.password, 100); // 蹂댁븞 媛뺥솕 異붽?
  var code = 0;

  if (!id || !pw) {
    res.render('bbs/login', { errcode: 1 });
    return;
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    var sql = 'SELECT OK, PASSWORD, SALT, PASSWORD_ALGO FROM LOGIN WHERE ID = :id';

    connection.execute(sql, { id: id }, function (err, result) {
      if (err) {
        connection.release();
        console.error('err : ' + err);
        return next(err);
      }

      if (result.rows.length < 1) {
        console.log('login id not found.');
        code = 1;
        connection.release();
        res.render('bbs/login', { errcode: code });
        return;
      }

      var storedPassword = result.rows[0][1];
      var storedSalt = result.rows[0][2];
      var storedAlgo = result.rows[0][3] || 'sha512';

      function finishLogin() {
        var paramID = id;

        if (req.session.user) {
          console.log('already logged in.');
        } else {
          console.log('new session created.');
          req.session.user = {
            id: paramID,
            authorized: true
          };
        }

        connection.release();
        res.redirect('/bbs/list');
      }

      if (isBcryptPassword(storedAlgo, storedPassword)) {
        bcrypt.compare(pw, storedPassword, function (err, isMatch) {
          if (err) {
            connection.release();
            console.error('err : ' + err);
            return next(err);
          }

          if (!isMatch) {
            console.log('password mismatch.');
            code = 2;
            connection.release();
            res.render('bbs/login', { errcode: code });
            return;
          }

          finishLogin();
        });
        return;
      }

      if (!storedSalt) {
        console.log('password salt missing.');
        code = 2;
        connection.release();
        res.render('bbs/login', { errcode: code });
        return;
      }

      var inputHashPassword = createPasswordHash(pw, storedSalt);

      if (storedPassword != inputHashPassword) {
        console.log('password mismatch.');
        code = 2;
        connection.release();
        res.render('bbs/login', { errcode: code });
        return;
      }

      createBcryptPassword(pw, function (err, bcryptPassword) {
        if (err) {
          connection.release();
          console.error('err : ' + err);
          return next(err);
        }

        var migrateSql =
          "UPDATE LOGIN SET PASSWORD = :password, SALT = NULL, PASSWORD_ALGO = 'bcrypt', PASSWORD_UPDATED_AT = SYSDATE " +
          'WHERE ID = :id';

        connection.execute(migrateSql, { password: bcryptPassword, id: id }, function (err) {
          if (err) {
            connection.release();
            console.error('err : ' + err);
            return next(err);
          }

          finishLogin();
        });
      });
    });
  });
});

router.get('/logout', function (req, res) {
  if (req.session.user) req.session.destroy();
  res.redirect('/bbs/list');
});

router.get('/signup', function (req, res) {
  var code = 0;
  if (req.session.user) code = 1;
  res.render('bbs/signup', { code: code });
});

router.post('/signupsave', function (req, res, next) {
  var id = cleanText(req.body.id, 50),
    pw1 = cleanText(req.body.pw1, 100), // 보안 강화 추가
    pw2 = cleanText(req.body.pw2, 100); // 보안 강화 추가
  var name = cleanText(req.body.name, 100); // 보안 강화 추가
  var email = cleanText(req.body.email, 200); // 보안 강화 추가

  var code = 0;

  if (pw1 != pw2) {
    code = 1;
    res.render('error', { errcode: code });
    return;
  }

  if (id == '' || pw1 == '' || name == '' || pw1.length < 4 || !isValidEmail(email)) {
    code = 2;
    res.render('error', { errcode: code });
    return;
  }

  var sql =
    'INSERT INTO LOGIN(ID,PASSWORD,NAME,EMAIL,SALT,PASSWORD_ALGO,PASSWORD_UPDATED_AT) ' +
    "VALUES(:id,:password,:name,:email,NULL,'bcrypt',SYSDATE)";

  createBcryptPassword(pw1, function (err, hashPassword) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    oracledb.getConnection(dbconfig, function (err, connection) {
      if (err) {
        console.error('err : ' + err);
        return next(err);
      }

      connection.execute(
        sql,
        {
          id: id,
          password: hashPassword,
          name: name,
          email: email
        },
        function (err) {
          if (err) {
            connection.release();
            code = 3;
            res.render('error', { errcode: code });
            return;
          }
          connection.release();
          res.redirect('/bbs/login');
        }
      );
    });
  });
});

router.get('/updatesignup', function (req, res, next) {
  if (req.session.user) {
    oracledb.getConnection(dbconfig, function (err, connection) {
      if (err) {
        console.error('err : ' + err);
        return next(err);
      }
      var sql = 'SELECT ID, NAME, EMAIL FROM LOGIN WHERE ID = :id';
      connection.execute(sql, { id: req.session.user.id }, function (err, result) {
        if (err) {
          connection.release();
          console.error('err : ' + err);
          return next(err);
        }

        if (result.rows.length < 1) {
          connection.release();
          return res.redirect('/bbs/login');
        }

        var row = result.rows[0];
        // 鍮꾨?踰덊샇 ?뷀샇??異붽?: ?붾㈃???댁떆 鍮꾨?踰덊샇瑜??몄텧?섏? ?딅뒗??
        res.render('bbs/updatesignform', { rows: [[row[0], '', row[1], row[2]]] });
        connection.release();
      });
    });
  } else {
    res.redirect('/bbs/login');
  }
});

router.post('/updatesignsave', function (req, res, next) {
  var id = cleanText(req.body.id, 50); // 보안 강화 추가
  var pw = cleanText(req.body.pw1, 100); // 보안 강화 추가
  var name = cleanText(req.body.name, 100); // 보안 강화 추가
  var email = cleanText(req.body.email, 200); // 보안 강화 추가
  var pw2 = cleanText(req.body.pw2, 100); // 보안 강화 추가

  if (!requireLogin(req, res)) return;

  if (pw != pw2) {
    res.render('bbs/updatesignform', { rows: [[id, '', name, email]] });
    return;
  }

  if (id == '' || pw == '' || name == '' || pw.length < 4 || !isValidEmail(email)) {
    renderBadRequest(res, '입력값을 확인하세요.');
    return;
  }

  var oldId = req.session.user.id;
  createBcryptPassword(pw, function (err, hashPassword) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    oracledb.getConnection(dbconfig, function (err, connection) {
      if (err) {
        console.error('err : ' + err);
        return next(err);
      }
      var sql =
        "UPDATE LOGIN SET ID = :id, PASSWORD = :password, NAME = :name, EMAIL = :email, SALT = NULL, PASSWORD_ALGO = 'bcrypt', PASSWORD_UPDATED_AT = SYSDATE WHERE ID = :oldId";
      connection.execute(
        sql,
        {
          id: id,
          password: hashPassword,
          name: name,
          email: email,
          oldId: oldId
        },
        function (err) {
          if (err) {
            connection.release();
            console.error('err : ' + err);
            return next(err);
          }
          req.session.user.id = id;
          connection.release();
          res.redirect('/bbs/list');
        }
      );
    });
  });
});

router.get('/list', function (req, res, next) {
  var paging = getPaging(req);
  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }
    // soft delete??湲? 紐⑸줉?먯꽌 ?쒖쇅?섍퀬 理쒖떊 湲??癒쇱? 蹂댁씠?꾨줉 ?뺣젹?쒕떎.
    var countSql = 'SELECT COUNT(*) FROM BBS WHERE OK = 1';

    connection.execute(countSql, function (err, countResult) {
      if (err) {
        connection.release();
        console.error('err : ' + err);
        return next(err);
      }

      var totalCount = countResult.rows[0][0];
      var totalPage = Math.ceil(totalCount / paging.pageSize);

      if (totalPage > 0 && paging.currentPage > totalPage) {
        paging.currentPage = totalPage;
      }

      var offset = (paging.currentPage - 1) * paging.pageSize;
      var sql =
        "SELECT NO, TITLE, WRITER, CONTENT, to_char(REGDATE,'yyyy-mm-dd hh24:mi:ss'), " +
        'VIEW_COUNT, OK, NVL(LIKE_COUNT, 0), NVL(DISLIKE_COUNT, 0) ' +
        'FROM BBS WHERE OK = 1 ORDER BY NO DESC OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY';

      connection.execute(
        sql,
        {
          offset: offset,
          pageSize: paging.pageSize
        },
        function (err, rows) {
          if (err) {
            connection.release();
            console.error('err : ' + err);
            return next(err);
          }

          res.render(
            'bbs/list',
            Object.assign(getPagingViewData(paging.currentPage, paging.pageSize, totalCount), {
              rows: rows.rows,
              searchChoice: 'TITLE',
              searchKeyword: '',
              paginationBaseUrl: '/bbs/list?page='
            })
          );
          connection.release();
        }
      );
    });
  });
});

router.get('/form', function (req, res) {
  if (!requireLogin(req, res)) return;
  res.render('bbs/form');
});

router.post('/save', function (req, res, next) {
  if (!requireLogin(req, res)) return;

  upload.single('uploadFile')(req, res, function (uploadErr) {
    if (uploadErr) {
      return next(uploadErr);
    }

    var title = cleanText(req.body.brdtitle, 200); // 보안 강화 추가
    var content = cleanText(req.body.brdmemo, 4000); // 보안 강화 추가
    var writer = req.session.user.id; // 보안 강화 추가

    if (!title || !content || !writer) {
      renderBadRequest(res, '제목, 내용, 작성자는 필수입니다.');
      return;
    }

    oracledb.getConnection(dbconfig, function (err, connection) {
      if (err) {
        console.error('err : ' + err);
        return next(err);
      }

      var nextNoSql = 'SELECT BBS_SEQ.NEXTVAL FROM DUAL';

      connection.execute(nextNoSql, function (err, seqResult) {
        if (err) {
          connection.release();
          console.error('err : ' + err);
          return next(err);
        }

        var bbsno = seqResult.rows[0][0];
        var sql =
          'INSERT INTO BBS(NO, TITLE, CONTENT, WRITER, REGDATE) ' +
          'VALUES(:bbsno, :title, :content, :writer, sysdate)';

        connection.execute(
          sql,
          {
            bbsno: bbsno,
            title: title,
            content: content,
            writer: writer
          },
          function (err) {
            if (err) {
              connection.release();
              console.error('err : ' + err);
              return next(err);
            }

            if (!req.file) {
              connection.release();
              res.redirect('/bbs/list');
              return;
            }

            var filePath = path.join('uploads', 'bbs', req.file.filename).replace(/\\/g, '/');
            var fileSql =
              'INSERT INTO BBS_FILE ' +
              '(NO, BBSNO, ORG_FILENAME, SAVE_FILENAME, FILEPATH, FILESIZE, MIMETYPE, REGDATE, OK) ' +
              'VALUES (BBS_FILE_SEQ.NEXTVAL, :bbsno, :orgName, :saveName, :filePath, :fileSize, :mimeType, SYSDATE, 1)';

            connection.execute(
              fileSql,
              {
                bbsno: bbsno,
                orgName: getUploadOriginalName(req.file),
                saveName: req.file.filename,
                filePath: filePath,
                fileSize: req.file.size,
                mimeType: req.file.mimetype
              },
              function (err) {
                if (err) {
                  connection.release();
                  console.error('err : ' + err);
                  return next(err);
                }

                connection.release();
                res.redirect('/bbs/list');
              }
            );
          }
        );
      });
    });
  });
});

router.get('/read', function (req, res, next) {
  var brdno = toValidNumber(req.query.brdno); // 보안 강화 추가

  if (!brdno) {
    renderBadRequest(res, '게시글 번호가 올바르지 않습니다.');
    return;
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    var skipViewCount = shouldSkipViewCount(req, brdno);

    // read 화면은 상세 조회, 조회수 증가, 댓글/파일/내 추천 상태 조회를 한 번에 처리한다.
    var updateSql =
      'UPDATE BBS SET VIEW_COUNT = NVL(VIEW_COUNT, 0) + 1 WHERE OK = 1 AND NO = :brdno';
    var sql =
      'SELECT NO, TITLE, CONTENT, ' +
      "WRITER, to_char(REGDATE,'yyyy-mm-dd'), VIEW_COUNT, " +
      'NVL(LIKE_COUNT, 0), NVL(DISLIKE_COUNT, 0) ' +
      ' FROM BBS' +
      ' WHERE OK = 1 AND NO = :brdno';
    var commentSql =
      'SELECT NO, BBSNO, PARENT_NO, WRITER, CONTENT, DEPTH, LIKE_COUNT, DISLIKE_COUNT, ' +
      "TO_CHAR(REGDATE, 'yyyy-mm-dd hh24:mi:ss') AS REGDATE " +
      'FROM BBSW ' +
      'WHERE BBSNO = :bbsno AND OK = 1 ' +
      'START WITH PARENT_NO IS NULL ' +
      'CONNECT BY PRIOR NO = PARENT_NO ' +
      'ORDER SIBLINGS BY NO ASC';
    var fileSql =
      'SELECT NO, BBSNO, ORG_FILENAME, SAVE_FILENAME, FILEPATH, FILESIZE, MIMETYPE, ' +
      "TO_CHAR(REGDATE, 'yyyy-mm-dd hh24:mi:ss') AS REGDATE " +
      'FROM BBS_FILE WHERE BBSNO = :bbsno AND OK = 1 ORDER BY NO ASC';

    connection.execute(
      skipViewCount ? 'BEGIN NULL; END;' : updateSql,
      { brdno: brdno },
      function (err) {
        if (err) {
          connection.release();
          console.error('err : ' + err);
          return next(err);
        }

        connection.execute(sql, { brdno: brdno }, function (err, rows) {
          if (err) {
            connection.release();
            console.error('err : ' + err);
            return next(err);
          }

          if (rows.rows.length < 1) {
            connection.release();
            res.redirect('/bbs/list');
            return;
          }

          connection.execute(commentSql, { bbsno: brdno }, function (err, commentRows) {
            if (err) {
              connection.release();
              console.error('err : ' + err);
              return next(err);
            }

            connection.execute(fileSql, { bbsno: brdno }, function (err, fileRows) {
              if (err) {
                connection.release();
                console.error('err : ' + err);
                return next(err);
              }

              if (!req.session.user) {
                res.render('bbs/read', {
                  rows: rows.rows,
                  comments: commentRows.rows,
                  files: fileRows.rows,
                  currentUser: null,
                  userReaction: ''
                });
                connection.release();
                return;
              }

              var reactionSql =
                'SELECT REACTION_TYPE FROM BBS_REACTION WHERE BBSNO = :bbsno AND USER_ID = :userId';

              connection.execute(
                reactionSql,
                {
                  bbsno: brdno,
                  userId: req.session.user.id
                },
                function (err, reactionRows) {
                  if (err) {
                    connection.release();
                    console.error('err : ' + err);
                    return next(err);
                  }

                  res.render('bbs/read', {
                    rows: rows.rows,
                    comments: commentRows.rows,
                    files: fileRows.rows,
                    currentUser: req.session.user,
                    userReaction: reactionRows.rows.length ? reactionRows.rows[0][0] : ''
                  });
                  connection.release();
                }
              );
            });
          });
        });
      }
    );
  });
});

router.get('/delete', function (req, res, next) {
  if (!requireLogin(req, res)) return;

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    // ?ㅼ젣 DELETE ????곹깭媛믩쭔 ?대젮 怨쇱젣 ?먮쫫??留욌뒗 soft delete瑜??좎??쒕떎.
    var bbsno = toValidNumber(req.query.brdno); // 보안 강화 추가
    var writer = req.session.user.id;

    if (!bbsno) {
      connection.release();
      renderBadRequest(res, '게시글 번호가 올바르지 않습니다.');
      return;
    }

    var sql = 'UPDATE BBS SET OK = 0 WHERE NO = :bbsno AND WRITER = :writer';

    connection.execute(sql, { bbsno: bbsno, writer: writer }, function (err, result) {
      if (err) {
        connection.release();
        console.error('err : ' + err);
        return next(err);
      }

      if (!result.rowsAffected) {
        connection.release();
        renderForbidden(res);
        return;
      }

      var fileSql = 'UPDATE BBS_FILE SET OK = 0 WHERE BBSNO = :bbsno';

      connection.execute(fileSql, { bbsno: bbsno }, function (err) {
        if (err) {
          connection.release();
          console.error('err : ' + err);
          return next(err);
        }

        connection.release();
        res.redirect('/bbs/list');
      });
    });
  });
});

router.get('/update', function (req, res, next) {
  if (!requireLogin(req, res)) return;
  var brdno = toValidNumber(req.query.brdno); // 보안 강화 추가

  if (!brdno) {
    renderBadRequest(res, '게시글 번호가 올바르지 않습니다.');
    return;
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    // ?섏젙 ?붾㈃???쒖꽦 湲留???곸쑝濡??쒗븳?쒕떎.
    var sql =
      "SELECT NO, TITLE, CONTENT, WRITER, to_char(REGDATE,'yyyy-mm-dd') " +
      'FROM BBS WHERE OK = 1 AND NO = :brdno';

    connection.execute(sql, { brdno: brdno }, function (err, rows) {
      if (err) {
        connection.release();
        console.error('err : ' + err);
        return next(err);
      }

      if (rows.rows.length < 1) {
        connection.release();
        res.redirect('/bbs/list');
        return;
      }

      if (rows.rows[0][3] !== req.session.user.id) {
        connection.release();
        renderForbidden(res);
        return;
      }

      res.render('bbs/updateform', rows);
      connection.release();
    });
  });
});

router.post('/updatesave', function (req, res, next) {
  if (!requireLogin(req, res)) return;
  var brdno = toValidNumber(req.body.brdno); // 보안 강화 추가
  var title = cleanText(req.body.brdtitle, 200); // 보안 강화 추가
  var content = cleanText(req.body.brdmemo, 4000); // 보안 강화 추가
  var writer = req.session.user.id;

  if (!brdno || !title || !content) {
    renderBadRequest(res, '게시글 입력값을 확인하세요.');
    return;
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    var sql =
      'UPDATE BBS SET TITLE = :title, CONTENT = :content WHERE NO = :brdno AND WRITER = :writer';

    connection.execute(
      sql,
      { title: title, content: content, brdno: brdno, writer: writer },
      function (err, result) {
        if (err) {
          connection.release();
          console.error('err : ' + err);
          return next(err);
        }

        if (!result.rowsAffected) {
          connection.release();
          renderForbidden(res);
          return;
        }

        connection.release();
        res.redirect('/bbs/list');
      }
    );
  });
});

router.get('/search', function (req, res, next) {
  var choice = req.query.choice || 'TITLE';
  var searchKeyword = cleanText(req.query.search, 200); // 보안 강화 추가
  var allowedChoices = ['TITLE', 'WRITER', 'CONTENT', 'TITLE_CONTENT'];

  if (allowedChoices.indexOf(choice) < 0) {
    choice = 'TITLE';
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    var sql;
    var binds = { search: '%' + searchKeyword + '%' };

    if (choice == 'TITLE_CONTENT') {
      // ?쒕ぉ+?댁슜 寃?됱? OR 議곌굔??愿꾪샇濡?臾띠뼱 OK=1 議곌굔怨??④퍡 ?곸슜?쒕떎.

      sql =
        "SELECT NO, TITLE, WRITER, CONTENT, to_char(REGDATE,'yyyy-mm-dd hh24:mi:ss'), " +
        'VIEW_COUNT, OK, NVL(LIKE_COUNT, 0), NVL(DISLIKE_COUNT, 0) ' +
        'FROM BBS WHERE OK=1 AND (TITLE LIKE :search OR CONTENT LIKE :search) ' +
        'ORDER BY NO DESC';
    } else {
      sql =
        "SELECT NO, TITLE, WRITER, CONTENT, to_char(REGDATE,'yyyy-mm-dd hh24:mi:ss'), " +
        'VIEW_COUNT, OK, NVL(LIKE_COUNT, 0), NVL(DISLIKE_COUNT, 0) ' +
        'FROM BBS WHERE OK=1 AND ' +
        choice +
        ' LIKE :search ORDER BY NO DESC';
    }
    connection.execute(sql, binds, function (err, rows) {
      if (err) {
        connection.release();
        console.error('err : ' + err);
        return next(err);
      }

      res.render('bbs/list', {
        rows: rows.rows,
        searchChoice: choice,
        searchKeyword: searchKeyword
      });
      connection.release();
    });
  });
});

router.post('/reaction', function (req, res, next) {
  if (!requireLogin(req, res)) return;

  var bbsno = toValidNumber(req.body.bbsno);
  var reactionType = cleanText(req.body.reaction_type, 10).toUpperCase();
  var userId = req.session.user.id;

  if (!bbsno || !isValidReactionType(reactionType)) {
    renderBadRequest(res, '추천 입력값을 확인하세요.');
    return;
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    var postSql = 'SELECT NO FROM BBS WHERE NO = :bbsno AND OK = 1';

    connection.execute(postSql, { bbsno: bbsno }, function (err, postRows) {
      if (err) {
        connection.release();
        console.error('err : ' + err);
        return next(err);
      }

      if (postRows.rows.length < 1) {
        connection.release();
        renderBadRequest(res, '게시글 번호가 올바르지 않습니다.');
        return;
      }

      var selectSql =
        'SELECT REACTION_TYPE FROM BBS_REACTION WHERE BBSNO = :bbsno AND USER_ID = :userId';

      connection.execute(selectSql, { bbsno: bbsno, userId: userId }, function (err, reactionRows) {
        if (err) {
          connection.release();
          console.error('err : ' + err);
          return next(err);
        }

        var currentReaction = reactionRows.rows.length ? reactionRows.rows[0][0] : '';

        // 기록이 없으면 새 추천을 추가하고 게시글 카운터를 증가시킨다.
        if (!currentReaction) {
          var insertReactionSql =
            reactionType === 'LIKE'
              ? 'BEGIN ' +
                'INSERT INTO BBS_REACTION (BBSNO, USER_ID, REACTION_TYPE, REGDATE) VALUES (:bbsno, :userId, :reactionType, SYSDATE); ' +
                'UPDATE BBS SET LIKE_COUNT = NVL(LIKE_COUNT, 0) + 1 WHERE NO = :bbsno; ' +
                'END;'
              : 'BEGIN ' +
                'INSERT INTO BBS_REACTION (BBSNO, USER_ID, REACTION_TYPE, REGDATE) VALUES (:bbsno, :userId, :reactionType, SYSDATE); ' +
                'UPDATE BBS SET DISLIKE_COUNT = NVL(DISLIKE_COUNT, 0) + 1 WHERE NO = :bbsno; ' +
                'END;';

          connection.execute(
            insertReactionSql,
            { bbsno: bbsno, userId: userId, reactionType: reactionType },
            function (err) {
              if (err) {
                connection.release();
                console.error('err : ' + err);
                return next(err);
              }

              connection.release();
              redirectReadWithoutViewCount(req, res, next, bbsno);
            }
          );
          return;
        }

        // 같은 버튼을 다시 누르면 추천 기록을 삭제하고 카운터를 되돌린다.
        if (currentReaction === reactionType) {
          var cancelReactionSql =
            reactionType === 'LIKE'
              ? 'BEGIN ' +
                'DELETE FROM BBS_REACTION WHERE BBSNO = :bbsno AND USER_ID = :userId; ' +
                'UPDATE BBS SET LIKE_COUNT = GREATEST(NVL(LIKE_COUNT, 0) - 1, 0) WHERE NO = :bbsno; ' +
                'END;'
              : 'BEGIN ' +
                'DELETE FROM BBS_REACTION WHERE BBSNO = :bbsno AND USER_ID = :userId; ' +
                'UPDATE BBS SET DISLIKE_COUNT = GREATEST(NVL(DISLIKE_COUNT, 0) - 1, 0) WHERE NO = :bbsno; ' +
                'END;';

          connection.execute(cancelReactionSql, { bbsno: bbsno, userId: userId }, function (err) {
            if (err) {
              connection.release();
              console.error('err : ' + err);
              return next(err);
            }

            connection.release();
            redirectReadWithoutViewCount(req, res, next, bbsno);
          });
          return;
        }

        // 반대 버튼을 누르면 기록은 갱신하고 기존 카운터와 새 카운터를 동시에 보정한다.
        var switchReactionSql =
          reactionType === 'LIKE'
            ? 'BEGIN ' +
              'UPDATE BBS_REACTION SET REACTION_TYPE = :reactionType, UPDATEDATE = SYSDATE WHERE BBSNO = :bbsno AND USER_ID = :userId; ' +
              'UPDATE BBS SET LIKE_COUNT = NVL(LIKE_COUNT, 0) + 1, DISLIKE_COUNT = GREATEST(NVL(DISLIKE_COUNT, 0) - 1, 0) WHERE NO = :bbsno; ' +
              'END;'
            : 'BEGIN ' +
              'UPDATE BBS_REACTION SET REACTION_TYPE = :reactionType, UPDATEDATE = SYSDATE WHERE BBSNO = :bbsno AND USER_ID = :userId; ' +
              'UPDATE BBS SET DISLIKE_COUNT = NVL(DISLIKE_COUNT, 0) + 1, LIKE_COUNT = GREATEST(NVL(LIKE_COUNT, 0) - 1, 0) WHERE NO = :bbsno; ' +
              'END;';

        connection.execute(
          switchReactionSql,
          { bbsno: bbsno, userId: userId, reactionType: reactionType },
          function (err) {
            if (err) {
              connection.release();
              console.error('err : ' + err);
              return next(err);
            }

            connection.release();
            redirectReadWithoutViewCount(req, res, next, bbsno);
          }
        );
      });
    });
  });
});

router.post('/wsave', function (req, res, next) {
  if (!requireLogin(req, res)) return;

  var bbsno = toValidNumber(req.body.bbsno); // 보안 강화 추가
  var content = cleanText(req.body.content, 4000); // 보안 강화 추가
  var writer = req.session.user.id;

  if (!bbsno || !content) {
    renderBadRequest(res, '댓글 입력값을 확인하세요.');
    return;
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    var sql =
      'INSERT INTO BBSW (NO, BBSNO, PARENT_NO, WRITER, CONTENT, DEPTH, REGDATE, OK) ' +
      'VALUES (BBSW_SEQ.NEXTVAL, :bbsno, NULL, :writer, :content, 0, SYSDATE, 1)';

    connection.execute(
      sql,
      {
        bbsno: bbsno,
        writer: writer,
        content: content
      },
      function (err) {
        if (err) {
          connection.release();
          console.error('err : ' + err);
          return next(err);
        }

        connection.release();
        res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
      }
    );
  });
});

router.post('/wreply', function (req, res, next) {
  if (!requireLogin(req, res)) return;

  var bbsno = toValidNumber(req.body.bbsno); // 보안 강화 추가
  var parentNo = toValidNumber(req.body.parent_no); // 보안 강화 추가
  var content = cleanText(req.body.content, 4000); // 보안 강화 추가
  var writer = req.session.user.id;

  if (!bbsno || !parentNo || !content) {
    renderBadRequest(res, '답글 입력값을 확인하세요.');
    return;
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    var parentSql = 'SELECT DEPTH FROM BBSW WHERE NO = :parentNo AND BBSNO = :bbsno AND OK = 1';

    connection.execute(parentSql, { parentNo: parentNo, bbsno: bbsno }, function (err, parentRows) {
      if (err) {
        connection.release();
        console.error('err : ' + err);
        return next(err);
      }

      if (parentRows.rows.length < 1) {
        connection.release();
        res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
        return;
      }

      var depth = parentRows.rows[0][0] + 1;
      var insertSql =
        'INSERT INTO BBSW (NO, BBSNO, PARENT_NO, WRITER, CONTENT, DEPTH, REGDATE, OK) ' +
        'VALUES (BBSW_SEQ.NEXTVAL, :bbsno, :parentNo, :writer, :content, :depth, SYSDATE, 1)';

      connection.execute(
        insertSql,
        {
          bbsno: bbsno,
          parentNo: parentNo,
          writer: writer,
          content: content,
          depth: depth
        },
        function (err) {
          if (err) {
            connection.release();
            console.error('err : ' + err);
            return next(err);
          }

          var updateSql =
            'UPDATE BBSW SET CHILD_COUNT = NVL(CHILD_COUNT, 0) + 1 WHERE NO = :parentNo';

          connection.execute(updateSql, { parentNo: parentNo }, function (err) {
            if (err) {
              connection.release();
              console.error('err : ' + err);
              return next(err);
            }

            connection.release();
            res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
          });
        }
      );
    });
  });
});

router.get('/wdelete', function (req, res, next) {
  if (!requireLogin(req, res)) return;

  var wno = toValidNumber(req.query.wno); // 보안 강화 추가
  var bbsno = toValidNumber(req.query.bbsno); // 보안 강화 추가
  var writer = req.session.user.id;

  if (!wno || !bbsno) {
    renderBadRequest(res, '댓글 번호가 올바르지 않습니다.');
    return;
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    var sql =
      "UPDATE BBSW SET OK = 0, CONTENT = '삭제된 댓글입니다.', UPDATEDATE = SYSDATE " +
      'WHERE NO = :wno AND WRITER = :writer';

    connection.execute(sql, { wno: wno, writer: writer }, function (err, result) {
      if (err) {
        connection.release();
        console.error('err : ' + err);
        return next(err);
      }

      if (!result.rowsAffected) {
        connection.release();
        renderForbidden(res);
        return;
      }

      connection.release();
      res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
    });
  });
});

router.get('/download', function (req, res, next) {
  var fno = toValidNumber(req.query.fno); // 보안 강화 추가

  if (!fno) {
    renderBadRequest(res, '파일 번호가 올바르지 않습니다.');
    return;
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    var sql =
      'SELECT ORG_FILENAME, SAVE_FILENAME, FILEPATH FROM BBS_FILE WHERE NO = :fno AND OK = 1';

    connection.execute(sql, { fno: fno }, function (err, result) {
      if (err) {
        connection.release();
        console.error('err : ' + err);
        return next(err);
      }

      if (result.rows.length < 1) {
        connection.release();
        res.redirect('/bbs/list');
        return;
      }

      var row = result.rows[0];
      var orgName = row[0];
      var saveName = row[1];
      var filePath = path.resolve(uploadDir, saveName);
      var uploadRoot = path.resolve(uploadDir);

      if (filePath.indexOf(uploadRoot + path.sep) !== 0 || !fs.existsSync(filePath)) {
        connection.release();
        res.redirect('/bbs/list');
        return;
      }

      connection.release();
      res.download(filePath, orgName, function (downloadErr) {
        if (downloadErr) {
          next(downloadErr);
        }
      });
    });
  });
});

module.exports = router;
