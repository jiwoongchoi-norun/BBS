var express = require('express');

function createAdminRouter(options) {
  var router = express.Router();
  var withConnection = options.withConnection;
  var postsRepository = options.postsRepository;
  var commentsRepository = options.commentsRepository;
  var asyncHandler = options.asyncHandler;
  var requireAdmin = options.requireAdmin;
  var renderBadRequest = options.renderBadRequest;
  var toValidNumber = options.toValidNumber;
  var setFlash = options.setFlash;

  function getAdminPaging(req) {
    var page = parseInt(req.query.page, 10);
    var pageSize = 20;

    if (isNaN(page) || page < 1) {
      page = 1;
    }

    return {
      page: page,
      pageSize: pageSize,
      offset: (page - 1) * pageSize
    };
  }

  function redirectBack(req, res, fallback) {
    res.redirect(req.get('referer') || fallback || '/bbs/admin/posts');
  }

  router.get(
    '/admin',
    asyncHandler(async function (req, res) {
      if (!requireAdmin(req, res)) return;

      await withConnection(async function (connection) {
        var totalPosts = await postsRepository.countAdminPosts(connection);
        var noticePosts = await postsRepository.countNoticePosts(connection);
        var hiddenPosts = await postsRepository.countHiddenPosts(connection);
        var hiddenComments = await commentsRepository.countHiddenComments(connection);

        res.render('bbs/admin-dashboard', {
          summary: {
            totalPosts: totalPosts.rows[0][0],
            noticePosts: noticePosts.rows[0][0],
            hiddenPosts: hiddenPosts.rows[0][0],
            hiddenComments: hiddenComments.rows[0][0]
          }
        });
      });
    })
  );

  router.get(
    '/admin/posts',
    asyncHandler(async function (req, res) {
      if (!requireAdmin(req, res)) return;

      var paging = getAdminPaging(req);

      await withConnection(async function (connection) {
        var countResult = await postsRepository.countAdminPosts(connection);
        var totalCount = countResult.rows[0][0];
        var totalPage = Math.ceil(totalCount / paging.pageSize);

        if (totalPage > 0 && paging.page > totalPage) {
          paging.page = totalPage;
          paging.offset = (paging.page - 1) * paging.pageSize;
        }

        var rows = await postsRepository.findAdminPosts(connection, paging.offset, paging.pageSize);

        res.render('bbs/admin-posts', {
          rows: rows.rows,
          currentPage: paging.page,
          totalPage: totalPage,
          totalCount: totalCount
        });
      });
    })
  );

  router.post('/admin/posts/notice', async function (req, res, next) {
    if (!requireAdmin(req, res)) return;

    var bbsno = toValidNumber(req.body.brdno);
    var isNotice = req.body.is_notice === '1';

    if (!bbsno) {
      renderBadRequest(res, '게시글 번호가 올바르지 않습니다.');
      return;
    }

    try {
      var result = await withConnection(async function (connection) {
        try {
          var updateResult = await postsRepository.setNotice(connection, bbsno, isNotice);
          await connection.commit();
          return updateResult;
        } catch (err) {
          await connection.rollback();
          throw err;
        }
      });

      if (!result.rowsAffected) {
        renderBadRequest(res, '대상 게시글을 찾을 수 없습니다.');
        return;
      }

      setFlash(req, 'success', isNotice ? '공지글로 설정했습니다.' : '공지글 설정을 해제했습니다.');
      redirectBack(req, res);
    } catch (err) {
      next(err);
    }
  });

  router.post('/admin/posts/hide', async function (req, res, next) {
    if (!requireAdmin(req, res)) return;

    var bbsno = toValidNumber(req.body.brdno);

    if (!bbsno) {
      renderBadRequest(res, '게시글 번호가 올바르지 않습니다.');
      return;
    }

    try {
      var result = await withConnection(async function (connection) {
        try {
          var updateResult = await postsRepository.hidePostByAdmin(
            connection,
            bbsno,
            req.session.user.id
          );
          await connection.commit();
          return updateResult;
        } catch (err) {
          await connection.rollback();
          throw err;
        }
      });

      if (!result.rowsAffected) {
        renderBadRequest(res, '대상 게시글을 찾을 수 없습니다.');
        return;
      }

      setFlash(req, 'success', '게시글을 숨김 처리했습니다.');
      redirectBack(req, res);
    } catch (err) {
      next(err);
    }
  });

  router.post('/admin/posts/restore', async function (req, res, next) {
    if (!requireAdmin(req, res)) return;

    var bbsno = toValidNumber(req.body.brdno);

    if (!bbsno) {
      renderBadRequest(res, '게시글 번호가 올바르지 않습니다.');
      return;
    }

    try {
      var result = await withConnection(async function (connection) {
        try {
          var updateResult = await postsRepository.restorePostByAdmin(connection, bbsno);
          await connection.commit();
          return updateResult;
        } catch (err) {
          await connection.rollback();
          throw err;
        }
      });

      if (!result.rowsAffected) {
        renderBadRequest(res, '대상 게시글을 찾을 수 없습니다.');
        return;
      }

      setFlash(req, 'success', '게시글 숨김을 해제했습니다.');
      redirectBack(req, res);
    } catch (err) {
      next(err);
    }
  });

  router.post('/admin/comments/hide', async function (req, res, next) {
    if (!requireAdmin(req, res)) return;

    var wno = toValidNumber(req.body.wno);

    if (!wno) {
      renderBadRequest(res, '댓글 번호가 올바르지 않습니다.');
      return;
    }

    try {
      var result = await withConnection(async function (connection) {
        try {
          var updateResult = await commentsRepository.hideCommentByAdmin(
            connection,
            wno,
            req.session.user.id
          );
          await connection.commit();
          return updateResult;
        } catch (err) {
          await connection.rollback();
          throw err;
        }
      });

      if (!result.rowsAffected) {
        renderBadRequest(res, '대상 댓글을 찾을 수 없습니다.');
        return;
      }

      setFlash(req, 'success', '댓글을 숨김 처리했습니다.');
      redirectBack(req, res, '/bbs/admin/posts');
    } catch (err) {
      next(err);
    }
  });

  router.post('/admin/comments/restore', async function (req, res, next) {
    if (!requireAdmin(req, res)) return;

    var wno = toValidNumber(req.body.wno);

    if (!wno) {
      renderBadRequest(res, '댓글 번호가 올바르지 않습니다.');
      return;
    }

    try {
      var result = await withConnection(async function (connection) {
        try {
          var updateResult = await commentsRepository.restoreCommentByAdmin(connection, wno);
          await connection.commit();
          return updateResult;
        } catch (err) {
          await connection.rollback();
          throw err;
        }
      });

      if (!result.rowsAffected) {
        renderBadRequest(res, '대상 댓글을 찾을 수 없습니다.');
        return;
      }

      setFlash(req, 'success', '댓글 숨김을 해제했습니다.');
      redirectBack(req, res, '/bbs/admin/posts');
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createAdminRouter;
