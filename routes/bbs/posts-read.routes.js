var express = require('express');

function getPaging(req) {
  var allowedPageSizes = [10, 20, 30, 50];
  var pageSize = parseInt(req.query.pageSize, 10);
  var currentPage = parseInt(req.query.page, 10);

  if (allowedPageSizes.indexOf(pageSize) < 0) {
    pageSize = 10;
  }

  if (isNaN(currentPage) || currentPage < 1) {
    currentPage = 1;
  }

  return {
    currentPage: currentPage,
    pageSize: pageSize
  };
}

function getPagingViewData(currentPage, pageSize, totalCount) {
  var totalPage = Math.ceil(totalCount / pageSize);
  var startPage = Math.max(1, currentPage - 5);
  var endPage = Math.min(totalPage, currentPage + 5);

  return {
    currentPage: currentPage,
    pageSize: pageSize,
    totalCount: totalCount,
    totalPage: totalPage,
    startPage: startPage,
    endPage: endPage
  };
}

function getSort(req) {
  var sort = req.query.sort;
  var order = (req.query.order || 'desc').toLowerCase();
  var sortColumns = {
    views: 'VIEW_COUNT',
    likes: 'NVL(LIKE_COUNT, 0)',
    created_at: 'REGDATE'
  };

  if (!sortColumns[sort]) {
    return {
      sort: '',
      order: 'desc',
      orderBy: 'NO DESC'
    };
  }

  if (order !== 'asc' && order !== 'desc') {
    order = 'desc';
  }

  return {
    sort: sort,
    order: order,
    orderBy: sortColumns[sort] + ' ' + order.toUpperCase() + ', NO DESC'
  };
}

function createPostsReadRouter(options) {
  var router = express.Router();
  var withConnection = options.withConnection;
  var postsRepository = options.postsRepository;
  var commentsRepository = options.commentsRepository;
  var reactionsRepository = options.reactionsRepository;
  var asyncHandler = options.asyncHandler;
  var renderBadRequest = options.renderBadRequest;
  var cleanText = options.cleanText;
  var toValidNumber = options.toValidNumber;
  var shouldSkipViewCount = options.shouldSkipViewCount;

  router.get(
    '/list',
    asyncHandler(async function (req, res) {
      var paging = getPaging(req);
      var sortInfo = getSort(req);
      var myPostsOnly = req.query.mine === '1' && req.session.user;
      var whereSql = 'OK = 1';
      var binds = {};

      if (myPostsOnly) {
        whereSql += ' AND (WRITER = :writerId OR WRITER = :writerName)';
        binds.writerId = req.session.user.id;
        binds.writerName = req.session.user.name || req.session.user.id;
      }

      await withConnection(async function (connection) {
        var countResult = await postsRepository.countPosts(connection, whereSql, binds);
        var totalCount = countResult.rows[0][0];
        var totalPage = Math.ceil(totalCount / paging.pageSize);

        if (totalPage > 0 && paging.currentPage > totalPage) {
          paging.currentPage = totalPage;
        }

        var offset = (paging.currentPage - 1) * paging.pageSize;
        var listBaseParams = 'pageSize=' + paging.pageSize + (myPostsOnly ? '&mine=1' : '');
        var paginationBaseUrl = sortInfo.sort
          ? '/bbs/list?' +
            listBaseParams +
            '&sort=' +
            encodeURIComponent(sortInfo.sort) +
            '&order=' +
            encodeURIComponent(sortInfo.order) +
            '&page='
          : '/bbs/list?' + listBaseParams + '&page=';
        var rows = await postsRepository.findPosts(
          connection,
          whereSql,
          sortInfo.orderBy,
          binds,
          offset,
          paging.pageSize
        );

        res.render(
          'bbs/list',
          Object.assign(getPagingViewData(paging.currentPage, paging.pageSize, totalCount), {
            rows: rows.rows,
            searchChoice: 'TITLE',
            searchKeyword: '',
            isSearch: false,
            myPostsOnly: !!myPostsOnly,
            sort: sortInfo.sort,
            order: sortInfo.order,
            paginationBaseUrl: paginationBaseUrl
          })
        );
      });
    })
  );

  router.get(
    '/read',
    asyncHandler(async function (req, res) {
      var brdno = toValidNumber(req.query.brdno);
      if (!brdno) {
        renderBadRequest(res, '게시글 번호가 올바르지 않습니다.');
        return;
      }

      await withConnection(async function (connection) {
        var skipViewCount = shouldSkipViewCount(req, brdno);

        if (!skipViewCount) {
          await postsRepository.incrementViewCount(connection, brdno);
        }

        var rows = await postsRepository.findPostById(connection, brdno);

        if (rows.rows.length < 1) {
          res.redirect('/bbs/list');
          return;
        }

        var userId = req.session.user ? req.session.user.id : '';
        var commentRows = await commentsRepository.findCommentsByPostId(connection, brdno, userId);
        var fileRows = await postsRepository.findFilesByPostId(connection, brdno);

        if (!req.session.user) {
          res.render('bbs/read', {
            rows: rows.rows,
            comments: commentRows.rows,
            files: fileRows.rows,
            currentUser: null,
            userReaction: ''
          });
          return;
        }

        var reactionRows = await reactionsRepository.findReactionByUserAndPost(
          connection,
          brdno,
          req.session.user.id
        );

        res.render('bbs/read', {
          rows: rows.rows,
          comments: commentRows.rows,
          files: fileRows.rows,
          currentUser: req.session.user,
          userReaction: reactionRows.rows.length ? reactionRows.rows[0][0] : ''
        });
      });
    })
  );

  router.get(
    '/search',
    asyncHandler(async function (req, res) {
      var choice = req.query.choice || 'TITLE';
      var searchColumns = {
        TITLE: 'TITLE',
        WRITER: 'WRITER',
        CONTENT: 'CONTENT',
        TITLE_CONTENT: 'TITLE_CONTENT'
      };
      var paging = getPaging(req);
      var sortInfo = getSort(req);
      var searchKeyword = cleanText(req.query.search, 200);
      var myPostsOnly = req.query.mine === '1' && req.session.user;

      if (!searchColumns[choice]) {
        choice = 'TITLE';
      }

      await withConnection(async function (connection) {
        var whereSql;
        var binds = { search: '%' + searchKeyword + '%' };

        if (choice == 'TITLE_CONTENT') {
          whereSql = 'OK=1 AND (TITLE LIKE :search OR CONTENT LIKE :search)';
        } else {
          whereSql = 'OK=1 AND ' + searchColumns[choice] + ' LIKE :search';
        }

        if (myPostsOnly) {
          whereSql += ' AND (WRITER = :writerId OR WRITER = :writerName)';
          binds.writerId = req.session.user.id;
          binds.writerName = req.session.user.name || req.session.user.id;
        }

        var countResult = await postsRepository.countSearchPosts(connection, whereSql, binds);
        var totalCount = countResult.rows[0][0];
        var totalPage = Math.ceil(totalCount / paging.pageSize);

        if (totalPage > 0 && paging.currentPage > totalPage) {
          paging.currentPage = totalPage;
        }

        var offset = (paging.currentPage - 1) * paging.pageSize;
        var paginationBaseUrl =
          '/bbs/search?choice=' +
          encodeURIComponent(choice) +
          '&search=' +
          encodeURIComponent(searchKeyword) +
          '&pageSize=' +
          paging.pageSize +
          (myPostsOnly ? '&mine=1' : '') +
          (sortInfo.sort
            ? '&sort=' +
              encodeURIComponent(sortInfo.sort) +
              '&order=' +
              encodeURIComponent(sortInfo.order)
            : '') +
          '&page=';

        var rows = await postsRepository.findSearchPosts(
          connection,
          whereSql,
          sortInfo.orderBy,
          binds,
          offset,
          paging.pageSize
        );

        res.render(
          'bbs/list',
          Object.assign(getPagingViewData(paging.currentPage, paging.pageSize, totalCount), {
            rows: rows.rows,
            searchChoice: choice,
            searchKeyword: searchKeyword,
            isSearch: true,
            myPostsOnly: !!myPostsOnly,
            sort: sortInfo.sort,
            order: sortInfo.order,
            paginationBaseUrl: paginationBaseUrl
          })
        );
      });
    })
  );

  return router;
}

module.exports = createPostsReadRouter;
