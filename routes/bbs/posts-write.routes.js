var express = require('express');
var path = require('path');

function createPostsWriteRouter(options) {
  var router = express.Router();
  var withConnection = options.withConnection;
  var postsRepository = options.postsRepository;
  var asyncHandler = options.asyncHandler;
  var requireLogin = options.requireLogin;
  var renderBadRequest = options.renderBadRequest;
  var renderForbidden = options.renderForbidden;
  var cleanText = options.cleanText;
  var toValidNumber = options.toValidNumber;
  var validatePostInput = options.validatePostInput;
  var setFlash = options.setFlash;
  var upload = options.upload;
  var getUploadOriginalName = options.getUploadOriginalName;
  var getUploadErrorMessage = options.getUploadErrorMessage;
  var deleteStoredFile = options.deleteStoredFile;
  var deleteStoredFiles = options.deleteStoredFiles;

  // 글쓰기 화면은 로그인 사용자만 접근할 수 있다.
  router.get('/form', function (req, res) {
    if (!requireLogin(req, res)) return;
    res.render('bbs/form');
  });

  // 게시글 등록: 파일 업로드 검증 후 게시글과 파일 메타데이터를 같은 트랜잭션으로 저장한다.
  router.post('/save', function (req, res, next) {
    if (!requireLogin(req, res)) return;

    // 업로드 오류는 입력 화면으로 되돌려야 하므로 multer를 라우트 내부에서 실행한다.
    upload.single('uploadFile')(req, res, async function (uploadErr) {
      if (uploadErr) {
        var uploadMessage = getUploadErrorMessage(uploadErr);
        setFlash(req, 'warning', uploadMessage);
        res.render('bbs/form', {
          flashMessage: {
            type: 'warning',
            text: uploadMessage
          },
          formData: {
            title: cleanText(req.body.brdtitle, 200),
            content: cleanText(req.body.brdmemo, 4000)
          }
        });
        return;
      }

      var content = cleanText(req.body.brdmemo, 4000);
      var title = cleanText(req.body.brdtitle, 200);
      var writer = req.session.user.id;
      var postError = validatePostInput(title, content);

      if (postError || !writer) {
        if (req.file) {
          deleteStoredFile(req.file.filename);
        }
        setFlash(req, 'warning', postError || '작성자 정보를 확인해주세요.');
        res.render('bbs/form', {
          flashMessage: {
            type: 'warning',
            text: postError || '작성자 정보를 확인해주세요.'
          },
          formData: { title: title, content: content }
        });
        return;
      }

      try {
        var hasUploadFile = !!req.file;

        await withConnection(async function (connection) {
          try {
            // 게시글과 파일 메타데이터는 하나의 작업 단위이므로 둘 다 성공한 뒤 commit한다.
            var nextNoSql = 'SELECT BBS_SEQ.NEXTVAL FROM DUAL';
            var seqResult = await connection.execute(nextNoSql);
            var bbsno = seqResult.rows[0][0];
            var sql =
              'INSERT INTO BBS(NO, TITLE, CONTENT, WRITER, REGDATE) ' +
              'VALUES(:bbsno, :title, :content, :writer, sysdate)';

            await connection.execute(
              sql,
              {
                bbsno: bbsno,
                title: title,
                content: content,
                writer: writer
              },
              { autoCommit: false }
            );

            if (req.file) {
              var filePath = path.join('uploads', 'bbs', req.file.filename).replace(/\\/g, '/');
              var fileSql =
                'INSERT INTO BBS_FILE ' +
                '(NO, BBSNO, ORG_FILENAME, SAVE_FILENAME, FILEPATH, FILESIZE, MIMETYPE, REGDATE, OK) ' +
                'VALUES (BBS_FILE_SEQ.NEXTVAL, :bbsno, :orgName, :saveName, :filePath, :fileSize, :mimeType, SYSDATE, 1)';

              await connection.execute(
                fileSql,
                {
                  bbsno: bbsno,
                  orgName: getUploadOriginalName(req.file),
                  saveName: req.file.filename,
                  filePath: filePath,
                  fileSize: req.file.size,
                  mimeType: req.file.mimetype
                },
                { autoCommit: false }
              );
            }

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

        setFlash(
          req,
          'success',
          hasUploadFile ? '게시글과 첨부 파일이 등록되었습니다.' : '게시글이 등록되었습니다.'
        );
        res.redirect('/bbs/list');
      } catch (err) {
        if (req.file) {
          deleteStoredFile(req.file.filename);
        }
        console.error('err : ' + err);
        next(err);
      }
    });
  });

  router.get('/delete', function (req, res) {
    if (!requireLogin(req, res)) return;

    // GET 요청은 데이터를 삭제하지 않고 상세 화면의 확인 UI로 돌려보낸다.
    var bbsno = toValidNumber(req.query.brdno);
    setFlash(req, 'warning', '게시글 삭제는 확인 창의 삭제 버튼을 통해서만 처리됩니다.');

    if (bbsno) {
      res.redirect('/bbs/read?brdno=' + encodeURIComponent(bbsno));
      return;
    }

    res.redirect('/bbs/list');
  });

  // 게시글 삭제는 작성자 본인만 가능하며 DB는 soft delete로 처리한다.
  router.post('/delete', async function (req, res, next) {
    if (!requireLogin(req, res)) return;

    var bbsno = toValidNumber(req.body.brdno);
    var writer = req.session.user.id;
    var fileRows = [];

    if (!bbsno) {
      renderBadRequest(res, '게시글 번호가 올바르지 않습니다.');
      return;
    }

    try {
      var deleteSucceeded = await withConnection(async function (connection) {
        try {
          // DB 상태를 먼저 확정한 뒤 실제 파일 삭제를 시도해 데이터 정합성을 우선한다.
          var result = await postsRepository.softDeletePost(connection, bbsno, writer);

          if (!result.rowsAffected) {
            await connection.rollback();
            return false;
          }

          var selectFilesSql = 'SELECT SAVE_FILENAME FROM BBS_FILE WHERE BBSNO = :bbsno AND OK = 1';
          var selectedFileRows = await connection.execute(selectFilesSql, { bbsno: bbsno });
          fileRows = selectedFileRows.rows;

          var fileSql = 'UPDATE BBS_FILE SET OK = 0 WHERE BBSNO = :bbsno AND OK = 1';
          await connection.execute(fileSql, { bbsno: bbsno }, { autoCommit: false });

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

      deleteStoredFiles(fileRows);
      setFlash(req, 'success', '게시글이 삭제되었습니다.');
      res.redirect('/bbs/list');
    } catch (err) {
      console.error('err : ' + err);
      next(err);
    }
  });

  // 수정 화면: 게시글 작성자와 현재 로그인 사용자가 일치할 때만 보여준다.
  router.get(
    '/update',
    asyncHandler(async function (req, res) {
      if (!requireLogin(req, res)) return;
      var brdno = toValidNumber(req.query.brdno);
      if (!brdno) {
        renderBadRequest(res, '게시글 번호가 올바르지 않습니다.');
        return;
      }

      await withConnection(async function (connection) {
        var rows = await postsRepository.findPostForEdit(connection, brdno);

        if (rows.rows.length < 1) {
          res.redirect('/bbs/list');
          return;
        }

        if (
          rows.rows[0][3] !== req.session.user.id &&
          rows.rows[0][3] !== (req.session.user.name || req.session.user.id)
        ) {
          renderForbidden(res);
          return;
        }

        var fileRows = await postsRepository.findPostFilesForEdit(connection, brdno);

        res.render('bbs/updateform', {
          rows: rows.rows,
          files: fileRows.rows
        });
      });
    })
  );

  // 게시글 수정: 새 파일이 있으면 기존 파일을 비활성화하고 새 메타데이터를 등록한다.
  router.post('/updatesave', function (req, res, next) {
    if (!requireLogin(req, res)) return;

    upload.single('uploadFile')(req, res, async function (uploadErr) {
      var brdno = toValidNumber(req.body.brdno);
      if (uploadErr) {
        var uploadMessage = getUploadErrorMessage(uploadErr);
        setFlash(req, 'warning', uploadMessage);
        if (brdno) {
          res.redirect('/bbs/update?brdno=' + brdno);
        } else {
          renderBadRequest(res, '게시글 번호를 확인해주세요.');
        }
        return;
      }

      var title = cleanText(req.body.brdtitle, 200);
      var content = cleanText(req.body.brdmemo, 4000);
      var writer = req.session.user.id;
      var postError = validatePostInput(title, content);

      if (!brdno || postError) {
        if (req.file) {
          deleteStoredFile(req.file.filename);
        }
        if (postError) setFlash(req, 'warning', postError);
        if (brdno) {
          res.redirect('/bbs/update?brdno=' + brdno);
        } else {
          renderBadRequest(res, '게시글 번호를 확인해주세요.');
        }
        return;
      }

      var oldFileRows = [];

      try {
        var updateSucceeded = await withConnection(async function (connection) {
          try {
            var result = await postsRepository.updatePost(
              connection,
              brdno,
              title,
              content,
              writer
            );

            if (!result.rowsAffected) {
              await connection.rollback();
              return false;
            }

            if (req.file) {
              var selectFilesSql =
                'SELECT SAVE_FILENAME FROM BBS_FILE WHERE BBSNO = :bbsno AND OK = 1';
              var fileRows = await connection.execute(selectFilesSql, { bbsno: brdno });
              oldFileRows = fileRows.rows;

              var disableFilesSql = 'UPDATE BBS_FILE SET OK = 0 WHERE BBSNO = :bbsno AND OK = 1';
              await connection.execute(disableFilesSql, { bbsno: brdno }, { autoCommit: false });

              var filePath = path.join('uploads', 'bbs', req.file.filename).replace(/\\/g, '/');
              var fileSql =
                'INSERT INTO BBS_FILE ' +
                '(NO, BBSNO, ORG_FILENAME, SAVE_FILENAME, FILEPATH, FILESIZE, MIMETYPE, REGDATE, OK) ' +
                'VALUES (BBS_FILE_SEQ.NEXTVAL, :bbsno, :orgName, :saveName, :filePath, :fileSize, :mimeType, SYSDATE, 1)';

              await connection.execute(
                fileSql,
                {
                  bbsno: brdno,
                  orgName: getUploadOriginalName(req.file),
                  saveName: req.file.filename,
                  filePath: filePath,
                  fileSize: req.file.size,
                  mimeType: req.file.mimetype
                },
                { autoCommit: false }
              );
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
          if (req.file) {
            deleteStoredFile(req.file.filename);
          }
          renderForbidden(res);
          return;
        }

        if (req.file) {
          deleteStoredFiles(oldFileRows);
        }

        setFlash(req, 'success', '게시글이 수정되었습니다.');
        res.redirect('/bbs/list');
      } catch (err) {
        if (req.file) {
          deleteStoredFile(req.file.filename);
        }
        console.error('err : ' + err);
        next(err);
      }
    });
  });

  return router;
}

module.exports = createPostsWriteRouter;
