var express = require('express');

function isValidTargetType(value) {
  return value === 'POST' || value === 'COMMENT';
}

function isValidReasonCode(value) {
  return ['SPAM', 'ABUSE', 'ILLEGAL', 'ETC'].indexOf(value) >= 0;
}

function createReportsRouter(options) {
  var router = express.Router();
  var withConnection = options.withConnection;
  var reportsRepository = options.reportsRepository;
  var requireActiveUser = options.requireActiveUser;
  var renderBadRequest = options.renderBadRequest;
  var cleanText = options.cleanText;
  var toValidNumber = options.toValidNumber;
  var setFlash = options.setFlash;

  router.post('/report', async function (req, res, next) {
    if (!requireActiveUser(req, res)) return;

    var targetType = cleanText(req.body.target_type, 20).toUpperCase();
    var targetId = toValidNumber(req.body.target_id);
    var reasonCode = cleanText(req.body.reason_code, 20).toUpperCase();
    var reasonText = cleanText(req.body.reason_text, 1000);
    var bbsno = toValidNumber(req.body.bbsno);

    if (!isValidTargetType(targetType) || !targetId || !isValidReasonCode(reasonCode)) {
      renderBadRequest(res, '신고 입력값을 확인하세요.');
      return;
    }

    try {
      var reportResult = await withConnection(async function (connection) {
        try {
          var targetSql =
            targetType === 'POST'
              ? 'SELECT NO FROM BBS WHERE NO = :targetId AND OK = 1 AND NVL(ADMIN_HIDDEN, 0) = 0'
              : 'SELECT W.NO FROM BBSW W JOIN BBS B ON B.NO = W.BBSNO WHERE W.NO = :targetId AND W.OK = 1 AND B.OK = 1 AND NVL(W.ADMIN_HIDDEN, 0) = 0 AND NVL(B.ADMIN_HIDDEN, 0) = 0';
          var targetRows = await connection.execute(targetSql, { targetId: targetId });

          if (targetRows.rows.length < 1) {
            await connection.rollback();
            return { notFound: true };
          }

          await reportsRepository.createReport(
            connection,
            targetType,
            targetId,
            req.session.user.id,
            reasonCode,
            reasonText
          );
          await connection.commit();
          return { success: true };
        } catch (err) {
          await connection.rollback();
          if (err && err.errorNum === 1) {
            return { duplicate: true };
          }
          throw err;
        }
      });

      if (reportResult.notFound) {
        renderBadRequest(res, '신고할 수 없는 대상입니다.');
        return;
      }

      if (reportResult.duplicate) {
        setFlash(req, 'info', '이미 신고한 대상입니다.');
      } else {
        setFlash(req, 'success', '신고가 접수되었습니다.');
      }

      if (bbsno) {
        res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
        return;
      }

      res.redirect('/bbs/list');
    } catch (err) {
      console.error('err : ' + err);
      next(err);
    }
  });

  return router;
}

module.exports = createReportsRouter;
