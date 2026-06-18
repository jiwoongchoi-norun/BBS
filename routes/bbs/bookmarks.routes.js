var express = require('express');

function createBookmarksRouter(options) {
  var router = express.Router();
  var withConnection = options.withConnection;
  var bookmarksRepository = options.bookmarksRepository;
  var asyncHandler = options.asyncHandler;
  var requireLogin = options.requireLogin;
  var requireActiveUser = options.requireActiveUser;
  var renderBadRequest = options.renderBadRequest;
  var toValidNumber = options.toValidNumber;
  var setFlash = options.setFlash;

  router.get(
    '/bookmarks',
    asyncHandler(async function (req, res) {
      if (!requireLogin(req, res)) return;

      await withConnection(async function (connection) {
        var rows = await bookmarksRepository.findBookmarksByUser(connection, req.session.user.id);
        res.render('bbs/bookmarks', { rows: rows.rows });
      });
    })
  );

  router.post('/bookmark', async function (req, res, next) {
    if (!requireActiveUser(req, res)) return;

    var bbsno = toValidNumber(req.body.bbsno);

    if (!bbsno) {
      renderBadRequest(res, '게시글 번호가 올바르지 않습니다.');
      return;
    }

    try {
      var result = await withConnection(async function (connection) {
        try {
          var currentRows = await bookmarksRepository.findBookmark(
            connection,
            bbsno,
            req.session.user.id
          );

          if (currentRows.rows.length) {
            await bookmarksRepository.deleteBookmark(connection, bbsno, req.session.user.id);
            await connection.commit();
            return { status: 'deleted' };
          }

          var insertResult = await bookmarksRepository.createBookmark(
            connection,
            bbsno,
            req.session.user.id
          );

          if (!insertResult.rowsAffected) {
            await connection.rollback();
            return { status: 'notFound' };
          }

          await connection.commit();
          return { status: 'created' };
        } catch (err) {
          try {
            await connection.rollback();
          } catch (rollbackErr) {
            console.error('rollback failed : ' + rollbackErr);
          }
          throw err;
        }
      });

      if (result.status === 'notFound') {
        renderBadRequest(res, '북마크할 수 없는 게시글입니다.');
        return;
      }

      setFlash(
        req,
        'success',
        result.status === 'created' ? '북마크에 추가했습니다.' : '북마크를 해제했습니다.'
      );
      res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
    } catch (err) {
      console.error('err : ' + err);
      next(err);
    }
  });

  return router;
}

module.exports = createBookmarksRouter;
