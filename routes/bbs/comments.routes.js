var express = require('express');

function isValidReactionType(value) {
  return value === 'LIKE' || value === 'DISLIKE';
}

function createCommentsRouter(options) {
  var router = express.Router();
  var withConnection = options.withConnection;
  var commentsRepository = options.commentsRepository;
  var requireLogin = options.requireLogin;
  var renderBadRequest = options.renderBadRequest;
  var renderForbidden = options.renderForbidden;
  var cleanText = options.cleanText;
  var toValidNumber = options.toValidNumber;
  var setFlash = options.setFlash;
  var redirectReadWithoutViewCount = options.redirectReadWithoutViewCount;

  router.post('/wsave', async function (req, res, next) {
    if (!requireLogin(req, res)) return;

    var bbsno = toValidNumber(req.body.bbsno);
    var content = cleanText(req.body.content, 4000);
    var writer = req.session.user.id;

    if (!bbsno || !content) {
      renderBadRequest(
        res,
        '\ub313\uae00 \uc785\ub825\uac12\uc744 \ud655\uc778\ud558\uc138\uc694.'
      );
      return;
    }

    try {
      await withConnection(async function (connection) {
        try {
          await commentsRepository.createComment(connection, bbsno, writer, content);

          await connection.commit();
        } catch (err) {
          try {
            await connection.rollback();
          } catch (rollbackErr) {
            console.error('rollback failed : ' + rollbackErr);
          }
          throw err;
        }
      });

      setFlash(req, 'success', '\ub313\uae00\uc774 \ub4f1\ub85d\ub418\uc5c8\uc2b5\ub2c8\ub2e4.');
      res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
    } catch (err) {
      console.error('err : ' + err);
      next(err);
    }
  });

  router.post('/wreply', async function (req, res, next) {
    if (!requireLogin(req, res)) return;

    var bbsno = toValidNumber(req.body.bbsno);
    var parentNo = toValidNumber(req.body.parent_no);
    var content = cleanText(req.body.content, 4000);
    var writer = req.session.user.id;

    if (!bbsno || !parentNo || !content) {
      renderBadRequest(
        res,
        '\ub2f5\uae00 \uc785\ub825\uac12\uc744 \ud655\uc778\ud558\uc138\uc694.'
      );
      return;
    }

    try {
      var parentExists = await withConnection(async function (connection) {
        try {
          var parentRows = await commentsRepository.findCommentDepth(connection, parentNo, bbsno);

          if (parentRows.rows.length < 1) {
            await connection.rollback();
            return false;
          }

          var depth = parentRows.rows[0][0] + 1;
          await commentsRepository.createReply(connection, bbsno, parentNo, writer, content, depth);
          await commentsRepository.incrementChildCount(connection, parentNo);

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

      if (!parentExists) {
        setFlash(
          req,
          'warning',
          '\ub2f5\uae00 \ub300\uc0c1 \ub313\uae00\uc744 \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.'
        );
        res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
        return;
      }

      setFlash(req, 'success', '\ub2f5\uae00\uc774 \ub4f1\ub85d\ub418\uc5c8\uc2b5\ub2c8\ub2e4.');
      res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
    } catch (err) {
      console.error('err : ' + err);
      next(err);
    }
  });

  router.post('/wupdate', async function (req, res, next) {
    if (!requireLogin(req, res)) return;

    var wno = toValidNumber(req.body.wno);
    var bbsno = toValidNumber(req.body.bbsno);
    var content = cleanText(req.body.content, 4000);
    var writer = req.session.user.id;

    if (!wno || !bbsno || !content) {
      renderBadRequest(
        res,
        '\ub313\uae00 \uc218\uc815\uac12\uc744 \ud655\uc778\ud558\uc138\uc694.'
      );
      return;
    }

    try {
      var updateSucceeded = await withConnection(async function (connection) {
        try {
          var result = await commentsRepository.updateComment(
            connection,
            wno,
            bbsno,
            writer,
            content
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

      setFlash(req, 'success', '\ub313\uae00\uc774 \uc218\uc815\ub418\uc5c8\uc2b5\ub2c8\ub2e4.');
      res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
    } catch (err) {
      console.error('err : ' + err);
      next(err);
    }
  });

  router.post('/wdelete', async function (req, res, next) {
    if (!requireLogin(req, res)) return;

    var wno = toValidNumber(req.body.wno);
    var bbsno = toValidNumber(req.body.bbsno);
    var writer = req.session.user.id;

    if (!wno || !bbsno) {
      renderBadRequest(
        res,
        '\ub313\uae00 \ubc88\ud638\uac00 \uc62c\ubc14\ub974\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.'
      );
      return;
    }

    try {
      var deleteSucceeded = await withConnection(async function (connection) {
        try {
          var result = await commentsRepository.deleteComment(connection, wno, bbsno, writer);

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

      if (!deleteSucceeded) {
        renderForbidden(res);
        return;
      }

      setFlash(req, 'success', '\ub313\uae00\uc774 \uc0ad\uc81c\ub418\uc5c8\uc2b5\ub2c8\ub2e4.');
      res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
    } catch (err) {
      console.error('err : ' + err);
      next(err);
    }
  });

  router.post('/wreaction', async function (req, res, next) {
    if (!requireLogin(req, res)) return;

    var bbsno = toValidNumber(req.body.bbsno);
    var wno = toValidNumber(req.body.wno);
    var reactionType = cleanText(req.body.reaction_type, 10).toUpperCase();
    var userId = req.session.user.id;

    if (!bbsno || !wno || !isValidReactionType(reactionType)) {
      renderBadRequest(
        res,
        '\ub313\uae00 \ucd94\ucc9c \uc785\ub825\uac12\uc744 \ud655\uc778\ud558\uc138\uc694.'
      );
      return;
    }

    try {
      var commentExists = await withConnection(async function (connection) {
        try {
          var commentSql =
            'SELECT W.NO FROM BBSW W JOIN BBS B ON B.NO = W.BBSNO ' +
            'WHERE W.NO = :wno AND W.BBSNO = :bbsno AND W.OK = 1 AND B.OK = 1';
          var commentRows = await connection.execute(commentSql, { wno: wno, bbsno: bbsno });

          if (commentRows.rows.length < 1) {
            await connection.rollback();
            return false;
          }

          var reactionRows = await commentsRepository.findCommentReactionByUser(
            connection,
            wno,
            userId
          );
          var currentReaction = reactionRows.rows.length ? reactionRows.rows[0][0] : '';

          if (!currentReaction) {
            await commentsRepository.createCommentReaction(connection, wno, userId, reactionType);
          } else if (currentReaction === reactionType) {
            await commentsRepository.deleteCommentReaction(connection, wno, userId, reactionType);
          } else {
            await commentsRepository.updateCommentReaction(connection, wno, userId, reactionType);
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

      if (!commentExists) {
        renderBadRequest(
          res,
          '\ub313\uae00 \ubc88\ud638\uac00 \uc62c\ubc14\ub974\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.'
        );
        return;
      }

      redirectReadWithoutViewCount(req, res, next, bbsno);
    } catch (err) {
      console.error('err : ' + err);
      next(err);
    }
  });

  return router;
}

module.exports = createCommentsRouter;
