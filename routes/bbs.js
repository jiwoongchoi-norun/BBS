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
      cb(new Error('?덉슜?섏? ?딅뒗 ?뚯씪 ?뺤떇?낅땲??'));
      return;
    }

    cb(null, true);
  }
});

// 湲?곌린, ?섏젙, ??젣泥섎읆 濡쒓렇?몄씠 ?꾩슂???붿껌?먯꽌 怨듯넻?쇰줈 ?ъ슜?섎뒗 ?몄쬆 媛??
function requireLogin(req, res) {
  if (!req.session.user) {
    if (req.flashMessage) {
      req.flashMessage('warning', '濡쒓렇?몄씠 ?꾩슂??湲곕뒫?낅땲??');
    }
    res.redirect('/bbs/login');
    return false;
  }
  return true;
}

// 異붿쿇 泥섎━ ??read ?붾㈃?쇰줈 ?뚯븘媛???議고쉶?섍? 利앷??섏? ?딅룄濡?1?뚯슜 ?좏겙??留뚮뱺??
function createSkipViewCountToken(bbsno) {
  var token = crypto.randomBytes(16).toString('hex');
  skipViewCountTokens[token] = bbsno;
  return token;
}

// ?쇰컲 湲 ?쎄린??議고쉶?섎? ?щ━怨? 醫뗭븘???レ뼱?????대? ?대룞? 議고쉶?섎? ?щ━吏 ?딅뒗??
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

// express-session ?????대컢 ?뚮Ц??由щ떎?대젆???꾩뿉 session.save瑜?紐낆떆?곸쑝濡??몄텧?쒕떎.
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

// 湲곗〈 SHA-512 + salt 怨꾩젙 寃利앹슜 ?댁떆 ?⑥닔. 濡쒓렇???깃났 ??bcrypt濡??먮룞 ?꾪솚?쒕떎.
function createPasswordHash(password, salt) {
  return crypto
    .createHash('sha512')
    .update(password + salt)
    .digest('base64');
}

function isBcryptPassword(algo, storedPassword) {
  return algo === 'bcrypt' || /^\$2[aby]\$/.test(storedPassword || '');
}

// ?좉퇋 媛?낃낵 ?뚯썝?뺣낫 ?섏젙? bcrypt留???ν븳??
function createBcryptPassword(password, callback) {
  bcrypt.hash(password, bcryptSaltRounds, callback);
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

  return Buffer.from(file.originalname, 'latin1').toString('utf8');
}

// 臾몄옄???낅젰媛믪쓣 trim?섍퀬 理쒕? 湲몄씠瑜??섏쑝硫?鍮?媛믪쑝濡?泥섎━?쒕떎.
function cleanText(value, maxLength) {
  var text = (value || '').trim();

  if (maxLength && text.length > maxLength) {
    return '';
  }

  return text;
}

// URL/query/body濡??ㅼ뼱???レ옄媛 ?묒쓽 ?뺤닔?몄? ?뺤씤?쒕떎.
function isValidNumber(value) {
  var numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0;
}

// ?좏슚?섏? ?딆? ?レ옄??null濡?諛붽퓭 ?쇱슦?곗뿉??bad request濡?泥섎━?섍쾶 ?쒕떎.
function toValidNumber(value) {
  return isValidNumber(value) ? Number(value) : null;
}

// ?대찓?쇱? ?좏깮 ?낅젰媛믪씠硫? 媛믪씠 ?덉쑝硫?湲곕낯 ?대찓???뺤떇留??덉슜?쒕떎.
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
  if (!title) return '?쒕ぉ???낅젰?댁＜?몄슂.';
  if (!content) return '?댁슜???낅젰?댁＜?몄슂.';
  if (title.length > 200) return '?쒕ぉ? 200???댄븯濡??낅젰?댁＜?몄슂.';
  if (content.length > 4000) return '?댁슜? 4000???댄븯濡??낅젰?댁＜?몄슂.';
  return '';
}

function validateAccountInput(id, email, phone, options) {
  options = options || {};

  if (!id) return '?꾩씠?붾? ?낅젰?댁＜?몄슂.';
  if (!isValidUserId(id)) return '?꾩씠?붾뒗 4~20?먯쓽 ?곷Ц, ?レ옄, 諛묒쨪(_)留??ъ슜?????덉뒿?덈떎.';
  if (options.emailRequired && !email) return '?대찓?쇱쓣 ?낅젰?댁＜?몄슂.';
  if (email && !isValidEmail(email)) return '?щ컮瑜??대찓???뺤떇?쇰줈 ?낅젰?댁＜?몄슂.';
  if (options.phoneRequired && !phone) return '?꾪솕踰덊샇瑜??낅젰?댁＜?몄슂.';
  if (phone && !isValidPhone(phone)) return '?꾪솕踰덊샇??010-1234-5678 ?뺤떇?쇰줈 ?낅젰?댁＜?몄슂.';
  return '';
}

// 沅뚰븳???녿뒗 ?붿껌?????怨듯넻 ?묐떟.
function renderForbidden(res) {
  res.status(403);
  res.send('沅뚰븳???놁뒿?덈떎.');
}

// ?섎せ???낅젰媛믪뿉 ???怨듯넻 ?묐떟.
function renderBadRequest(res, message) {
  res.status(400);
  res.send(message || '?섎せ???붿껌?낅땲??');
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
    setFlash(req, 'info', '?대? 濡쒓렇?몃릺???덉뒿?덈떎.');
    res.redirect('/bbs/list');
    return;
  }

  res.render('bbs/login', { errcode: 0 });
});

router.get('/find-id', function (req, res) {
  if (req.session.user) {
    setFlash(req, 'info', '?대? 濡쒓렇?몃릺???덉뒿?덈떎.');
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
      message: '媛?????낅젰???대쫫怨??대찓?쇱쓣 ?뺥솗???낅젰?댁＜?몄슂.'
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
        message: result.rows.length ? '' : '?쇱튂?섎뒗 ?뚯썝 ?뺣낫瑜?李얠? 紐삵뻽?듬땲??'
      });
    });
  });
});

router.post('/logincheck', function (req, res, next) {
  var pw = cleanText(req.body.password, 100);
  var code = 0;
  var id = cleanText(req.body.id, 50); // ?낅젰媛?寃利?  var pw = cleanText(req.body.password, 100); // ?낅젰媛?寃利?  var code = 0;

  if (!id || !pw || !isValidUserId(id)) {
    res.render('bbs/login', {
      errcode: 0,
      flashMessage: {
        type: 'warning',
        text: '?꾩씠?붿? 鍮꾨?踰덊샇瑜??낅젰?댁＜?몄슂.'
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
            text: '濡쒓렇???꾩씠?붽? ?놁뒿?덈떎.'
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
            text: '?덊눜 泥섎━??怨꾩젙?낅땲??'
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
        setFlash(req, 'success', '濡쒓렇?몃릺?덉뒿?덈떎.');
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
                text: '鍮꾨?踰덊샇媛 ?由쎈땲??'
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
            text: '鍮꾨?踰덊샇媛 ?由쎈땲??'
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
            text: '鍮꾨?踰덊샇媛 ?由쎈땲??'
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

  if (!password || confirmText !== '?덊눜') {
    setFlash(req, 'warning', '?뚯썝 ?덊눜 ?뺤씤 臾멸뎄? 鍮꾨?踰덊샇瑜??낅젰?댁＜?몄슂.');
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
        setFlash(req, 'danger', '鍮꾨?踰덊샇媛 ?쇱튂?섏? ?딆뒿?덈떎.');
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
    setFlash(req, 'info', '?대? 濡쒓렇?몃릺???덉뒿?덈떎.');
    res.redirect('/bbs/list');
    return;
  }

  res.render('bbs/signup', { code: 0, formData: {}, idCheckMessage: '', idCheckAvailable: null });
});

router.get('/check-id', function (req, res, next) {
  var id = cleanText(req.query.userId || req.query.id, 50);
  if (id && !isValidUserId(id)) {
    req.session.checkedSignupId = null;
    res.json({ available: false, message: '?꾩씠?붾뒗 4~20?먯쓽 ?곷Ц, ?レ옄, 諛묒쨪(_)留??ъ슜?????덉뒿?덈떎.' });
    return;
  }

  if (!id) {
    req.session.checkedSignupId = null;
    res.json({ available: false, message: '?꾩씠?붾? ?낅젰?댁＜?몄슂.' });
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
        message: available ? '?ъ슜 媛?ν븳 ?꾩씠?붿엯?덈떎.' : '?대? ?ъ슜 以묒씤 ?꾩씠?붿엯?덈떎.'
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

  function renderSignupMessage(message, available) {
    res.render('bbs/signup', {
      code: 0,
      formData: formData,
      idCheckMessage: message,
      idCheckAvailable: available
    });
  }

  if (pw1 != pw2) {
    code = 1;
    res.render('error', { errcode: code });
    return;
  }

  if (accountError || pw1 == '' || name == '' || pw1.length < 4) {
    renderSignupMessage(accountError || '鍮꾨?踰덊샇??4???댁긽, ?대쫫? ?꾩닔濡??낅젰?댁＜?몄슂.', false);
    return;
  }

  if (!idChecked || checkedId !== id || sessionCheckedId !== id) {
    renderSignupMessage('?꾩씠??以묐났?뺤씤???꾨즺?댁＜?몄슂.', false);
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
          renderSignupMessage('?대? ?ъ슜 以묒씤 ?꾩씠?붿엯?덈떎.', false);
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
            setFlash(req, 'success', '?뚯썝媛?낆씠 ?꾨즺?섏뿀?듬땲?? 濡쒓렇?명빐二쇱꽭??');
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
        // 鍮꾨?踰덊샇 ?댁떆媛 ?붾㈃???ㅼ떆 ?몄텧?섏? ?딅룄濡?鍮?媛믪쑝濡??섍릿??
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
  var id = cleanText(req.body.id, 50); // ?낅젰媛?寃利?  var pw = cleanText(req.body.pw1, 100); // ?낅젰媛?寃利?  var name = cleanText(req.body.name, 100); // ?낅젰媛?寃利?  var email = cleanText(req.body.email, 200); // ?낅젰媛?寃利?  var pw2 = cleanText(req.body.pw2, 100); // ?낅젰媛?寃利?
  if (!requireLogin(req, res)) return;

  if (pw != pw2) {
    res.render('bbs/updatesignform', {
      rows: [[id, '', name, email]],
      flashMessage: { type: 'warning', text: '鍮꾨?踰덊샇 ?뺤씤???쇱튂?섏? ?딆뒿?덈떎.' }
    });
    return;
  }

  var updateAccountError = validateAccountInput(id, email, '', { emailRequired: true });
  if (updateAccountError || pw == '' || name == '' || pw.length < 4) {
    return res.render('bbs/updatesignform', {
      rows: [[id, '', name, email]],
      flashMessage: {
        type: 'warning',
        text: updateAccountError || '鍮꾨?踰덊샇??4???댁긽, ?대쫫? ?꾩닔濡??낅젰?댁＜?몄슂.'
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
          setFlash(req, 'success', '?뚯썝?뺣낫媛 ?섏젙?섏뿀?듬땲??');
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
    // soft delete??湲? 紐⑸줉?먯꽌 ?쒖쇅?섍퀬 理쒖떊 湲??癒쇱? 蹂댁씠?꾨줉 ?뺣젹?쒕떎.
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
      return next(uploadErr);
    }

    var content = cleanText(req.body.brdmemo, 4000);
    var title = cleanText(req.body.brdtitle, 200); // ?낅젰媛?寃利?    var content = cleanText(req.body.brdmemo, 4000);
    var writer = req.session.user.name || req.session.user.id;
    var postError = validatePostInput(title, content);

    if (postError || !writer) {
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
              setFlash(req, 'success', '寃뚯떆湲???깅줉?섏뿀?듬땲??');
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
                setFlash(req, 'success', '寃뚯떆湲怨?泥⑤??뚯씪???깅줉?섏뿀?듬땲??');
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
  var brdno = toValidNumber(req.query.brdno); // 寃뚯떆湲 踰덊샇 寃利?
  if (!brdno) {
    renderBadRequest(res, '寃뚯떆湲 踰덊샇媛 ?щ컮瑜댁? ?딆뒿?덈떎.');
    return;
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    var skipViewCount = shouldSkipViewCount(req, brdno);

    // read ?붾㈃? ?곸꽭 議고쉶, 議고쉶??利앷?, ?볤?/?뚯씪/??異붿쿇 ?곹깭 議고쉶瑜???踰덉뿉 泥섎━?쒕떎.
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

    // ?ㅼ젣 DELETE ????곹깭媛믩쭔 ?대젮 怨쇱젣 ?먮쫫??留욌뒗 soft delete瑜??좎??쒕떎.
    var bbsno = toValidNumber(req.query.brdno); // 寃뚯떆湲 踰덊샇 寃利?    var writer = req.session.user.id;
    var writerName = req.session.user.name || req.session.user.id;

    if (!bbsno) {
      connection.release();
      renderBadRequest(res, '寃뚯떆湲 踰덊샇媛 ?щ컮瑜댁? ?딆뒿?덈떎.');
      return;
    }

    var sql = 'UPDATE BBS SET OK = 0 WHERE NO = :bbsno AND (WRITER = :writer OR WRITER = :writerName)';

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
        setFlash(req, 'success', '寃뚯떆湲????젣?섏뿀?듬땲??');
        res.redirect('/bbs/list');
      });
    });
  });
});

router.get('/update', function (req, res, next) {
  if (!requireLogin(req, res)) return;
  var brdno = toValidNumber(req.query.brdno); // 寃뚯떆湲 踰덊샇 寃利?
  if (!brdno) {
    renderBadRequest(res, '寃뚯떆湲 踰덊샇媛 ?щ컮瑜댁? ?딆뒿?덈떎.');
    return;
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    // ?섏젙 ?붾㈃? ??젣?섏? ?딆? ?쒖꽦 湲留???곸쑝濡??쒗븳?쒕떎.
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
  var brdno = toValidNumber(req.body.brdno); // 寃뚯떆湲 踰덊샇 寃利?  var title = cleanText(req.body.brdtitle, 200); // ?낅젰媛?寃利?  var content = cleanText(req.body.brdmemo, 4000); // ?낅젰媛?寃利?  var writer = req.session.user.id;
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
        setFlash(req, 'success', '寃뚯떆湲???섏젙?섏뿀?듬땲??');
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
  var searchKeyword = cleanText(req.query.search, 200); // 寃?됱뼱 湲몄씠 寃利?  var myPostsOnly = req.query.mine === '1' && req.session.user;

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
      // ?쒕ぉ+?댁슜 寃?됱? OR 議곌굔??愿꾪샇濡?臾띠뼱 OK=1 議곌굔怨??④퍡 ?곸슜?쒕떎.

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
    renderBadRequest(res, '異붿쿇 ?낅젰媛믪쓣 ?뺤씤?섏꽭??');
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
        renderBadRequest(res, '寃뚯떆湲 踰덊샇媛 ?щ컮瑜댁? ?딆뒿?덈떎.');
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

        // 湲곕줉???놁쑝硫???異붿쿇??異붽??섍퀬 寃뚯떆湲 移댁슫?곕? 利앷??쒗궓??
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

        // 媛숈? 踰꾪듉???ㅼ떆 ?꾨Ⅴ硫?異붿쿇 湲곕줉????젣?섍퀬 移댁슫?곕? ?섎룎由곕떎.
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

        // 諛섎? 踰꾪듉???꾨Ⅴ硫?湲곕줉? 媛깆떊?섍퀬 湲곗〈 移댁슫?곗? ??移댁슫?곕? ?숈떆??蹂댁젙?쒕떎.
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

  var bbsno = toValidNumber(req.body.bbsno); // 寃뚯떆湲 踰덊샇 寃利?  var content = cleanText(req.body.content, 4000); // ?볤? ?댁슜 寃利?  var writer = req.session.user.id;

  if (!bbsno || !content) {
    renderBadRequest(res, '?볤? ?낅젰媛믪쓣 ?뺤씤?섏꽭??');
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
        setFlash(req, 'success', '?볤????깅줉?섏뿀?듬땲??');
        res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
      }
    );
  });
});

router.post('/wreply', function (req, res, next) {
  if (!requireLogin(req, res)) return;

  var bbsno = toValidNumber(req.body.bbsno); // 寃뚯떆湲 踰덊샇 寃利?  var parentNo = toValidNumber(req.body.parent_no); // 遺紐??볤? 踰덊샇 寃利?  var content = cleanText(req.body.content, 4000); // ?듦? ?댁슜 寃利?  var writer = req.session.user.id;

  if (!bbsno || !parentNo || !content) {
    renderBadRequest(res, '?듦? ?낅젰媛믪쓣 ?뺤씤?섏꽭??');
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
        setFlash(req, 'warning', '?듦??????볤???李얠쓣 ???놁뒿?덈떎.');
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
            setFlash(req, 'success', '?듦????깅줉?섏뿀?듬땲??');
            res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
          });
        }
      );
    });
  });
});

router.post('/wupdate', function (req, res, next) {
  if (!requireLogin(req, res)) return;

  var wno = toValidNumber(req.body.wno); // ?볤? 踰덊샇 寃利?  var bbsno = toValidNumber(req.body.bbsno); // 寃뚯떆湲 踰덊샇 寃利?  var content = cleanText(req.body.content, 4000); // ?볤? ?댁슜 寃利?  var writer = req.session.user.id;

  if (!wno || !bbsno || !content) {
    renderBadRequest(res, '?볤? ?섏젙媛믪쓣 ?뺤씤?섏꽭??');
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
        setFlash(req, 'success', '?볤????섏젙?섏뿀?듬땲??');
        res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
      }
    );
  });
});

router.post('/wdelete', function (req, res, next) {
  if (!requireLogin(req, res)) return;

  var wno = toValidNumber(req.body.wno); // ?볤? 踰덊샇 寃利?  var bbsno = toValidNumber(req.body.bbsno); // 寃뚯떆湲 踰덊샇 寃利?  var writer = req.session.user.id;

  if (!wno || !bbsno) {
    renderBadRequest(res, '?볤? 踰덊샇媛 ?щ컮瑜댁? ?딆뒿?덈떎.');
    return;
  }

  oracledb.getConnection(dbconfig, function (err, connection) {
    if (err) {
      console.error('err : ' + err);
      return next(err);
    }

    var sql =
      "UPDATE BBSW SET OK = 0, CONTENT = '??젣???볤??낅땲??', UPDATEDATE = SYSDATE " +
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
      setFlash(req, 'success', '?볤?????젣?섏뿀?듬땲??');
      res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
    });
  });
});

router.get('/download', function (req, res, next) {
  if (!requireLogin(req, res)) return;

  var fno = toValidNumber(req.query.fno); // ?뚯씪 踰덊샇 寃利?
  if (!fno) {
    renderBadRequest(res, '?뚯씪 踰덊샇媛 ?щ컮瑜댁? ?딆뒿?덈떎.');
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
        var orgName = row[0];
        var saveName = row[1];
        var filePath = path.resolve(uploadDir, saveName);
        var uploadRoot = path.resolve(uploadDir);

        if (filePath.indexOf(uploadRoot + path.sep) !== 0 || !fs.existsSync(filePath)) {
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
