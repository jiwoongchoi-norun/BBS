var express = require('express');

function isValidReactionType(value) {
  // 댓글 추천 값은 DB 제약과 화면 버튼에서 사용하는 두 값만 허용한다.
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

  // 댓글 등록: 로그인 사용자 ID를 작성자로 사용하고 빈 내용은 차단한다.
  router.post('/wsave', async function (req, res, next) {
    if (!requireLogin(req, res)) return;

    var bbsno = toValidNumber(req.body.bbsno);
    var content = cleanText(req.body.content, 4000);
    var writer = req.session.user.id;

    if (!bbsno || !content) {
      renderBadRequest(res, '댓글 입력값을 확인하세요.');
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

      setFlash(req, 'success', '댓글이 등록되었습니다.');
      res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
    } catch (err) {
      console.error('err : ' + err);
      next(err);
    }
  });

  // 대댓글 등록: 부모 댓글 존재 여부를 확인한 뒤 depth와 child count를 함께 갱신한다.
  router.post('/wreply', async function (req, res, next) {
    if (!requireLogin(req, res)) return;

    var bbsno = toValidNumber(req.body.bbsno);
    var parentNo = toValidNumber(req.body.parent_no);
    var content = cleanText(req.body.content, 4000);
    var writer = req.session.user.id;

    if (!bbsno || !parentNo || !content) {
      renderBadRequest(res, '답글 입력값을 확인하세요.');
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

          // 대댓글 insert와 부모 댓글 CHILD_COUNT 증가는 같은 트랜잭션으로 처리한다.
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
        setFlash(req, 'warning', '답글 대상 댓글을 찾을 수 없습니다.');
        res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
        return;
      }

      setFlash(req, 'success', '답글이 등록되었습니다.');
      res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
    } catch (err) {
      console.error('err : ' + err);
      next(err);
    }
  });

  // 댓글 수정은 작성자 본인의 댓글에 대해서만 repository update가 성공한다.
  router.post('/wupdate', async function (req, res, next) {
    if (!requireLogin(req, res)) return;

    var wno = toValidNumber(req.body.wno);
    var bbsno = toValidNumber(req.body.bbsno);
    var content = cleanText(req.body.content, 4000);
    var writer = req.session.user.id;

    if (!wno || !bbsno || !content) {
      renderBadRequest(res, '댓글 수정값을 확인하세요.');
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

      setFlash(req, 'success', '댓글이 수정되었습니다.');
      res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
    } catch (err) {
      console.error('err : ' + err);
      next(err);
    }
  });

  // 댓글 삭제도 작성자 검사를 통과한 경우에만 soft delete 처리된다.
  router.post('/wdelete', async function (req, res, next) {
    if (!requireLogin(req, res)) return;

    var wno = toValidNumber(req.body.wno);
    var bbsno = toValidNumber(req.body.bbsno);
    var writer = req.session.user.id;

    if (!wno || !bbsno) {
      renderBadRequest(res, '댓글 번호가 올바르지 않습니다.');
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

      setFlash(req, 'success', '댓글이 삭제되었습니다.');
      res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
    } catch (err) {
      console.error('err : ' + err);
      next(err);
    }
  });

  // 댓글 추천/비추천은 같은 버튼 재클릭 취소, 반대 버튼 클릭 전환 방식이다.
  router.post('/wreaction', async function (req, res, next) {
    if (!requireLogin(req, res)) return;

    var bbsno = toValidNumber(req.body.bbsno);
    var wno = toValidNumber(req.body.wno);
    var reactionType = cleanText(req.body.reaction_type, 10).toUpperCase();
    var userId = req.session.user.id;

    if (!bbsno || !wno || !isValidReactionType(reactionType)) {
      renderBadRequest(res, '댓글 추천 입력값을 확인하세요.');
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

          // 같은 추천은 취소, 반대 추천은 변경, 첫 추천은 생성한다.
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
        renderBadRequest(res, '댓글 번호가 올바르지 않습니다.');
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
