var express = require('express');

function createAdminRouter(options) {
  var router = express.Router();
  var withConnection = options.withConnection;
  var postsRepository = options.postsRepository;
  var commentsRepository = options.commentsRepository;
  var categoriesRepository = options.categoriesRepository;
  var reportsRepository = options.reportsRepository;
  var usersRepository = options.usersRepository;
  var asyncHandler = options.asyncHandler;
  var requireAdmin = options.requireAdmin;
  var renderBadRequest = options.renderBadRequest;
  var cleanText = options.cleanText;
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

  function isValidReportStatus(value) {
    return ['PENDING', 'REJECTED', 'HIDDEN', 'RESOLVED'].indexOf(value) >= 0;
  }

  function isValidCategorySlug(value) {
    return /^[a-z0-9-]{2,40}$/.test(value);
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
        var pendingReports = await reportsRepository.countReports(connection, 'PENDING');
        var totalUsers = await usersRepository.countUsers(connection);
        var suspendedUsers = await usersRepository.countSuspendedUsers(connection);
        var totalCategories = await categoriesRepository.countCategories(connection);

        res.render('bbs/admin-dashboard', {
          summary: {
            totalPosts: totalPosts.rows[0][0],
            noticePosts: noticePosts.rows[0][0],
            hiddenPosts: hiddenPosts.rows[0][0],
            hiddenComments: hiddenComments.rows[0][0],
            pendingReports: pendingReports.rows[0][0],
            totalUsers: totalUsers.rows[0][0],
            suspendedUsers: suspendedUsers.rows[0][0],
            totalCategories: totalCategories.rows[0][0]
          }
        });
      });
    })
  );

  router.get(
    '/admin/reports',
    asyncHandler(async function (req, res) {
      if (!requireAdmin(req, res)) return;

      var paging = getAdminPaging(req);
      var status = cleanText(req.query.status, 20).toUpperCase();

      if (!isValidReportStatus(status)) {
        status = '';
      }

      await withConnection(async function (connection) {
        var countResult = await reportsRepository.countReports(connection, status);
        var totalCount = countResult.rows[0][0];
        var totalPage = Math.ceil(totalCount / paging.pageSize);

        if (totalPage > 0 && paging.page > totalPage) {
          paging.page = totalPage;
          paging.offset = (paging.page - 1) * paging.pageSize;
        }

        var rows = await reportsRepository.findReports(
          connection,
          status,
          paging.offset,
          paging.pageSize
        );

        res.render('bbs/admin-reports', {
          rows: rows.rows,
          status: status,
          currentPage: paging.page,
          totalPage: totalPage,
          totalCount: totalCount
        });
      });
    })
  );

  router.post('/admin/reports/handle', async function (req, res, next) {
    if (!requireAdmin(req, res)) return;

    var reportNo = toValidNumber(req.body.report_no);
    var targetType = cleanText(req.body.target_type, 20).toUpperCase();
    var targetId = toValidNumber(req.body.target_id);
    var status = cleanText(req.body.status, 20).toUpperCase();

    if (!reportNo || !targetId || !isValidReportStatus(status)) {
      renderBadRequest(res, '신고 처리 입력값이 올바르지 않습니다.');
      return;
    }

    try {
      var result = await withConnection(async function (connection) {
        try {
          if (status === 'HIDDEN') {
            if (targetType === 'POST') {
              await postsRepository.hidePostByAdmin(connection, targetId, req.session.user.id);
            } else if (targetType === 'COMMENT') {
              await commentsRepository.hideCommentByAdmin(
                connection,
                targetId,
                req.session.user.id
              );
            }
          }

          var updateResult = await reportsRepository.handleReport(
            connection,
            reportNo,
            status,
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
        renderBadRequest(res, '대상 신고를 찾을 수 없습니다.');
        return;
      }

      setFlash(req, 'success', '신고 처리 상태를 변경했습니다.');
      redirectBack(req, res, '/bbs/admin/reports');
    } catch (err) {
      next(err);
    }
  });

  router.get(
    '/admin/users',
    asyncHandler(async function (req, res) {
      if (!requireAdmin(req, res)) return;

      var paging = getAdminPaging(req);

      await withConnection(async function (connection) {
        var countResult = await usersRepository.countUsers(connection);
        var totalCount = countResult.rows[0][0];
        var totalPage = Math.ceil(totalCount / paging.pageSize);

        if (totalPage > 0 && paging.page > totalPage) {
          paging.page = totalPage;
          paging.offset = (paging.page - 1) * paging.pageSize;
        }

        var rows = await usersRepository.findUsers(connection, paging.offset, paging.pageSize);

        res.render('bbs/admin-users', {
          rows: rows.rows,
          currentPage: paging.page,
          totalPage: totalPage
        });
      });
    })
  );

  router.post('/admin/users/role', async function (req, res, next) {
    if (!requireAdmin(req, res)) return;

    var userId = cleanText(req.body.user_id, 100);
    var role = cleanText(req.body.role, 20).toUpperCase();

    if (!userId || (role !== 'USER' && role !== 'ADMIN')) {
      renderBadRequest(res, '회원 권한 입력값이 올바르지 않습니다.');
      return;
    }

    if (userId === req.session.user.id && role !== 'ADMIN') {
      renderBadRequest(res, '자신의 관리자 권한은 해제할 수 없습니다.');
      return;
    }

    try {
      var result = await withConnection(async function (connection) {
        try {
          var updateResult = await usersRepository.updateRole(connection, userId, role);
          await connection.commit();
          return updateResult;
        } catch (err) {
          await connection.rollback();
          throw err;
        }
      });

      if (!result.rowsAffected) {
        renderBadRequest(res, '대상 회원을 찾을 수 없습니다.');
        return;
      }

      setFlash(req, 'success', '회원 권한을 변경했습니다.');
      redirectBack(req, res, '/bbs/admin/users');
    } catch (err) {
      next(err);
    }
  });

  router.post('/admin/users/suspend', async function (req, res, next) {
    if (!requireAdmin(req, res)) return;

    var userId = cleanText(req.body.user_id, 100);
    var reason = cleanText(req.body.reason, 500);

    if (!userId) {
      renderBadRequest(res, '회원 아이디가 올바르지 않습니다.');
      return;
    }

    if (userId === req.session.user.id) {
      renderBadRequest(res, '자기 자신은 정지할 수 없습니다.');
      return;
    }

    try {
      var result = await withConnection(async function (connection) {
        try {
          var updateResult = await usersRepository.suspendUser(
            connection,
            userId,
            reason || '관리자 정지',
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
        renderBadRequest(res, '대상 회원을 찾을 수 없습니다.');
        return;
      }

      setFlash(req, 'success', '회원을 정지했습니다.');
      redirectBack(req, res, '/bbs/admin/users');
    } catch (err) {
      next(err);
    }
  });

  router.post('/admin/users/restore', async function (req, res, next) {
    if (!requireAdmin(req, res)) return;

    var userId = cleanText(req.body.user_id, 100);

    if (!userId) {
      renderBadRequest(res, '회원 아이디가 올바르지 않습니다.');
      return;
    }

    try {
      var result = await withConnection(async function (connection) {
        try {
          var updateResult = await usersRepository.restoreUser(connection, userId);
          await connection.commit();
          return updateResult;
        } catch (err) {
          await connection.rollback();
          throw err;
        }
      });

      if (!result.rowsAffected) {
        renderBadRequest(res, '대상 회원을 찾을 수 없습니다.');
        return;
      }

      setFlash(req, 'success', '회원 정지를 해제했습니다.');
      redirectBack(req, res, '/bbs/admin/users');
    } catch (err) {
      next(err);
    }
  });

  router.get(
    '/admin/categories',
    asyncHandler(async function (req, res) {
      if (!requireAdmin(req, res)) return;

      await withConnection(async function (connection) {
        var rows = await categoriesRepository.findAllCategories(connection);
        res.render('bbs/admin-categories', { rows: rows.rows });
      });
    })
  );

  router.post('/admin/categories/save', async function (req, res, next) {
    if (!requireAdmin(req, res)) return;

    var categoryId = toValidNumber(req.body.category_id);
    var name = cleanText(req.body.name, 80);
    var slug = cleanText(req.body.slug, 80).toLowerCase();
    var displayOrder = toValidNumber(req.body.display_order) || 100;

    if (!name || !isValidCategorySlug(slug)) {
      renderBadRequest(res, '카테고리 이름과 영문 slug를 확인하세요.');
      return;
    }

    try {
      var result = await withConnection(async function (connection) {
        try {
          var updateResult = categoryId
            ? await categoriesRepository.updateCategory(
                connection,
                categoryId,
                name,
                slug,
                displayOrder
              )
            : await categoriesRepository.createCategory(connection, name, slug, displayOrder);
          await connection.commit();
          return updateResult;
        } catch (err) {
          await connection.rollback();
          if (err && err.errorNum === 1) {
            return { duplicate: true };
          }
          throw err;
        }
      });

      if (result.duplicate) {
        renderBadRequest(res, '이미 사용 중인 카테고리 slug입니다.');
        return;
      }

      if (categoryId && !result.rowsAffected) {
        renderBadRequest(res, '대상 카테고리를 찾을 수 없습니다.');
        return;
      }

      setFlash(
        req,
        'success',
        categoryId ? '카테고리를 수정했습니다.' : '카테고리를 추가했습니다.'
      );
      redirectBack(req, res, '/bbs/admin/categories');
    } catch (err) {
      next(err);
    }
  });

  router.post('/admin/categories/toggle', async function (req, res, next) {
    if (!requireAdmin(req, res)) return;

    var categoryId = toValidNumber(req.body.category_id);
    var isActive = req.body.is_active === '1';

    if (!categoryId) {
      renderBadRequest(res, '카테고리 번호가 올바르지 않습니다.');
      return;
    }

    try {
      var result = await withConnection(async function (connection) {
        try {
          var updateResult = await categoriesRepository.setCategoryActive(
            connection,
            categoryId,
            isActive
          );
          await connection.commit();
          return updateResult;
        } catch (err) {
          await connection.rollback();
          throw err;
        }
      });

      if (!result.rowsAffected) {
        renderBadRequest(res, '대상 카테고리를 찾을 수 없습니다.');
        return;
      }

      setFlash(
        req,
        'success',
        isActive ? '카테고리를 활성화했습니다.' : '카테고리를 비활성화했습니다.'
      );
      redirectBack(req, res, '/bbs/admin/categories');
    } catch (err) {
      next(err);
    }
  });

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
