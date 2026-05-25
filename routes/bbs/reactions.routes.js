var express = require('express');

function isValidReactionType(value) {
  // 게시글 추천 값은 LIKE/DISLIKE만 허용해 잘못된 값이 DB에 들어가지 않게 한다.
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

  // 게시글 추천/비추천 처리. 로그인 사용자별로 게시글당 하나의 반응만 유지한다.
  router.post('/reaction', async function (req, res, next) {
    if (!requireLogin(req, res)) return;

    var bbsno = toValidNumber(req.body.bbsno);
    var reactionType = cleanText(req.body.reaction_type, 10).toUpperCase();
    var userId = req.session.user.id;

    if (!bbsno || !isValidReactionType(reactionType)) {
      renderBadRequest(res, '추천 입력값을 확인하세요.');
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

          // 같은 추천은 취소, 반대 추천은 변경, 첫 추천은 생성한다.
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
        renderBadRequest(res, '게시글 번호가 올바르지 않습니다.');
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
