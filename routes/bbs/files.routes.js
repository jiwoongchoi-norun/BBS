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
