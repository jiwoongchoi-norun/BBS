var express = require('express');
var router = express.Router();
var crypto = require('crypto');

var withConnection = require('../db/oracle').withConnection;
var postsRepository = require('../db/repositories/posts.repository');
var commentsRepository = require('../db/repositories/comments.repository');
var reactionsRepository = require('../db/repositories/reactions.repository');
var categoriesRepository = require('../db/repositories/categories.repository');
var bookmarksRepository = require('../db/repositories/bookmarks.repository');
var reportsRepository = require('../db/repositories/reports.repository');
var usersRepository = require('../db/repositories/users.repository');
var asyncHandler = require('./asyncHandler');
var createAuthRouter = require('./bbs/auth.routes');
var createAdminRouter = require('./bbs/admin.routes');
var createBookmarksRouter = require('./bbs/bookmarks.routes');
var createCommentsRouter = require('./bbs/comments.routes');
var createFilesRouter = require('./bbs/files.routes');
var createProfileRouter = require('./bbs/profile.routes');
var createPostsReadRouter = require('./bbs/posts-read.routes');
var createPostsWriteRouter = require('./bbs/posts-write.routes');
var createReactionsRouter = require('./bbs/reactions.routes');
var createReportsRouter = require('./bbs/reports.routes');
var authMiddleware = require('./middleware/auth');
var requireLogin = authMiddleware.requireLogin;
var requireActiveUser = authMiddleware.requireActiveUser;
var requireAdmin = authMiddleware.requireAdmin;
var responseHelpers = require('./helpers/response');
var uploadHelpers = require('./helpers/upload');
var validationHelpers = require('./helpers/validation');
var csrfMiddleware = require('./middleware/csrf');
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
var csrfProtection = csrfMiddleware.csrfProtection;
var skipViewCountTokens = Object.create(null);

// 추천/댓글 처리 뒤 상세 페이지로 돌아올 때는 사용자가 글을 새로 읽은 것이 아니므로
// 일회성 토큰을 만들어 조회수 증가를 막는다.
function createSkipViewCountToken(bbsno) {
  var token = crypto.randomBytes(16).toString('hex');
  skipViewCountTokens[token] = bbsno;
  return token;
}

// 일반 글 읽기는 조회수를 올리고 좋아요/싫어요 이동은 조회수를 올리지 않는다.
// 토큰 또는 세션 플래그가 현재 게시글 번호와 맞을 때만 조회수 증가를 건너뛴다.
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
// redirect 전에 세션 저장을 보장해 다음 /read 요청에서 조회수 제외 플래그가 보이게 한다.
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

// 글쓰기/수정에서 공통으로 사용하는 제목/내용 검증이다.
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

router.use(
  asyncHandler(async function (req, res, next) {
    if (!req.session.user) {
      next();
      return;
    }

    await withConnection(async function (connection) {
      var result = await connection.execute(
        "SELECT NAME, ROLE, NVL(USER_STATUS, 'ACTIVE'), NVL(NICKNAME, NAME) FROM LOGIN WHERE ID = :id AND OK = 1",
        { id: req.session.user.id }
      );

      if (result.rows.length < 1) {
        req.session.user = null;
        next();
        return;
      }

      req.session.user.name = result.rows[0][0];
      req.session.user.role = result.rows[0][1] || 'USER';
      req.session.user.status = result.rows[0][2] || 'ACTIVE';
      req.session.user.nickname = result.rows[0][3] || result.rows[0][0];
      res.locals.currentUser = req.session.user;
      res.locals.isAdmin = req.session.user.role === 'ADMIN';
      next();
    });
  })
);

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
  createAdminRouter({
    withConnection: withConnection,
    postsRepository: postsRepository,
    commentsRepository: commentsRepository,
    categoriesRepository: categoriesRepository,
    reportsRepository: reportsRepository,
    usersRepository: usersRepository,
    asyncHandler: asyncHandler,
    requireAdmin: requireAdmin,
    renderBadRequest: renderBadRequest,
    cleanText: cleanText,
    toValidNumber: toValidNumber,
    setFlash: setFlash
  })
);

// URL은 기존 /bbs/... 형태를 유지하고, 책임만 기능별 라우터로 나눈다.
router.use(
  createPostsReadRouter({
    withConnection: withConnection,
    postsRepository: postsRepository,
    commentsRepository: commentsRepository,
    reactionsRepository: reactionsRepository,
    categoriesRepository: categoriesRepository,
    bookmarksRepository: bookmarksRepository,
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
    categoriesRepository: categoriesRepository,
    asyncHandler: asyncHandler,
    requireLogin: requireLogin,
    requireActiveUser: requireActiveUser,
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
    requireLogin: requireActiveUser,
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
    requireLogin: requireActiveUser,
    renderBadRequest: renderBadRequest,
    renderForbidden: renderForbidden,
    cleanText: cleanText,
    toValidNumber: toValidNumber,
    setFlash: setFlash,
    redirectReadWithoutViewCount: redirectReadWithoutViewCount
  })
);

router.use(
  createBookmarksRouter({
    withConnection: withConnection,
    bookmarksRepository: bookmarksRepository,
    asyncHandler: asyncHandler,
    requireLogin: requireLogin,
    requireActiveUser: requireActiveUser,
    renderBadRequest: renderBadRequest,
    toValidNumber: toValidNumber,
    setFlash: setFlash
  })
);

router.use(
  createReportsRouter({
    withConnection: withConnection,
    reportsRepository: reportsRepository,
    requireActiveUser: requireActiveUser,
    renderBadRequest: renderBadRequest,
    cleanText: cleanText,
    toValidNumber: toValidNumber,
    setFlash: setFlash
  })
);

router.use(
  createProfileRouter({
    withConnection: withConnection,
    usersRepository: usersRepository,
    asyncHandler: asyncHandler,
    renderBadRequest: renderBadRequest,
    cleanText: cleanText
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

module.exports = router;
