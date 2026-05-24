var express = require('express');
var crypto = require('crypto');
var bcrypt = require('bcrypt');

var bcryptSaltRounds = 12;

function createPasswordHash(password, salt) {
  return crypto
    .createHash('sha512')
    .update(password + salt)
    .digest('base64');
}

function isBcryptPassword(algo, storedPassword) {
  return algo === 'bcrypt' || /^\$2[aby]\$/.test(storedPassword || '');
}

// 신규 가입과 회원정보 수정은 bcrypt만 사용한다.
function createBcryptPassword(password, callback) {
  bcrypt.hash(password, bcryptSaltRounds, callback);
}

function createResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

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

function createAuthRouter(options) {
  var router = express.Router();
  var withConnection = options.withConnection;
  var asyncHandler = options.asyncHandler;
  var requireLogin = options.requireLogin;
  var renderForbidden = options.renderForbidden;
  var cleanText = options.cleanText;
  var setFlash = options.setFlash;

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

  router.post('/find-id', async function (req, res, next) {
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

    try {
      var result = await withConnection(async function (connection) {
        var sql = 'SELECT ID FROM LOGIN WHERE NAME = :name AND EMAIL = :email AND OK = 1';

        return connection.execute(sql, { name: name, email: email });
      });

      res.render('bbs/findid', {
        formData: formData,
        foundId: result.rows.length ? result.rows[0][0] : '',
        message: result.rows.length ? '' : '일치하는 회원 정보를 찾을 수 없습니다.'
      });
    } catch (err) {
      console.error('err : ' + err);
      return next(err);
    }
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

  router.post('/reset-password/request', async function (req, res, next) {
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

    try {
      var resetRequestResult = await withConnection(async function (connection) {
        var findSql = 'SELECT ID FROM LOGIN WHERE ID = :id AND EMAIL = :email AND OK = 1';
        var result = await connection.execute(findSql, { id: id, email: email });

        if (result.rows.length < 1) {
          return { success: false };
        }

        var token = createResetToken();
        var disableOldSql =
          'UPDATE RESET_TOKEN SET USED = 1, USEDATE = SYSDATE WHERE USER_ID = :id AND USED = 0';
        var insertSql =
          'INSERT INTO RESET_TOKEN(NO, USER_ID, TOKEN, EXPIRES_AT) ' +
          "VALUES(RESET_TOKEN_SEQ.NEXTVAL, :id, :token, SYSDATE + INTERVAL '1' HOUR)";

        try {
          await connection.execute(disableOldSql, { id: id }, { autoCommit: false });

          var insertResult = await connection.execute(
            insertSql,
            { id: id, token: token },
            { autoCommit: false }
          );

          if (!insertResult.rowsAffected) {
            throw new Error('password reset token insert affected no rows');
          }

          await connection.commit();
          return { success: true, token: token };
        } catch (err) {
          try {
            await connection.rollback();
          } catch (rollbackErr) {
            console.error('rollback failed : ' + rollbackErr);
          }
          throw err;
        }
      });

      if (!resetRequestResult.success) {
        renderRequest('일치하는 활성 계정을 찾을 수 없습니다.', '');
        return;
      }

      renderRequest(
        '비밀번호 재설정 토큰이 생성되었습니다. 실제 이메일 발송은 과제 범위에서 제외했습니다.',
        '/bbs/reset-password/confirm?token=' + encodeURIComponent(resetRequestResult.token)
      );
    } catch (err) {
      console.error('err : ' + err);
      next(err);
    }
  });

  router.get(
    '/reset-password/confirm',
    asyncHandler(async function (req, res) {
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

      await withConnection(async function (connection) {
        var sql =
          'SELECT R.USER_ID FROM RESET_TOKEN R JOIN LOGIN L ON L.ID = R.USER_ID ' +
          'WHERE R.TOKEN = :token AND R.USED = 0 AND R.EXPIRES_AT > SYSDATE AND L.OK = 1';

        var result = await connection.execute(sql, { token: token });

        renderConfirm(
          result.rows.length > 0,
          result.rows.length > 0 ? '' : '토큰이 없거나 만료되었습니다.'
        );
      });
    })
  );

  router.post('/reset-password/confirm', async function (req, res, next) {
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

    try {
      var hashPassword = await new Promise(function (resolve, reject) {
        createBcryptPassword(pw1, function (err, passwordHash) {
          if (err) {
            reject(err);
            return;
          }
          resolve(passwordHash);
        });
      });

      var resetSucceeded = await withConnection(async function (connection) {
        try {
          var findSql =
            'SELECT R.USER_ID FROM RESET_TOKEN R JOIN LOGIN L ON L.ID = R.USER_ID ' +
            'WHERE R.TOKEN = :token AND R.USED = 0 AND R.EXPIRES_AT > SYSDATE AND L.OK = 1';

          var result = await connection.execute(findSql, { token: token });

          if (result.rows.length < 1) {
            await connection.rollback();
            return false;
          }

          var userId = result.rows[0][0];
          var updatePasswordSql =
            "UPDATE LOGIN SET PASSWORD = :password, SALT = NULL, PASSWORD_ALGO = 'bcrypt', PASSWORD_UPDATED_AT = SYSDATE " +
            'WHERE ID = :id';

          var passwordResult = await connection.execute(
            updatePasswordSql,
            { password: hashPassword, id: userId },
            { autoCommit: false }
          );

          if (!passwordResult.rowsAffected) {
            throw new Error('password reset update affected no rows');
          }

          var useTokenSql =
            'UPDATE RESET_TOKEN SET USED = 1, USEDATE = SYSDATE WHERE TOKEN = :token';
          var tokenResult = await connection.execute(
            useTokenSql,
            { token: token },
            { autoCommit: false }
          );

          if (!tokenResult.rowsAffected) {
            throw new Error('password reset token update affected no rows');
          }

          await connection.commit();
          return true;
        } catch (err) {
          try {
            await connection.rollback();
          } catch (rollbackErr) {
            console.error('rollback failed : ' + rollbackErr);
          }
          throw err;
        }
      });

      if (!resetSucceeded) {
        renderConfirm(false, '토큰이 없거나 만료되었습니다.');
        return;
      }

      setFlash(req, 'success', '비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요.');
      res.redirect('/bbs/login');
    } catch (err) {
      console.error('err : ' + err);
      next(err);
    }
  });

  router.post('/logincheck', async function (req, res, next) {
    var pw = cleanText(req.body.password, 100);
    var id = cleanText(req.body.id, 50); // 입력값 검증
    var loginFailureMessage = '아이디 또는 비밀번호가 올바르지 않습니다.';

    function renderLoginFailure(errcode, message, type) {
      res.render('bbs/login', {
        errcode: errcode,
        flashMessage: {
          type: type || 'danger',
          text: message
        }
      });
    }

    if (!id || !pw || !isValidUserId(id)) {
      renderLoginFailure(0, '아이디와 비밀번호를 입력해주세요.', 'warning');
      return;
    }

    try {
      var loginResult = await withConnection(async function (connection) {
        var sql = 'SELECT OK, PASSWORD, SALT, PASSWORD_ALGO, NAME FROM LOGIN WHERE ID = :id';
        var result = await connection.execute(sql, { id: id });

        if (result.rows.length < 1) {
          console.log('login id not found.');
          return { success: false, code: 1, message: loginFailureMessage };
        }

        var storedPassword = result.rows[0][1];
        var storedSalt = result.rows[0][2];
        var storedAlgo = result.rows[0][3] || 'sha512';
        var userName = result.rows[0][4];
        var isActiveUser = result.rows[0][0] === 1;

        if (!isActiveUser) {
          return { success: false, code: 1, message: '탈퇴 처리된 계정입니다.' };
        }

        if (isBcryptPassword(storedAlgo, storedPassword)) {
          var isMatch = await bcrypt.compare(pw, storedPassword);

          if (!isMatch) {
            console.log('password mismatch.');
            return { success: false, code: 2, message: loginFailureMessage };
          }

          return { success: true, userName: userName };
        }

        if (!storedSalt) {
          console.log('password salt missing.');
          return { success: false, code: 2, message: loginFailureMessage };
        }

        var inputHashPassword = createPasswordHash(pw, storedSalt);

        if (storedPassword != inputHashPassword) {
          console.log('password mismatch.');
          return { success: false, code: 2, message: loginFailureMessage };
        }

        var bcryptPassword = await new Promise(function (resolve, reject) {
          createBcryptPassword(pw, function (err, hashPassword) {
            if (err) {
              reject(err);
              return;
            }
            resolve(hashPassword);
          });
        });

        try {
          var migrateSql =
            "UPDATE LOGIN SET PASSWORD = :password, SALT = NULL, PASSWORD_ALGO = 'bcrypt', PASSWORD_UPDATED_AT = SYSDATE " +
            'WHERE ID = :id';

          await connection.execute(
            migrateSql,
            { password: bcryptPassword, id: id },
            { autoCommit: false }
          );
          await connection.commit();
        } catch (err) {
          try {
            await connection.rollback();
          } catch (rollbackErr) {
            console.error('rollback failed : ' + rollbackErr);
          }
          throw err;
        }

        return { success: true, userName: userName };
      });

      if (!loginResult.success) {
        renderLoginFailure(loginResult.code, loginResult.message);
        return;
      }

      if (req.session.user) {
        console.log('already logged in.');
      } else {
        console.log('new session created.');
        req.session.user = {
          id: id,
          name: loginResult.userName,
          authorized: true
        };
      }

      setFlash(req, 'success', '로그인되었습니다.');
      res.redirect('/bbs/list');
    } catch (err) {
      console.error('err : ' + err);
      next(err);
    }
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

  router.get(
    '/myinfo',
    asyncHandler(async function (req, res) {
      if (!requireLogin(req, res)) return;

      await withConnection(async function (connection) {
        var sql =
          'SELECT ID, NAME, PHONE, ' +
          "TO_CHAR(PASSWORD_UPDATED_AT, 'yyyy-mm-dd') AS PASSWORD_UPDATED_AT " +
          'FROM LOGIN WHERE ID = :id AND OK = 1';

        var result = await connection.execute(sql, { id: req.session.user.id });

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
    })
  );

  router.post('/withdraw', async function (req, res, next) {
    if (!requireLogin(req, res)) return;

    var password = cleanText(req.body.password, 100);
    var confirmText = cleanText(req.body.confirmText, 20);
    var userId = req.session.user.id;

    if (!password || confirmText !== '탈퇴') {
      setFlash(req, 'warning', '회원 탈퇴 확인 문구와 비밀번호를 입력해주세요.');
      res.redirect('/bbs/myinfo');
      return;
    }

    try {
      var withdrawResult = await withConnection(async function (connection) {
        var sql = 'SELECT PASSWORD, SALT, PASSWORD_ALGO FROM LOGIN WHERE ID = :id AND OK = 1';
        var result = await connection.execute(sql, { id: userId });

        if (result.rows.length < 1) {
          return { status: 'notFound' };
        }

        var storedPassword = result.rows[0][0];
        var storedSalt = result.rows[0][1];
        var storedAlgo = result.rows[0][2] || 'sha512';
        var isPasswordMatch = false;

        if (isBcryptPassword(storedAlgo, storedPassword)) {
          isPasswordMatch = await bcrypt.compare(password, storedPassword);
        } else if (storedSalt) {
          isPasswordMatch = createPasswordHash(password, storedSalt) === storedPassword;
        }

        if (!isPasswordMatch) {
          return { status: 'wrongPassword' };
        }

        try {
          var updateSql = 'UPDATE LOGIN SET OK = 0 WHERE ID = :id AND OK = 1';
          var updateResult = await connection.execute(
            updateSql,
            { id: userId },
            { autoCommit: false }
          );

          if (!updateResult.rowsAffected) {
            await connection.rollback();
            return { status: 'notFound' };
          }

          await connection.commit();
          return { status: 'success' };
        } catch (err) {
          try {
            await connection.rollback();
          } catch (rollbackErr) {
            console.error('rollback failed : ' + rollbackErr);
          }
          throw err;
        }
      });

      if (withdrawResult.status === 'wrongPassword') {
        setFlash(req, 'danger', '비밀번호가 일치하지 않습니다.');
        res.redirect('/bbs/myinfo');
        return;
      }

      if (withdrawResult.status === 'notFound') {
        req.session.destroy(function () {
          res.redirect('/bbs/login');
        });
        return;
      }

      req.session.destroy(function () {
        res.redirect('/bbs/list');
      });
    } catch (err) {
      console.error('err : ' + err);
      next(err);
    }
  });

  router.get('/signup', function (req, res) {
    if (req.session.user) {
      setFlash(req, 'info', '이미 로그인되어 있습니다.');
      res.redirect('/bbs/list');
      return;
    }

    res.render('bbs/signup', { code: 0, formData: {}, idCheckMessage: '', idCheckAvailable: null });
  });

  router.get(
    '/check-id',
    asyncHandler(async function (req, res) {
      var id = cleanText(req.query.userId || req.query.id, 50);
      if (id && !isValidUserId(id)) {
        req.session.checkedSignupId = null;
        res.json({
          available: false,
          message: '아이디는 4~20자의 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.'
        });
        return;
      }

      if (!id) {
        req.session.checkedSignupId = null;
        res.json({ available: false, message: '아이디를 입력해주세요.' });
        return;
      }

      var result = await withConnection(async function (connection) {
        return connection.execute('SELECT COUNT(*) FROM LOGIN WHERE ID = :id', { id: id });
      });

      var available = result.rows[0][0] === 0;
      req.session.checkedSignupId = available ? id : null;
      res.json({
        available: available,
        message: available ? '사용 가능한 아이디입니다.' : '이미 사용 중인 아이디입니다.'
      });
    })
  );

  router.post('/signupsave', async function (req, res) {
    var id = cleanText(req.body.id, 50);
    var pw1 = cleanText(req.body.pw1, 100);
    var pw2 = cleanText(req.body.pw2, 100);
    var name = cleanText(req.body.name, 100);
    var email = cleanText(req.body.email, 200);
    var phone = cleanText(req.body.phone, 30);
    var idChecked = req.body.idChecked === 'Y';
    var checkedId = cleanText(req.body.checkedId, 50);
    var sessionCheckedId = req.session.checkedSignupId;
    var formData = { id: id, name: name, email: email, phone: phone };
    var accountError = validateAccountInput(id, email, phone, {
      emailRequired: true,
      phoneRequired: true
    });
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

    try {
      var hashPassword = await new Promise(function (resolve, reject) {
        createBcryptPassword(pw1, function (err, passwordHash) {
          if (err) {
            reject(err);
            return;
          }
          resolve(passwordHash);
        });
      });

      var signupResult = await withConnection(async function (connection) {
        var countResult = await connection.execute('SELECT COUNT(*) FROM LOGIN WHERE ID = :id', {
          id: id
        });

        if (countResult.rows[0][0] > 0) {
          return { success: false, duplicate: true };
        }

        try {
          await connection.execute(
            sql,
            {
              id: id,
              password: hashPassword,
              name: name,
              email: email,
              phone: phone
            },
            { autoCommit: false }
          );

          await connection.commit();
          return { success: true };
        } catch (err) {
          try {
            await connection.rollback();
          } catch (rollbackErr) {
            console.error('rollback failed : ' + rollbackErr);
          }
          throw err;
        }
      });

      if (!signupResult.success && signupResult.duplicate) {
        req.session.checkedSignupId = null;
        renderSignupMessage('이미 사용 중인 아이디입니다.', false);
        return;
      }

      req.session.checkedSignupId = null;
      setFlash(req, 'success', '회원가입이 완료되었습니다. 로그인해주세요.');
      res.redirect('/bbs/login');
    } catch (err) {
      console.error('err : ' + err);
      res.render('error', { errcode: 3 });
    }
  });

  router.post('/signupsave-old', function (req, res) {
    setFlash(req, 'warning', '이전 회원가입 경로는 더 이상 사용하지 않습니다.');
    res.redirect('/bbs/signup');
  });

  router.get(
    '/updatesignup',
    asyncHandler(async function (req, res) {
      if (req.session.user) {
        await withConnection(async function (connection) {
          var sql = 'SELECT ID, NAME, EMAIL FROM LOGIN WHERE ID = :id';
          var result = await connection.execute(sql, { id: req.session.user.id });

          if (result.rows.length < 1) {
            return res.redirect('/bbs/login');
          }

          var row = result.rows[0];
          // 비밀번호 해시가 화면에 다시 출력되지 않도록 빈 값으로 넘긴다.
          res.render('bbs/updatesignform', { rows: [[row[0], '', row[1], row[2]]] });
        });
      } else {
        res.redirect('/bbs/login');
      }
    })
  );

  router.post('/updatesignsave', async function (req, res, next) {
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
    var sql =
      "UPDATE LOGIN SET ID = :id, PASSWORD = :password, NAME = :name, EMAIL = :email, SALT = NULL, PASSWORD_ALGO = 'bcrypt', PASSWORD_UPDATED_AT = SYSDATE WHERE ID = :oldId";

    try {
      var hashPassword = await new Promise(function (resolve, reject) {
        createBcryptPassword(pw, function (err, passwordHash) {
          if (err) {
            reject(err);
            return;
          }
          resolve(passwordHash);
        });
      });

      var updateSucceeded = await withConnection(async function (connection) {
        try {
          var result = await connection.execute(
            sql,
            {
              id: id,
              password: hashPassword,
              name: name,
              email: email,
              oldId: oldId
            },
            { autoCommit: false }
          );

          if (!result.rowsAffected) {
            await connection.rollback();
            return false;
          }

          await connection.commit();
          return true;
        } catch (err) {
          try {
            await connection.rollback();
          } catch (rollbackErr) {
            console.error('rollback failed : ' + rollbackErr);
          }
          throw err;
        }
      });

      if (!updateSucceeded) {
        renderForbidden(res);
        return;
      }

      req.session.user.id = id;
      req.session.user.name = name;
      setFlash(req, 'success', '회원정보가 수정되었습니다.');
      res.redirect('/bbs/list');
    } catch (err) {
      console.error('err : ' + err);
      next(err);
    }
  });

  return router;
}

module.exports = createAuthRouter;
