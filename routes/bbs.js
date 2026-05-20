var express = require('express');
var router = express.Router();
var oracledb = require('oracledb');
var crypto = require('crypto');
var bcrypt = require('bcrypt');
var csrf = require('csurf');
var fs = require('fs');
var path = require('path');
var multer = require('multer');
oracledb.autoCommit = true;

var dbconfig = require('../config/dbconfig');
var bcryptSaltRounds = 12;
var csrfProtection = csrf();
var uploadDir = path.join(__dirname, '..', 'uploads', 'bbs');
var skipViewCountTokens = Object.create(null);
var maxUploadSize = 10 * 1024 * 1024;
var allowedFileTypes = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.pdf': ['application/pdf'],
  '.txt': ['text/plain'],
  '.zip': ['application/zip', 'application/x-zip-compressed'],
  '.hwp': ['application/x-hwp', 'application/haansofthwp', 'application/octet-stream'],
  '.hwpx': ['application/zip', 'application/octet-stream'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
};

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
    fileSize: maxUploadSize,
    files: 1
  },
  fileFilter: function (_req, file, cb) {
    var originalName = path.basename(file.originalname || '');
    var ext = path.extname(originalName).toLowerCase();
    var allowedMimes = allowedFileTypes[ext] || [];

    if (!ext || allowedMimes.length < 1 || allowedMimes.indexOf(file.mimetype) < 0) {
      cb(new Error('허용되지 않는 파일 형식입니다.'));
      return;
    }

    cb(null, true);
  }
});

// 글쓰기, 수정, 삭제처럼 로그인이 필요한 요청에서 공통으로 사용하는 인증 가드.
function requireLogin(req, res) {
  if (!req.session.user) {
    if (req.flashMessage) {
      req.flashMessage('warning', '로그인이 필요한 기능입니다.');
    }
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

function createResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getPaging(req) {
  var allowedPageSizes = [10, 20, 30, 50];
  var pageSize = parseInt(req.query.pageSize, 10);
  var currentPage = parseInt(req.query.page, 10);

  if (allowedPageSizes.indexOf(pageSize) < 0) {
    pageSize = 10;
  }

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

function getSort(req) {
  var sort = req.query.sort;
  var order = (req.query.order || 'desc').toLowerCase();
  var sortColumns = {
    views: 'VIEW_COUNT',
    likes: 'NVL(LIKE_COUNT, 0)',
    created_at: 'REGDATE'
  };

  if (!sortColumns[sort]) {
    return {
      sort: '',
      order: 'desc',
      orderBy: 'NO DESC'
    };
  }

  if (order !== 'asc' && order !== 'desc') {
    order = 'desc';
  }

  return {
    sort: sort,
    order: order,
    orderBy: sortColumns[sort] + ' ' + order.toUpperCase() + ', NO DESC'
  };
}

function getUploadOriginalName(file) {
  if (!file || !file.originalname) {
    return '';
  }

  return path.basename(Buffer.from(file.originalname, 'latin1').toString('utf8'));
}

function getUploadErrorMessage(err) {
  if (!err) return '';
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return '첨부파일은 10MB 이하만 업로드할 수 있습니다.';
  }
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_COUNT') {
    return '첨부파일은 1개만 업로드할 수 있습니다.';
  }
  return err.message || '첨부파일 업로드에 실패했습니다.';
}

function resolveStoredUploadPath(saveName) {
  var safeName = path.basename(saveName || '');
  var uploadRoot = path.resolve(uploadDir);
  var filePath = path.resolve(uploadRoot, safeName);

  if (!safeName || safeName !== saveName || filePath.indexOf(uploadRoot + path.sep) !== 0) {
    return '';
  }

  return filePath;
}

function deleteStoredFile(saveName) {
  var filePath = resolveStoredUploadPath(saveName);

  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('file delete failed : ' + err.message);
    }
  }
}

function deleteStoredFiles(fileRows) {
  for (var i = 0; i < fileRows.length; i++) {
    deleteStoredFile(fileRows[i][0]);
  }
}

// 문자열 입력값을 trim하고 최대 길이를 넘으면 빈 값으로 처리한다.
function cleanText(value, maxLength) {
  var text = (value || '').trim();

  if (maxLength && text.length > maxLength) {
    return '';
  }

  return text;
}

// URL/query/body로 들어온 숫자가 양의 정수인지 확인한다.
function isValidNumber(value) {
  var numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0;
}

// 유효하지 않은 숫자는 null로 바꿔 라우터에서 bad request로 처리하게 한다.
function toValidNumber(value) {
  return isValidNumber(value) ? Number(value) : null;
}

// 이메일은 선택 입력값이며, 값이 있으면 기본 이메일 형식만 허용한다.
function isValidEmail(value) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidUserId(value) {
  return /^[A-Za-z0-9_]{4,20}$/.test(value);
}

function isValidPhone(value) {
  return /^01[016789]-\d{3,4}-\d{4}$/.test(value);
}

function validatePostInput(title, content) {
  if (!title) return '제목을 입력해주세요.';
  if (!content) return '내용을 입력해주세요.';
  if (title.length > 200) return '제목은 200자 이하로 입력해주세요.';
  if (content.length > 4000) return '내용은 4000자 이하로 입력해주세요.';
  return '';
}

function validateAccountInput(id, email, phone, options) {
  options = options || {};

  if (!id) return '아이디를 입력해주세요.';
  if (!isValidUserId(id)) return '아이디는 4~20자의 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.';
  if (options.emailRequired && !email) return '이메일을 입력해주세요.';
  if (email && !isValidEmail(email)) return '올바른 이메일 형식으로 입력해주세요.';
  if (options.phoneRequired && !phone) return '전화번호를 입력해주세요.';
  if (phone && !isValidPhone(phone)) return '전화번호는 010-1234-5678 형식으로 입력해주세요.';
  return '';
}

function validatePasswordPolicy(password) {
  if (!password) return '비밀번호를 입력해주세요.';
  if (password.length < 8) return '비밀번호는 최소 8자 이상이어야 합니다.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return '비밀번호는 영문과 숫자를 모두 포함해야 합니다.';
  }
  return '';
}

// 권한이 없는 요청에 대한 공통 응답.
function renderForbidden(res) {
  res.status(403);
  res.send('권한이 없습니다.');
}

// 잘못된 입력값에 대한 공통 응답.
function renderBadRequest(res, message) {
  res.status(400);
  res.send(message || '잘못된 요청입니다.');
}

function setFlash(req, type, text) {
  if (req.flashMessage) {
    req.flashMessage(type, text);
  }
}

function isValidReactionType(value) {
  return value === 'LIKE' || value === 'DISLIKE';
}

router.use(csrfProtection);

router.use(function (req, res, next) {
  res.locals.csrfToken = req.csrfToken();
  next();
});

router.get('/', function (req, res) {
  res.redirect('/bbs/list');
});

router.get('/login', function (req, res) {
  if (req.session.user) {
    setFlash(req, 'info', '이미 로그인되어 있습니다.');
    res.redirect('/bbs/list');
    return;
  }

  res.render('bbs/login', { errcode: 0 });
});

router.get('/find-id', function (req, res) {
  if (req.session.user) {
    setFlash(req, 'info', '이미 로그인되어 있습니다.');
    res.redirect('/bbs/list');
    return;
  }

  res.render('bbs/findid', {
    formData: {},
    foundId: '',
    message: ''
  });
});

router.post('/find-id', function (req, res, next) {
  var name = cleanText(req.body.name, 100);
  var email = cleanText(req.body.email, 200);
  var formData = { name: name, email: email };

  if (!name || !isValidEmail(email)) {
    res.render('bbs/findid', {
      formData: formData,
      foundId: '',
      message: '가입 시 입력한 이름과 이메일을 정확히 입력해주세요.'
    });
    return;
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    var sql = 'SELECT ID FROM LOGIN WHERE NAME = :name AND EMAIL = :email AND OK = 1';

    connection.execute(sql, { name: name, email: email }, function (err, result) {
      connection.release();

      if (err) {
        console.error('err : ' + err);
        return next(err);
      }

      res.render('bbs/findid', {
        formData: formData,
        foundId: result.rows.length ? result.rows[0][0] : '',
        message: result.rows.length ? '' : '일치하는 회원 정보를 찾을 수 없습니다.'
      });
    });
  });
});

router.get('/reset-password', function (req, res) {
  if (req.session.user) {
    setFlash(req, 'info', '이미 로그인되어 있습니다.');
    res.redirect('/bbs/list');
    return;
  }

  res.render('bbs/resetrequest', {
    formData: {},
    resetLink: '',
    message: ''
  });
});

router.post('/reset-password/request', function (req, res, next) {
  var id = cleanText(req.body.id, 50);
  var email = cleanText(req.body.email, 200);
  var formData = { id: id, email: email };

  function renderRequest(message, resetLink) {
    res.render('bbs/resetrequest', {
      formData: formData,
      resetLink: resetLink || '',
      message: message
    });
  }

  if (!id || !isValidUserId(id) || !isValidEmail(email) || !email) {
    renderRequest('아이디와 이메일을 정확히 입력해주세요.', '');
    return;
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    var findSql = 'SELECT ID FROM LOGIN WHERE ID = :id AND EMAIL = :email AND OK = 1';

    connection.execute(findSql, { id: id, email: email }, function (err, result) {
      if (err) {
        connection.release();
        console.error('err : ' + err);
        return next(err);
      }

      if (result.rows.length < 1) {
        connection.release();
        renderRequest('일치하는 활성 계정을 찾을 수 없습니다.', '');
        return;
      }

      var token = createResetToken();
      var disableOldSql =
        'UPDATE RESET_TOKEN SET USED = 1, USEDATE = SYSDATE WHERE USER_ID = :id AND USED = 0';
      var insertSql =
        'INSERT INTO RESET_TOKEN(NO, USER_ID, TOKEN, EXPIRES_AT) ' +
        "VALUES(RESET_TOKEN_SEQ.NEXTVAL, :id, :token, SYSDATE + INTERVAL '1' HOUR)";

      connection.execute(disableOldSql, { id: id }, function (err) {
        if (err) {
          connection.release();
          console.error('err : ' + err);
          return next(err);
        }

        connection.execute(insertSql, { id: id, token: token }, function (err) {
          connection.release();

          if (err) {
            console.error('err : ' + err);
            return next(err);
          }

          renderRequest(
            '비밀번호 재설정 토큰이 생성되었습니다. 실제 이메일 발송은 과제 범위에서 제외했습니다.',
            '/bbs/reset-password/confirm?token=' + encodeURIComponent(token)
          );
        });
      });
    });
  });
});

router.get('/reset-password/confirm', function (req, res, next) {
  var token = cleanText(req.query.token, 128);

  function renderConfirm(validToken, message) {
    res.render('bbs/resetconfirm', {
      token: token,
      validToken: validToken,
      message: message || ''
    });
  }

  if (!token) {
    renderConfirm(false, '재설정 토큰이 없습니다.');
    return;
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    var sql =
      'SELECT R.USER_ID FROM RESET_TOKEN R JOIN LOGIN L ON L.ID = R.USER_ID ' +
      'WHERE R.TOKEN = :token AND R.USED = 0 AND R.EXPIRES_AT > SYSDATE AND L.OK = 1';

    connection.execute(sql, { token: token }, function (err, result) {
      connection.release();

      if (err) {
        console.error('err : ' + err);
        return next(err);
      }

      renderConfirm(result.rows.length > 0, result.rows.length > 0 ? '' : '토큰이 없거나 만료되었습니다.');
    });
  });
});

router.post('/reset-password/confirm', function (req, res, next) {
  var token = cleanText(req.body.token, 128);
  var pw1 = cleanText(req.body.pw1, 100);
  var pw2 = cleanText(req.body.pw2, 100);
  var passwordError = validatePasswordPolicy(pw1);

  function renderConfirm(validToken, message) {
    res.render('bbs/resetconfirm', {
      token: token,
      validToken: validToken,
      message: message || ''
    });
  }

  if (!token) {
    renderConfirm(false, '재설정 토큰이 없습니다.');
    return;
  }

  if (pw1 !== pw2) {
    renderConfirm(true, '비밀번호와 비밀번호 확인이 일치하지 않습니다.');
    return;
  }

  if (passwordError) {
    renderConfirm(true, passwordError);
    return;
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    var findSql =
      'SELECT R.USER_ID FROM RESET_TOKEN R JOIN LOGIN L ON L.ID = R.USER_ID ' +
      'WHERE R.TOKEN = :token AND R.USED = 0 AND R.EXPIRES_AT > SYSDATE AND L.OK = 1';

    connection.execute(findSql, { token: token }, function (err, result) {
      if (err) {
        connection.release();
        console.error('err : ' + err);
        return next(err);
      }

      if (result.rows.length < 1) {
        connection.release();
        renderConfirm(false, '토큰이 없거나 만료되었습니다.');
        return;
      }

      var userId = result.rows[0][0];

      createBcryptPassword(pw1, function (err, hashPassword) {
        if (err) {
          connection.release();
          console.error('err : ' + err);
          return next(err);
        }

        var updatePasswordSql =
          "UPDATE LOGIN SET PASSWORD = :password, SALT = NULL, PASSWORD_ALGO = 'bcrypt', PASSWORD_UPDATED_AT = SYSDATE " +
          'WHERE ID = :id';

        connection.execute(updatePasswordSql, { password: hashPassword, id: userId }, function (err) {
          if (err) {
            connection.release();
            console.error('err : ' + err);
            return next(err);
          }

          var useTokenSql = 'UPDATE RESET_TOKEN SET USED = 1, USEDATE = SYSDATE WHERE TOKEN = :token';

          connection.execute(useTokenSql, { token: token }, function (err) {
            connection.release();

            if (err) {
              console.error('err : ' + err);
              return next(err);
            }

            setFlash(req, 'success', '비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요.');
            res.redirect('/bbs/login');
          });
        });
      });
    });
  });
});

router.post('/logincheck', function (req, res, next) {
  var pw = cleanText(req.body.password, 100);
  var code = 0;
  var id = cleanText(req.body.id, 50); // 입력값 검증
  var loginFailureMessage = '아이디 또는 비밀번호가 올바르지 않습니다.';

  if (!id || !pw || !isValidUserId(id)) {
    res.render('bbs/login', {
      errcode: 0,
      flashMessage: {
        type: 'warning',
        text: '아이디와 비밀번호를 입력해주세요.'
      }
    });
    return;
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    var sql = 'SELECT OK, PASSWORD, SALT, PASSWORD_ALGO, NAME FROM LOGIN WHERE ID = :id';

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
        res.render('bbs/login', {
          errcode: code,
          flashMessage: {
            type: 'danger',
            text: loginFailureMessage
          }
        });
        return;
      }

      var storedPassword = result.rows[0][1];
      var storedSalt = result.rows[0][2];
      var storedAlgo = result.rows[0][3] || 'sha512';
      var userName = result.rows[0][4];
      var isActiveUser = result.rows[0][0] === 1;

      if (!isActiveUser) {
        connection.release();
        res.render('bbs/login', {
          errcode: 1,
          flashMessage: {
            type: 'danger',
            text: '탈퇴 처리된 계정입니다.'
          }
        });
        return;
      }

      function finishLogin() {
        var paramID = id;

        if (req.session.user) {
          console.log('already logged in.');
        } else {
          console.log('new session created.');
          req.session.user = {
            id: paramID,
            name: userName,
            authorized: true
          };
        }

        connection.release();
        setFlash(req, 'success', '로그인되었습니다.');
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
            res.render('bbs/login', {
              errcode: code,
              flashMessage: {
                type: 'danger',
                text: loginFailureMessage
              }
            });
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
        res.render('bbs/login', {
          errcode: code,
          flashMessage: {
            type: 'danger',
            text: loginFailureMessage
          }
        });
        return;
      }

      var inputHashPassword = createPasswordHash(pw, storedSalt);

      if (storedPassword != inputHashPassword) {
        console.log('password mismatch.');
        code = 2;
        connection.release();
        res.render('bbs/login', {
          errcode: code,
          flashMessage: {
            type: 'danger',
            text: loginFailureMessage
          }
        });
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
  if (!req.session.user) {
    res.redirect('/bbs/list');
    return;
  }

  req.session.destroy(function () {
    res.redirect('/bbs/list?notice=logout');
  });
});

router.get('/myinfo', function (req, res, next) {
  if (!requireLogin(req, res)) return;

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    var sql =
      'SELECT ID, NAME, PHONE, ' +
      "TO_CHAR(PASSWORD_UPDATED_AT, 'yyyy-mm-dd') AS PASSWORD_UPDATED_AT " +
      'FROM LOGIN WHERE ID = :id AND OK = 1';

    connection.execute(sql, { id: req.session.user.id }, function (err, result) {
      connection.release();

      if (err) {
        console.error('err : ' + err);
        return next(err);
      }

      if (result.rows.length < 1) {
        res.redirect('/bbs/login');
        return;
      }

      var row = result.rows[0];
      req.session.user.name = row[1];

      res.render('bbs/myinfo', {
        userInfo: {
          id: row[0],
          name: row[1],
          phone: row[2],
          passwordUpdatedAt: row[3]
        }
      });
    });
  });
});

router.post('/withdraw', function (req, res, next) {
  if (!requireLogin(req, res)) return;

  var password = cleanText(req.body.password, 100);
  var confirmText = cleanText(req.body.confirmText, 20);
  var userId = req.session.user.id;

  if (!password || confirmText !== '탈퇴') {
    setFlash(req, 'warning', '회원 탈퇴 확인 문구와 비밀번호를 입력해주세요.');
    res.redirect('/bbs/myinfo');
    return;
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    var sql = 'SELECT PASSWORD, SALT, PASSWORD_ALGO FROM LOGIN WHERE ID = :id AND OK = 1';

    connection.execute(sql, { id: userId }, function (err, result) {
      if (err) {
        connection.release();
        console.error('err : ' + err);
        return next(err);
      }

      if (result.rows.length < 1) {
        connection.release();
        req.session.destroy(function () {
          res.redirect('/bbs/login');
        });
        return;
      }

      var storedPassword = result.rows[0][0];
      var storedSalt = result.rows[0][1];
      var storedAlgo = result.rows[0][2] || 'sha512';

      function deactivateUser() {
        var updateSql = 'UPDATE LOGIN SET OK = 0 WHERE ID = :id AND OK = 1';

        connection.execute(updateSql, { id: userId }, function (err) {
          connection.release();

          if (err) {
            console.error('err : ' + err);
            return next(err);
          }

          req.session.destroy(function () {
            res.redirect('/bbs/list');
          });
        });
      }

      function rejectPassword() {
        connection.release();
        setFlash(req, 'danger', '비밀번호가 일치하지 않습니다.');
        res.redirect('/bbs/myinfo');
      }

      if (isBcryptPassword(storedAlgo, storedPassword)) {
        bcrypt.compare(password, storedPassword, function (err, isMatch) {
          if (err) {
            connection.release();
            console.error('err : ' + err);
            return next(err);
          }

          if (!isMatch) {
            rejectPassword();
            return;
          }

          deactivateUser();
        });
        return;
      }

      if (!storedSalt || createPasswordHash(password, storedSalt) !== storedPassword) {
        rejectPassword();
        return;
      }

      deactivateUser();
    });
  });
});

router.get('/signup', function (req, res) {
  if (req.session.user) {
    setFlash(req, 'info', '이미 로그인되어 있습니다.');
    res.redirect('/bbs/list');
    return;
  }

  res.render('bbs/signup', { code: 0, formData: {}, idCheckMessage: '', idCheckAvailable: null });
});

router.get('/check-id', function (req, res, next) {
  var id = cleanText(req.query.userId || req.query.id, 50);
  if (id && !isValidUserId(id)) {
    req.session.checkedSignupId = null;
    res.json({ available: false, message: '아이디는 4~20자의 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.' });
    return;
  }

  if (!id) {
    req.session.checkedSignupId = null;
    res.json({ available: false, message: '아이디를 입력해주세요.' });
    return;
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    connection.execute('SELECT COUNT(*) FROM LOGIN WHERE ID = :id', { id: id }, function (err, result) {
      connection.release();

      if (err) {
        console.error('err : ' + err);
        return next(err);
      }

      var available = result.rows[0][0] === 0;
      req.session.checkedSignupId = available ? id : null;
      res.json({
        available: available,
        message: available ? '사용 가능한 아이디입니다.' : '이미 사용 중인 아이디입니다.'
      });
    });
  });
});

router.post('/signupsave', function (req, res, next) {
  var id = cleanText(req.body.id, 50);
  var pw1 = cleanText(req.body.pw1, 100);
  var pw2 = cleanText(req.body.pw2, 100);
  var name = cleanText(req.body.name, 100);
  var email = cleanText(req.body.email, 200);
  var phone = cleanText(req.body.phone, 30);
  var idChecked = req.body.idChecked === 'Y';
  var checkedId = cleanText(req.body.checkedId, 50);
  var sessionCheckedId = req.session.checkedSignupId;
  var code = 0;
  var formData = { id: id, name: name, email: email, phone: phone };
  var accountError = validateAccountInput(id, email, phone, { emailRequired: true, phoneRequired: true });
  var passwordError = validatePasswordPolicy(pw1);

  function renderSignupMessage(message, available, flashText) {
    res.render('bbs/signup', {
      code: 0,
      formData: formData,
      idCheckMessage: message,
      idCheckAvailable: available,
      flashMessage: flashText
        ? {
            type: 'warning',
            text: flashText
          }
        : null
    });
  }

  if (pw1 != pw2) {
    renderSignupMessage('', null, '비밀번호와 비밀번호 확인이 일치하지 않습니다.');
    return;
  }

  if (accountError || passwordError || name == '') {
    renderSignupMessage(
      accountError || '',
      accountError ? false : null,
      passwordError || (name == '' ? '이름을 입력해주세요.' : '')
    );
    return;
  }

  if (!idChecked || checkedId !== id || sessionCheckedId !== id) {
    renderSignupMessage('아이디 중복확인을 완료해주세요.', false);
    return;
  }

  var sql =
    'INSERT INTO LOGIN(ID,PASSWORD,NAME,EMAIL,PHONE,SALT,PASSWORD_ALGO,PASSWORD_UPDATED_AT) ' +
    "VALUES(:id,:password,:name,:email,:phone,NULL,'bcrypt',SYSDATE)";

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

      connection.execute('SELECT COUNT(*) FROM LOGIN WHERE ID = :id', { id: id }, function (err, countResult) {
        if (err) {
          connection.release();
          console.error('err : ' + err);
          return next(err);
        }

        if (countResult.rows[0][0] > 0) {
          connection.release();
          req.session.checkedSignupId = null;
          renderSignupMessage('이미 사용 중인 아이디입니다.', false);
          return;
        }

        connection.execute(
          sql,
          {
            id: id,
            password: hashPassword,
            name: name,
            email: email,
            phone: phone
          },
          function (err) {
            if (err) {
              connection.release();
              code = 3;
              res.render('error', { errcode: code });
              return;
            }
            connection.release();
            req.session.checkedSignupId = null;
            setFlash(req, 'success', '회원가입이 완료되었습니다. 로그인해주세요.');
            res.redirect('/bbs/login');
          }
        );
      });
    });
  });
});

router.post('/signupsave-old', function (req, res, next) {
  var id = cleanText(req.body.id, 50);
  var pw1 = cleanText(req.body.pw1, 100);
  var pw2 = cleanText(req.body.pw2, 100);
  var name = cleanText(req.body.name, 100);
  var email = cleanText(req.body.email, 200);
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
        // 비밀번호 해시가 화면에 다시 노출되지 않도록 빈 값으로 넘긴다.
        res.render('bbs/updatesignform', { rows: [[row[0], '', row[1], row[2]]] });
        connection.release();
      });
    });
  } else {
    res.redirect('/bbs/login');
  }
});

router.post('/updatesignsave', function (req, res, next) {
  var pw = cleanText(req.body.pw1, 100);
  var name = cleanText(req.body.name, 100);
  var email = cleanText(req.body.email, 200);
  var pw2 = cleanText(req.body.pw2, 100);
  var id = cleanText(req.body.id, 50); // 입력값 검증
  if (!requireLogin(req, res)) return;

  if (pw != pw2) {
    res.render('bbs/updatesignform', {
      rows: [[id, '', name, email]],
      flashMessage: { type: 'warning', text: '비밀번호 확인이 일치하지 않습니다.' }
    });
    return;
  }

  var updateAccountError = validateAccountInput(id, email, '', { emailRequired: true });
  var updatePasswordError = validatePasswordPolicy(pw);
  if (updateAccountError || updatePasswordError || name == '') {
    return res.render('bbs/updatesignform', {
      rows: [[id, '', name, email]],
      flashMessage: {
        type: 'warning',
        text: updateAccountError || updatePasswordError || '이름을 입력해주세요.'
      }
    });
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
          req.session.user.name = name;
          connection.release();
          setFlash(req, 'success', '회원정보가 수정되었습니다.');
          res.redirect('/bbs/list');
        }
      );
    });
  });
});

router.get('/list', function (req, res, next) {
  var paging = getPaging(req);
  var sortInfo = getSort(req);
  var myPostsOnly = req.query.mine === '1' && req.session.user;
  var whereSql = 'OK = 1';
  var binds = {};

  if (myPostsOnly) {
    whereSql += ' AND (WRITER = :writerId OR WRITER = :writerName)';
    binds.writerId = req.session.user.id;
    binds.writerName = req.session.user.name || req.session.user.id;
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }
    // soft delete된 글은 목록에서 제외하고 최신 글이 먼저 보이도록 정렬한다.
    var countSql = 'SELECT COUNT(*) FROM BBS WHERE ' + whereSql;

    connection.execute(countSql, binds, function (err, countResult) {
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
      var listBaseParams = 'pageSize=' + paging.pageSize + (myPostsOnly ? '&mine=1' : '');
      var paginationBaseUrl = sortInfo.sort
        ? '/bbs/list?' +
          listBaseParams +
          '&sort=' +
          encodeURIComponent(sortInfo.sort) +
          '&order=' +
          encodeURIComponent(sortInfo.order) +
          '&page='
        : '/bbs/list?' + listBaseParams + '&page=';
      var sql =
        "SELECT NO, TITLE, WRITER, CONTENT, to_char(REGDATE,'yyyy-mm-dd hh24:mi:ss'), " +
        'VIEW_COUNT, OK, NVL(LIKE_COUNT, 0), NVL(DISLIKE_COUNT, 0), ' +
        '(SELECT COUNT(*) FROM BBSW WHERE BBSW.BBSNO = BBS.NO AND BBSW.OK = 1) AS COMMENT_COUNT ' +
        'FROM BBS WHERE ' +
        whereSql +
        ' ORDER BY ' +
        sortInfo.orderBy +
        ' OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY';

      connection.execute(
        sql,
        Object.assign({}, binds, {
          offset: offset,
          pageSize: paging.pageSize
        }),
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
              isSearch: false,
              myPostsOnly: !!myPostsOnly,
              sort: sortInfo.sort,
              order: sortInfo.order,
              paginationBaseUrl: paginationBaseUrl
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
      var uploadMessage = getUploadErrorMessage(uploadErr);
      setFlash(req, 'warning', uploadMessage);
      res.render('bbs/form', {
        flashMessage: {
          type: 'warning',
          text: uploadMessage
        },
        formData: {
          title: cleanText(req.body.brdtitle, 200),
          content: cleanText(req.body.brdmemo, 4000)
        }
      });
      return;
    }

    var content = cleanText(req.body.brdmemo, 4000);
    var title = cleanText(req.body.brdtitle, 200); // 입력값 검증
    var writer = req.session.user.name || req.session.user.id;
    var postError = validatePostInput(title, content);

    if (postError || !writer) {
      if (req.file) {
        deleteStoredFile(req.file.filename);
      }
      setFlash(req, 'warning', postError || '작성자 정보를 확인해주세요.');
      res.render('bbs/form', {
        flashMessage: {
          type: 'warning',
          text: postError || '작성자 정보를 확인해주세요.'
        },
        formData: { title: title, content: content }
      });
      return;
    }

    oracledb.getConnection(dbconfig, function (err, connection) {
      if (err) {
        if (req.file) {
          deleteStoredFile(req.file.filename);
        }
        console.error('err : ' + err);
        return next(err);
      }

      var nextNoSql = 'SELECT BBS_SEQ.NEXTVAL FROM DUAL';

      connection.execute(nextNoSql, function (err, seqResult) {
        if (err) {
          connection.release();
          if (req.file) {
            deleteStoredFile(req.file.filename);
          }
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
              if (req.file) {
                deleteStoredFile(req.file.filename);
              }
              console.error('err : ' + err);
              return next(err);
            }

            if (!req.file) {
              connection.release();
              setFlash(req, 'success', '게시글이 등록되었습니다.');
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
                  deleteStoredFile(req.file.filename);
                  console.error('err : ' + err);
                  return next(err);
                }

                connection.release();
                setFlash(req, 'success', '게시글과 첨부파일이 등록되었습니다.');
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
  var brdno = toValidNumber(req.query.brdno); // 게시글 번호 검증
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
      "TO_CHAR(REGDATE, 'yyyy-mm-dd hh24:mi:ss') AS REGDATE, " +
      "TO_CHAR(UPDATEDATE, 'yyyy-mm-dd hh24:mi:ss') AS UPDATEDATE, OK " +
      'FROM BBSW ' +
      'WHERE BBSNO = :bbsno ' +
      'START WITH PARENT_NO IS NULL ' +
      'CONNECT BY PRIOR NO = PARENT_NO ' +
      'ORDER SIBLINGS BY NO ASC';
    var fileSql =
      'SELECT NO, BBSNO, ORG_FILENAME, SAVE_FILENAME, FILEPATH, FILESIZE, MIMETYPE, ' +
      "TO_CHAR(REGDATE, 'yyyy-mm-dd hh24:mi:ss') AS REGDATE " +
      'FROM BBS_FILE WHERE BBSNO = :bbsno AND OK = 1 ORDER BY NO ASC';

    connection.execute(
      skipViewCount ? 'BEGIN NULL; END;' : updateSql,
      skipViewCount ? {} : { brdno: brdno },
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

    // 실제 DELETE 대신 상태값만 내려 과제 흐름에 맞는 soft delete를 유지한다.
    var bbsno = toValidNumber(req.query.brdno); // 게시글 번호 검증
    var writer = req.session.user.id;
    var writerName = req.session.user.name || req.session.user.id;

    if (!bbsno) {
      connection.release();
      renderBadRequest(res, '게시글 번호가 올바르지 않습니다.');
      return;
    }

    var selectFilesSql = 'SELECT SAVE_FILENAME FROM BBS_FILE WHERE BBSNO = :bbsno AND OK = 1';
    var sql = 'UPDATE BBS SET OK = 0 WHERE NO = :bbsno AND (WRITER = :writer OR WRITER = :writerName)';

    connection.execute(selectFilesSql, { bbsno: bbsno }, function (err, fileRows) {
      if (err) {
        connection.release();
        console.error('err : ' + err);
        return next(err);
      }

      connection.execute(sql, { bbsno: bbsno, writer: writer, writerName: writerName }, function (err, result) {
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
          deleteStoredFiles(fileRows.rows);
          setFlash(req, 'success', '게시글이 삭제되었습니다.');
          res.redirect('/bbs/list');
        });
      });
    });
  });
});

router.get('/update', function (req, res, next) {
  if (!requireLogin(req, res)) return;
  var brdno = toValidNumber(req.query.brdno); // 게시글 번호 검증
  if (!brdno) {
    renderBadRequest(res, '게시글 번호가 올바르지 않습니다.');
    return;
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    // 수정 화면은 삭제되지 않은 활성 글만 대상으로 제한한다.
    var sql =
      "SELECT NO, TITLE, CONTENT, WRITER, to_char(REGDATE,'yyyy-mm-dd') " +
      'FROM BBS WHERE OK = 1 AND NO = :brdno';
    var fileSql =
      'SELECT NO, BBSNO, ORG_FILENAME, SAVE_FILENAME, FILEPATH, FILESIZE, MIMETYPE, ' +
      "TO_CHAR(REGDATE, 'yyyy-mm-dd hh24:mi:ss') AS REGDATE " +
      'FROM BBS_FILE WHERE BBSNO = :bbsno AND OK = 1 ORDER BY NO ASC';

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

      if (rows.rows[0][3] !== req.session.user.id && rows.rows[0][3] !== (req.session.user.name || req.session.user.id)) {
        connection.release();
        renderForbidden(res);
        return;
      }

      connection.execute(fileSql, { bbsno: brdno }, function (err, fileRows) {
        if (err) {
          connection.release();
          console.error('err : ' + err);
          return next(err);
        }

        res.render('bbs/updateform', {
          rows: rows.rows,
          files: fileRows.rows
        });
        connection.release();
      });
    });
  });
});

router.post('/updatesave', function (req, res, next) {
  if (!requireLogin(req, res)) return;
  var title = cleanText(req.body.brdtitle, 200);
  var content = cleanText(req.body.brdmemo, 4000);
  var writer = req.session.user.id;
  var brdno = toValidNumber(req.body.brdno); // 게시글 번호 검증
  var writerName = req.session.user.name || req.session.user.id;
  var postError = validatePostInput(title, content);

  if (!brdno || postError) {
    if (postError) setFlash(req, 'warning', postError);
    if (brdno) {
      res.redirect('/bbs/update?brdno=' + brdno);
    } else {
      renderBadRequest(res, '게시글 번호를 확인해주세요.');
    }
    return;
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    var sql =
      'UPDATE BBS SET TITLE = :title, CONTENT = :content WHERE NO = :brdno AND (WRITER = :writer OR WRITER = :writerName)';

    connection.execute(
      sql,
      { title: title, content: content, brdno: brdno, writer: writer, writerName: writerName },
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
        setFlash(req, 'success', '게시글이 수정되었습니다.');
        res.redirect('/bbs/list');
      }
    );
  });
});

router.get('/search', function (req, res, next) {
  var choice = req.query.choice || 'TITLE';
  var searchColumns = {
    TITLE: 'TITLE',
    WRITER: 'WRITER',
    CONTENT: 'CONTENT',
    TITLE_CONTENT: 'TITLE_CONTENT'
  };
  var paging = getPaging(req);
  var sortInfo = getSort(req);
  var searchKeyword = cleanText(req.query.search, 200); // 검색어 길이 검증
  var myPostsOnly = req.query.mine === '1' && req.session.user;

  if (!searchColumns[choice]) {
    choice = 'TITLE';
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    var whereSql;
    var sql;
    var binds = { search: '%' + searchKeyword + '%' };

    if (choice == 'TITLE_CONTENT') {
      // 제목+내용 검색은 OR 조건을 괄호로 묶어 OK=1 조건과 함께 적용한다.

      whereSql = 'OK=1 AND (TITLE LIKE :search OR CONTENT LIKE :search)';
    } else {
      whereSql = 'OK=1 AND ' + searchColumns[choice] + ' LIKE :search';
    }

    if (myPostsOnly) {
      whereSql += ' AND (WRITER = :writerId OR WRITER = :writerName)';
      binds.writerId = req.session.user.id;
      binds.writerName = req.session.user.name || req.session.user.id;
    }

    connection.execute('SELECT COUNT(*) FROM BBS WHERE ' + whereSql, binds, function (err, countResult) {
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
      var paginationBaseUrl =
        '/bbs/search?choice=' +
        encodeURIComponent(choice) +
        '&search=' +
        encodeURIComponent(searchKeyword) +
        '&pageSize=' +
        paging.pageSize +
        (myPostsOnly ? '&mine=1' : '') +
        (sortInfo.sort
          ? '&sort=' +
            encodeURIComponent(sortInfo.sort) +
            '&order=' +
            encodeURIComponent(sortInfo.order)
          : '') +
        '&page=';

      sql =
        "SELECT NO, TITLE, WRITER, CONTENT, to_char(REGDATE,'yyyy-mm-dd hh24:mi:ss'), " +
        'VIEW_COUNT, OK, NVL(LIKE_COUNT, 0), NVL(DISLIKE_COUNT, 0), ' +
        '(SELECT COUNT(*) FROM BBSW WHERE BBSW.BBSNO = BBS.NO AND BBSW.OK = 1) AS COMMENT_COUNT ' +
        'FROM BBS WHERE ' +
        whereSql +
        ' ORDER BY ' +
        sortInfo.orderBy +
        ' OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY';

      connection.execute(
        sql,
        Object.assign({}, binds, {
          offset: offset,
          pageSize: paging.pageSize
        }),
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
              searchChoice: choice,
              searchKeyword: searchKeyword,
              isSearch: true,
              myPostsOnly: !!myPostsOnly,
              sort: sortInfo.sort,
              order: sortInfo.order,
              paginationBaseUrl: paginationBaseUrl
            })
          );
          connection.release();
        }
      );
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

  var bbsno = toValidNumber(req.body.bbsno); // 게시글 번호 검증
  var content = cleanText(req.body.content, 4000); // 댓글 내용 검증
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
        setFlash(req, 'success', '댓글이 등록되었습니다.');
        res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
      }
    );
  });
});

router.post('/wreply', function (req, res, next) {
  if (!requireLogin(req, res)) return;

  var bbsno = toValidNumber(req.body.bbsno); // 게시글 번호 검증
  var parentNo = toValidNumber(req.body.parent_no); // 부모 댓글 번호 검증
  var content = cleanText(req.body.content, 4000); // 답글 내용 검증
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
        setFlash(req, 'warning', '답글을 달 댓글을 찾을 수 없습니다.');
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
            setFlash(req, 'success', '답글이 등록되었습니다.');
            res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
          });
        }
      );
    });
  });
});

router.post('/wupdate', function (req, res, next) {
  if (!requireLogin(req, res)) return;

  var wno = toValidNumber(req.body.wno); // 댓글 번호 검증
  var bbsno = toValidNumber(req.body.bbsno); // 게시글 번호 검증
  var content = cleanText(req.body.content, 4000); // 댓글 내용 검증
  var writer = req.session.user.id;

  if (!wno || !bbsno || !content) {
    renderBadRequest(res, '댓글 수정값을 확인하세요.');
    return;
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    var sql =
      'UPDATE BBSW SET CONTENT = :content, UPDATEDATE = SYSDATE ' +
      'WHERE NO = :wno AND BBSNO = :bbsno AND WRITER = :writer AND OK = 1';

    connection.execute(
      sql,
      {
        content: content,
        wno: wno,
        bbsno: bbsno,
        writer: writer
      },
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
        setFlash(req, 'success', '댓글이 수정되었습니다.');
        res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
      }
    );
  });
});

router.post('/wdelete', function (req, res, next) {
  if (!requireLogin(req, res)) return;

  var wno = toValidNumber(req.body.wno); // 댓글 번호 검증
  var bbsno = toValidNumber(req.body.bbsno); // 게시글 번호 검증
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
      'WHERE NO = :wno AND BBSNO = :bbsno AND WRITER = :writer AND OK = 1';

    connection.execute(sql, { wno: wno, bbsno: bbsno, writer: writer }, function (err, result) {
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
      setFlash(req, 'success', '댓글이 삭제되었습니다.');
      res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
    });
  });
});

router.get('/download', function (req, res, next) {
  if (!requireLogin(req, res)) return;

  var fno = toValidNumber(req.query.fno); // 파일 번호 검증
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
      'SELECT F.ORG_FILENAME, F.SAVE_FILENAME, F.FILEPATH ' +
      'FROM BBS_FILE F ' +
      'JOIN BBS B ON B.NO = F.BBSNO ' +
      'WHERE F.NO = :fno ' +
      'AND F.OK = 1 ' +
      'AND B.OK = 1 ' +
      'AND (B.WRITER = :writer OR B.WRITER = :writerName)';

    connection.execute(
      sql,
      {
        fno: fno,
        writer: req.session.user.id,
        writerName: req.session.user.name || req.session.user.id
      },
      function (err, result) {
        if (err) {
          connection.release();
          console.error('err : ' + err);
          return next(err);
        }

        if (result.rows.length < 1) {
          connection.release();
          renderForbidden(res);
          return;
        }

        var row = result.rows[0];
        var orgName = path.basename(row[0] || 'download');
        var saveName = row[1];
        var storedRelativePath = (row[2] || '').replace(/\\/g, '/');
        var expectedRelativePath = path.join('uploads', 'bbs', path.basename(saveName || '')).replace(/\\/g, '/');
        var filePath = resolveStoredUploadPath(saveName);

        if (!filePath || storedRelativePath !== expectedRelativePath || !fs.existsSync(filePath)) {
          connection.release();
          renderForbidden(res);
          return;
        }

        connection.release();
        res.download(filePath, orgName, function (downloadErr) {
          if (downloadErr) {
            next(downloadErr);
          }
        });
      }
    );
  });
});

router.use(function (err, _req, res, next) {
  if (err.code !== 'EBADCSRFTOKEN') {
    return next(err);
  }

  res.status(403);
  res.send('CSRF token validation failed.');
});

module.exports = router;
