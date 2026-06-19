async function findReactionByUserAndPost(connection, bbsno, userId) {
  var reactionSql =
    'SELECT REACTION_TYPE FROM BBS_REACTION WHERE BBSNO = :bbsno AND USER_ID = :userId';
  return connection.execute(reactionSql, {
    bbsno: bbsno,
    userId: userId
  });
}

async function createReaction(connection, bbsno, userId, reactionType) {
  await connection.execute(
    'INSERT INTO BBS_REACTION (BBSNO, USER_ID, REACTION_TYPE, REGDATE) VALUES (:bbsno, :userId, :reactionType, SYSDATE)',
    {
      bbsno: bbsno,
      userId: userId,
      reactionType: reactionType
    },
    { autoCommit: false }
  );

  var countSql =
    reactionType === 'LIKE'
      ? 'UPDATE BBS SET LIKE_COUNT = NVL(LIKE_COUNT, 0) + 1 WHERE NO = :bbsno'
      : 'UPDATE BBS SET DISLIKE_COUNT = NVL(DISLIKE_COUNT, 0) + 1 WHERE NO = :bbsno';

  return connection.execute(countSql, { bbsno: bbsno }, { autoCommit: false });
}

async function deleteReaction(connection, bbsno, userId, reactionType) {
  await connection.execute(
    'DELETE FROM BBS_REACTION WHERE BBSNO = :bbsno AND USER_ID = :userId',
    {
      bbsno: bbsno,
      userId: userId
    },
    { autoCommit: false }
  );

  var countSql =
    reactionType === 'LIKE'
      ? 'UPDATE BBS SET LIKE_COUNT = GREATEST(NVL(LIKE_COUNT, 0) - 1, 0) WHERE NO = :bbsno'
      : 'UPDATE BBS SET DISLIKE_COUNT = GREATEST(NVL(DISLIKE_COUNT, 0) - 1, 0) WHERE NO = :bbsno';

  return connection.execute(countSql, { bbsno: bbsno }, { autoCommit: false });
}

async function updateReaction(connection, bbsno, userId, reactionType) {
  await connection.execute(
    'UPDATE BBS_REACTION SET REACTION_TYPE = :reactionType, UPDATEDATE = SYSDATE WHERE BBSNO = :bbsno AND USER_ID = :userId',
    {
      bbsno: bbsno,
      userId: userId,
      reactionType: reactionType
    },
    { autoCommit: false }
  );

  var countSql =
    reactionType === 'LIKE'
      ? 'UPDATE BBS SET LIKE_COUNT = NVL(LIKE_COUNT, 0) + 1, DISLIKE_COUNT = GREATEST(NVL(DISLIKE_COUNT, 0) - 1, 0) WHERE NO = :bbsno'
      : 'UPDATE BBS SET DISLIKE_COUNT = NVL(DISLIKE_COUNT, 0) + 1, LIKE_COUNT = GREATEST(NVL(LIKE_COUNT, 0) - 1, 0) WHERE NO = :bbsno';

  return connection.execute(countSql, { bbsno: bbsno }, { autoCommit: false });
}

module.exports = {
  findReactionByUserAndPost: findReactionByUserAndPost,
  createReaction: createReaction,
  deleteReaction: deleteReaction,
  updateReaction: updateReaction
};
