var express = require('express');
var fs = require('fs');
var path = require('path');

function createFilesRouter(options) {
  var router = express.Router();
  var withConnection = options.withConnection;
  var asyncHandler = options.asyncHandler;
  var requireLogin = options.requireLogin;
  var renderBadRequest = options.renderBadRequest;
  var renderForbidden = options.renderForbidden;
  var toValidNumber = options.toValidNumber;
  var resolveStoredUploadPath = options.resolveStoredUploadPath;

  // 첨부파일 다운로드: 로그인과 작성자 권한을 확인한 뒤 실제 저장 경로를 검증한다.
  router.get(
    '/download',
    asyncHandler(async function (req, res, next) {
      if (!requireLogin(req, res)) return;

      var fno = toValidNumber(req.query.fno);
      if (!fno) {
        renderBadRequest(res, '파일 번호가 올바르지 않습니다.');
        return;
      }

      var result = await withConnection(async function (connection) {
        // 과제의 작성자 권한 체크 요구사항에 맞춰 게시글 작성자만 다운로드할 수 있게 한다.
        var sql =
          'SELECT F.ORG_FILENAME, F.SAVE_FILENAME, F.FILEPATH ' +
          'FROM BBS_FILE F ' +
          'JOIN BBS B ON B.NO = F.BBSNO ' +
          'WHERE F.NO = :fno ' +
          'AND F.OK = 1 ' +
          'AND B.OK = 1 ' +
          'AND (B.WRITER = :writer OR B.WRITER = :writerName)';

        return connection.execute(sql, {
          fno: fno,
          writer: req.session.user.id,
          writerName: req.session.user.name || req.session.user.id
        });
      });

      if (result.rows.length < 1) {
        renderForbidden(res);
        return;
      }

      var row = result.rows[0];
      var orgName = path.basename(row[0] || 'download');
      var saveName = row[1];
      var storedRelativePath = (row[2] || '').replace(/\\/g, '/');
      var expectedRelativePath = path
        .join('uploads', 'bbs', path.basename(saveName || ''))
        .replace(/\\/g, '/');
      var filePath = resolveStoredUploadPath(saveName);

      // 파일을 열기 전에 DB의 상대 경로와 실제 resolve 결과가 기대 위치인지 확인한다.
      if (!filePath || storedRelativePath !== expectedRelativePath || !fs.existsSync(filePath)) {
        renderForbidden(res);
        return;
      }

      res.download(filePath, orgName, function (downloadErr) {
        if (downloadErr) {
          next(downloadErr);
        }
      });
    })
  );

  return router;
}

module.exports = createFilesRouter;
