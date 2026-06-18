var express = require('express');

function createProfileRouter(options) {
  var router = express.Router();
  var withConnection = options.withConnection;
  var usersRepository = options.usersRepository;
  var asyncHandler = options.asyncHandler;
  var renderBadRequest = options.renderBadRequest;
  var cleanText = options.cleanText;

  router.get(
    '/users/:id',
    asyncHandler(async function (req, res) {
      var userId = cleanText(req.params.id, 100);

      if (!userId) {
        renderBadRequest(res, '사용자 아이디가 올바르지 않습니다.');
        return;
      }

      await withConnection(async function (connection) {
        var profileRows = await usersRepository.findPublicProfile(connection, userId);

        if (profileRows.rows.length < 1) {
          res.redirect('/bbs/list');
          return;
        }

        var postCount = await usersRepository.countPostsByUser(connection, userId);
        var commentCount = await usersRepository.countCommentsByUser(connection, userId);
        var recentPosts = await usersRepository.findRecentPostsByUser(connection, userId);

        res.render('bbs/profile', {
          profile: profileRows.rows[0],
          summary: {
            postCount: postCount.rows[0][0],
            commentCount: commentCount.rows[0][0]
          },
          recentPosts: recentPosts.rows
        });
      });
    })
  );

  return router;
}

module.exports = createProfileRouter;
