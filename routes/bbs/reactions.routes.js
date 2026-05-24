var express = require('express');

function isValidReactionType(value) {
  return value === 'LIKE' || value === 'DISLIKE';
}

function createReactionsRouter(options) {
  var router = express.Router();
  var withConnection = options.withConnection;
  var reactionsRepository = options.reactionsRepository;
  var requireLogin = options.requireLogin;
  var renderBadRequest = options.renderBadRequest;
  var cleanText = options.cleanText;
  var toValidNumber = options.toValidNumber;
  var redirectReadWithoutViewCount = options.redirectReadWithoutViewCount;

  router.post('/reaction', async function (req, res, next) {
    if (!requireLogin(req, res)) return;

    var bbsno = toValidNumber(req.body.bbsno);
    var reactionType = cleanText(req.body.reaction_type, 10).toUpperCase();
    var userId = req.session.user.id;

    if (!bbsno || !isValidReactionType(reactionType)) {
      renderBadRequest(
        res,
        '\ucd94\ucc9c \uc785\ub825\uac12\uc744 \ud655\uc778\ud558\uc138\uc694.'
      );
      return;
    }

    try {
      var postExists = await withConnection(async function (connection) {
        try {
          var postSql = 'SELECT NO FROM BBS WHERE NO = :bbsno AND OK = 1';
          var postRows = await connection.execute(postSql, { bbsno: bbsno });

          if (postRows.rows.length < 1) {
            await connection.rollback();
            return false;
          }

          var reactionRows = await reactionsRepository.findReactionByUserAndPost(
            connection,
            bbsno,
            userId
          );
          var currentReaction = reactionRows.rows.length ? reactionRows.rows[0][0] : '';

          if (!currentReaction) {
            await reactionsRepository.createReaction(connection, bbsno, userId, reactionType);
          } else if (currentReaction === reactionType) {
            await reactionsRepository.deleteReaction(connection, bbsno, userId, reactionType);
          } else {
            await reactionsRepository.updateReaction(connection, bbsno, userId, reactionType);
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

      if (!postExists) {
        renderBadRequest(
          res,
          '\uac8c\uc2dc\uae00 \ubc88\ud638\uac00 \uc62c\ubc14\ub974\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.'
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

module.exports = createReactionsRouter;
