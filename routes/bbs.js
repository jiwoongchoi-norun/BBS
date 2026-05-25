var express = require('express');
var router = express.Router();
var oracledb = require('oracledb');
var crypto = require('crypto');
var csrf = require('csurf');
oracledb.autoCommit = true;

var withConnection = require('../db/oracle').withConnection;
var postsRepository = require('../db/repositories/posts.repository');
var commentsRepository = require('../db/repositories/comments.repository');
var reactionsRepository = require('../db/repositories/reactions.repository');
var asyncHandler = require('./asyncHandler');
var createAuthRouter = require('./bbs/auth.routes');
var createCommentsRouter = require('./bbs/comments.routes');
var createFilesRouter = require('./bbs/files.routes');
var createPostsReadRouter = require('./bbs/posts-read.routes');
var createPostsWriteRouter = require('./bbs/posts-write.routes');
var createReactionsRouter = require('./bbs/reactions.routes');
var requireLogin = require('./middleware/auth').requireLogin;
var responseHelpers = require('./helpers/response');
var uploadHelpers = require('./helpers/upload');
var validationHelpers = require('./helpers/validation');
var renderBadRequest = responseHelpers.renderBadRequest;
var renderForbidden = responseHelpers.renderForbidden;
var cleanText = validationHelpers.cleanText;
var toValidNumber = validationHelpers.toValidNumber;
var upload = uploadHelpers.upload;
var getUploadOriginalName = uploadHelpers.getUploadOriginalName;
var getUploadErrorMessage = uploadHelpers.getUploadErrorMessage;
var resolveStoredUploadPath = uploadHelpers.resolveStoredUploadPath;
var deleteStoredFile = uploadHelpers.deleteStoredFile;
var deleteStoredFiles = uploadHelpers.deleteStoredFiles;
var csrfProtection = csrf();
var skipViewCountTokens = Object.create(null);
function createSkipViewCountToken(bbsno) {
  var token = crypto.randomBytes(16).toString('hex');
  skipViewCountTokens[token] = bbsno;
  return token;
}

// 일반 글 읽기는 조회수를 올리고 좋아요/싫어요 이동은 조회수를 올리지 않는다.
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

// 기존 SHA-512 + salt 계정 검증용 해시 함수. 로그인 성공 후 bcrypt로 자동 전환한다.
function validatePostInput(title, content) {
  if (!title) return '제목을 입력해주세요.';
  if (!content) return '내용을 입력해주세요.';
  if (title.length > 200) return '제목은 200자 이하로 입력해주세요.';
  if (content.length > 4000) return '내용은 4000자 이하로 입력해주세요.';
  return '';
}

function setFlash(req, type, text) {
  if (req.flashMessage) {
    req.flashMessage(type, text);
  }
}

router.use(csrfProtection);

router.use(function (req, res, next) {
  res.locals.csrfToken = req.csrfToken();
  next();
});

router.get('/', function (req, res) {
  res.redirect('/bbs/list');
});

router.use(
  createAuthRouter({
    withConnection: withConnection,
    asyncHandler: asyncHandler,
    requireLogin: requireLogin,
    renderForbidden: renderForbidden,
    cleanText: cleanText,
    setFlash: setFlash
  })
);

router.use(
  createPostsReadRouter({
    withConnection: withConnection,
    postsRepository: postsRepository,
    commentsRepository: commentsRepository,
    reactionsRepository: reactionsRepository,
    asyncHandler: asyncHandler,
    renderBadRequest: renderBadRequest,
    cleanText: cleanText,
    toValidNumber: toValidNumber,
    shouldSkipViewCount: shouldSkipViewCount
  })
);

router.use(
  createPostsWriteRouter({
    withConnection: withConnection,
    postsRepository: postsRepository,
    asyncHandler: asyncHandler,
    requireLogin: requireLogin,
    renderBadRequest: renderBadRequest,
    renderForbidden: renderForbidden,
    cleanText: cleanText,
    toValidNumber: toValidNumber,
    validatePostInput: validatePostInput,
    setFlash: setFlash,
    upload: upload,
    getUploadOriginalName: getUploadOriginalName,
    getUploadErrorMessage: getUploadErrorMessage,
    deleteStoredFile: deleteStoredFile,
    deleteStoredFiles: deleteStoredFiles
  })
);

router.use(
  createReactionsRouter({
    withConnection: withConnection,
    reactionsRepository: reactionsRepository,
    requireLogin: requireLogin,
    renderBadRequest: renderBadRequest,
    cleanText: cleanText,
    toValidNumber: toValidNumber,
    redirectReadWithoutViewCount: redirectReadWithoutViewCount
  })
);

router.use(
  createCommentsRouter({
    withConnection: withConnection,
    commentsRepository: commentsRepository,
    requireLogin: requireLogin,
    renderBadRequest: renderBadRequest,
    renderForbidden: renderForbidden,
    cleanText: cleanText,
    toValidNumber: toValidNumber,
    setFlash: setFlash,
    redirectReadWithoutViewCount: redirectReadWithoutViewCount
  })
);

router.use(
  createFilesRouter({
    withConnection: withConnection,
    asyncHandler: asyncHandler,
    requireLogin: requireLogin,
    renderBadRequest: renderBadRequest,
    renderForbidden: renderForbidden,
    toValidNumber: toValidNumber,
    resolveStoredUploadPath: resolveStoredUploadPath
  })
);

router.use(function (err, _req, res, next) {
  if (err.code !== 'EBADCSRFTOKEN') {
    return next(err);
  }

  res.status(403);
  res.send('CSRF token validation failed.');
});

module.exports = router;
