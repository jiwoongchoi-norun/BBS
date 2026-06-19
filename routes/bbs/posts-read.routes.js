var express = require('express');

function getPaging(req) {
  // pageSize는 허용 목록 안에서만 받고, page는 1 이상의 정수로 보정한다.
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
  // EJS 페이지네이션 영역에서 필요한 값을 한 객체로 모아 전달한다.
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
    views: 'B.VIEW_COUNT',
    likes: 'COALESCE(B.LIKE_COUNT, 0)',
    created_at: 'B.REGDATE'
  };

  // 정렬 컬럼은 whitelist 매핑값만 ORDER BY에 넣어 SQL Injection을 막는다.
  if (!sortColumns[sort]) {
    return {
      sort: '',
      order: 'desc',
      orderBy: 'B.REGDATE DESC, B.NO DESC'
    };
  }

  if (order !== 'asc' && order !== 'desc') {
    order = 'desc';
  }

  return {
    sort: sort,
    order: order,
    orderBy: sortColumns[sort] + ' ' + order.toUpperCase() + ', B.REGDATE DESC, B.NO DESC'
  };
}

function createPostsReadRouter(options) {
  var router = express.Router();
  var withConnection = options.withConnection;
  var postsRepository = options.postsRepository;
  var commentsRepository = options.commentsRepository;
  var reactionsRepository = options.reactionsRepository;
  var categoriesRepository = options.categoriesRepository;
  var bookmarksRepository = options.bookmarksRepository;
  var asyncHandler = options.asyncHandler;
  var renderBadRequest = options.renderBadRequest;
  var cleanText = options.cleanText;
  var toValidNumber = options.toValidNumber;
  var shouldSkipViewCount = options.shouldSkipViewCount;

  // 게시글 목록: 페이징, 정렬, 내 글만 보기 조건을 조합한다.
  router.get(
    '/list',
    asyncHandler(async function (req, res) {
      var paging = getPaging(req);
      var sortInfo = getSort(req);
      var myPostsOnly = req.query.mine === '1' && req.session.user;
      var whereSql = 'OK = 1 AND NVL(ADMIN_HIDDEN, 0) = 0';
      var binds = {};
      var selectedCategorySlug = cleanText(req.query.category, 80);

      if (myPostsOnly) {
        whereSql += ' AND (WRITER = :writerId OR WRITER = :writerName)';
        binds.writerId = req.session.user.id;
        binds.writerName = req.session.user.name || req.session.user.id;
      }

      await withConnection(async function (connection) {
        var selectedCategory = null;
        var categories = await categoriesRepository.findActiveCategories(connection);

        if (selectedCategorySlug) {
          var categoryRows = await categoriesRepository.findCategoryBySlug(
            connection,
            selectedCategorySlug
          );

          if (categoryRows.rows.length) {
            selectedCategory = categoryRows.rows[0];
            whereSql += ' AND CATEGORY_ID = :categoryId';
            binds.categoryId = selectedCategory[0];
          }
        }

        var countResult = await postsRepository.countPosts(connection, whereSql, binds);
        var totalCount = countResult.rows[0][0];
        var totalPage = Math.ceil(totalCount / paging.pageSize);

        if (totalPage > 0 && paging.currentPage > totalPage) {
          paging.currentPage = totalPage;
        }

        var offset = (paging.currentPage - 1) * paging.pageSize;
        var listBaseParams =
          'pageSize=' +
          paging.pageSize +
          (myPostsOnly ? '&mine=1' : '') +
          (selectedCategory ? '&category=' + encodeURIComponent(selectedCategory[2]) : '');
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
            categories: categories.rows,
            selectedCategory: selectedCategory,
            sort: sortInfo.sort,
            order: sortInfo.order,
            paginationBaseUrl: paginationBaseUrl
          })
        );
      });
    })
  );

  // 상세 조회: 일반 접근일 때만 조회수를 올리고 댓글/파일/내 추천 상태를 함께 조회한다.
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

        // 일반 글 읽기만 조회수를 올리고, 댓글/추천 redirect는 제외한다.
        if (!skipViewCount) {
          await postsRepository.incrementViewCount(connection, brdno);
        }

        var isAdmin = !!(req.session.user && req.session.user.role === 'ADMIN');
        var rows = await postsRepository.findPostById(connection, brdno, isAdmin);

        if (rows.rows.length < 1) {
          res.redirect('/bbs/list');
          return;
        }

        var userId = req.session.user ? req.session.user.id : '';
        var commentRows = await commentsRepository.findCommentsByPostId(
          connection,
          brdno,
          userId,
          isAdmin
        );
        var fileRows = await postsRepository.findFilesByPostId(connection, brdno);
        var bookmarkRows = req.session.user
          ? await bookmarksRepository.findBookmark(connection, brdno, req.session.user.id)
          : { rows: [] };

        if (!req.session.user) {
          res.render('bbs/read', {
            rows: rows.rows,
            comments: commentRows.rows,
            files: fileRows.rows,
            currentUser: null,
            userReaction: '',
            isBookmarked: false,
            isAdmin: false
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
          userReaction: reactionRows.rows.length ? reactionRows.rows[0][0] : '',
          isBookmarked: bookmarkRows.rows.length > 0,
          isAdmin: isAdmin
        });
      });
    })
  );

  // 검색: 검색 대상 컬럼도 whitelist로 제한하고 목록 화면을 재사용한다.
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
      var selectedCategorySlug = cleanText(req.query.category, 80);

      if (!searchColumns[choice]) {
        choice = 'TITLE';
      }

      await withConnection(async function (connection) {
        var whereSql;
        var binds = { search: '%' + searchKeyword + '%' };
        var selectedCategory = null;
        var categories = await categoriesRepository.findActiveCategories(connection);

        if (choice == 'TITLE_CONTENT') {
          whereSql =
            'OK=1 AND NVL(ADMIN_HIDDEN, 0) = 0 AND (TITLE LIKE :search OR CONTENT LIKE :search)';
        } else {
          whereSql =
            'OK=1 AND NVL(ADMIN_HIDDEN, 0) = 0 AND ' + searchColumns[choice] + ' LIKE :search';
        }

        if (myPostsOnly) {
          whereSql += ' AND (WRITER = :writerId OR WRITER = :writerName)';
          binds.writerId = req.session.user.id;
          binds.writerName = req.session.user.name || req.session.user.id;
        }

        if (selectedCategorySlug) {
          var categoryRows = await categoriesRepository.findCategoryBySlug(
            connection,
            selectedCategorySlug
          );

          if (categoryRows.rows.length) {
            selectedCategory = categoryRows.rows[0];
            whereSql += ' AND CATEGORY_ID = :categoryId';
            binds.categoryId = selectedCategory[0];
          }
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
          (selectedCategory ? '&category=' + encodeURIComponent(selectedCategory[2]) : '') +
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
            categories: categories.rows,
            selectedCategory: selectedCategory,
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
