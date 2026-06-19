async function findCommentsByPostId(connection, brdno, userId, includeHidden) {
  // Recursive CTE keeps replies directly under their parent comment.
  var commentSql =
    'WITH RECURSIVE COMMENT_TREE AS ( ' +
    'SELECT W.NO, W.BBSNO, W.PARENT_NO, W.WRITER, ' +
    (includeHidden
      ? 'W.CONTENT, '
      : "CASE WHEN NVL(W.ADMIN_HIDDEN, 0) = 1 THEN '관리자에 의해 숨김 처리된 댓글입니다.' ELSE W.CONTENT END AS CONTENT, ") +
    'W.DEPTH, W.LIKE_COUNT, W.DISLIKE_COUNT, W.REGDATE, W.UPDATEDATE, W.OK, ' +
    'R.REACTION_TYPE AS USER_REACTION, NVL(W.ADMIN_HIDDEN, 0) AS ADMIN_HIDDEN, ' +
    'W.ADMIN_HIDDEN_AT, W.ADMIN_HIDDEN_BY, ARRAY[W.NO] AS SORT_PATH ' +
    'FROM BBSW W ' +
    'LEFT JOIN BBSW_REACTION R ON R.WNO = W.NO AND R.USER_ID = :userId ' +
    'WHERE W.BBSNO = :bbsno AND W.PARENT_NO IS NULL ' +
    'UNION ALL ' +
    'SELECT W.NO, W.BBSNO, W.PARENT_NO, W.WRITER, ' +
    (includeHidden
      ? 'W.CONTENT, '
      : "CASE WHEN NVL(W.ADMIN_HIDDEN, 0) = 1 THEN '관리자에 의해 숨김 처리된 댓글입니다.' ELSE W.CONTENT END AS CONTENT, ") +
    'W.DEPTH, W.LIKE_COUNT, W.DISLIKE_COUNT, W.REGDATE, W.UPDATEDATE, W.OK, ' +
    'R.REACTION_TYPE AS USER_REACTION, NVL(W.ADMIN_HIDDEN, 0) AS ADMIN_HIDDEN, ' +
    'W.ADMIN_HIDDEN_AT, W.ADMIN_HIDDEN_BY, CT.SORT_PATH || W.NO ' +
    'FROM BBSW W ' +
    'JOIN COMMENT_TREE CT ON CT.NO = W.PARENT_NO ' +
    'LEFT JOIN BBSW_REACTION R ON R.WNO = W.NO AND R.USER_ID = :userId ' +
    'WHERE W.BBSNO = :bbsno ' +
    ') ' +
    'SELECT NO, BBSNO, PARENT_NO, WRITER, CONTENT, DEPTH, LIKE_COUNT, DISLIKE_COUNT, ' +
    "TO_CHAR(REGDATE, 'yyyy-mm-dd hh24:mi:ss') AS REGDATE, " +
    "TO_CHAR(UPDATEDATE, 'yyyy-mm-dd hh24:mi:ss') AS UPDATEDATE, OK, USER_REACTION, ADMIN_HIDDEN, " +
    "TO_CHAR(ADMIN_HIDDEN_AT, 'yyyy-mm-dd hh24:mi:ss') AS ADMIN_HIDDEN_AT, ADMIN_HIDDEN_BY " +
    'FROM COMMENT_TREE ORDER BY SORT_PATH ASC';
  return connection.execute(commentSql, { bbsno: brdno, userId: userId || '' });
}

async function countHiddenComments(connection) {
  return connection.execute('SELECT COUNT(*) FROM BBSW WHERE OK = 1 AND NVL(ADMIN_HIDDEN, 0) = 1');
}

async function hideCommentByAdmin(connection, wno, adminId) {
  var sql =
    'UPDATE BBSW SET ADMIN_HIDDEN = 1, ADMIN_HIDDEN_AT = SYSDATE, ADMIN_HIDDEN_BY = :adminId ' +
    'WHERE NO = :wno AND OK = 1';
  return connection.execute(sql, { wno: wno, adminId: adminId }, { autoCommit: false });
}

async function restoreCommentByAdmin(connection, wno) {
  var sql =
    'UPDATE BBSW SET ADMIN_HIDDEN = 0, ADMIN_HIDDEN_AT = NULL, ADMIN_HIDDEN_BY = NULL ' +
    'WHERE NO = :wno AND OK = 1';
  return connection.execute(sql, { wno: wno }, { autoCommit: false });
}

async function createComment(connection, bbsno, writer, content) {
  var sql =
    'INSERT INTO BBSW (NO, BBSNO, PARENT_NO, WRITER, CONTENT, DEPTH, REGDATE, OK) ' +
    'SELECT BBSW_SEQ.NEXTVAL, :bbsno, NULL, :writer, :content, 0, SYSDATE, 1 ' +
    'FROM BBS WHERE NO = :bbsno AND OK = 1 AND NVL(ADMIN_HIDDEN, 0) = 0';

  return connection.execute(
    sql,
    {
      bbsno: bbsno,
      writer: writer,
      content: content
    },
    { autoCommit: false }
  );
}

async function findCommentDepth(connection, parentNo, bbsno) {
  var parentSql =
    'SELECT W.DEPTH FROM BBSW W JOIN BBS B ON B.NO = W.BBSNO ' +
    'WHERE W.NO = :parentNo AND W.BBSNO = :bbsno AND W.OK = 1 AND B.OK = 1 ' +
    'AND NVL(W.ADMIN_HIDDEN, 0) = 0 AND NVL(B.ADMIN_HIDDEN, 0) = 0';
  return connection.execute(parentSql, { parentNo: parentNo, bbsno: bbsno });
}

async function createReply(connection, bbsno, parentNo, writer, content, depth) {
  var insertSql =
    'INSERT INTO BBSW (NO, BBSNO, PARENT_NO, WRITER, CONTENT, DEPTH, REGDATE, OK) ' +
    'VALUES (BBSW_SEQ.NEXTVAL, :bbsno, :parentNo, :writer, :content, :depth, SYSDATE, 1)';

  return connection.execute(
    insertSql,
    {
      bbsno: bbsno,
      parentNo: parentNo,
      writer: writer,
      content: content,
      depth: depth
    },
    { autoCommit: false }
  );
}

async function incrementChildCount(connection, parentNo) {
  var updateSql = 'UPDATE BBSW SET CHILD_COUNT = NVL(CHILD_COUNT, 0) + 1 WHERE NO = :parentNo';
  return connection.execute(updateSql, { parentNo: parentNo }, { autoCommit: false });
}

async function updateComment(connection, wno, bbsno, writer, content) {
  var sql =
    'UPDATE BBSW SET CONTENT = :content, UPDATEDATE = SYSDATE ' +
    'WHERE NO = :wno AND BBSNO = :bbsno AND WRITER = :writer AND OK = 1 AND NVL(ADMIN_HIDDEN, 0) = 0';

  return connection.execute(
    sql,
    {
      content: content,
      wno: wno,
      bbsno: bbsno,
      writer: writer
    },
    { autoCommit: false }
  );
}

async function deleteComment(connection, wno, bbsno, writer) {
  var sql =
    "UPDATE BBSW SET OK = 0, CONTENT = '삭제된 댓글입니다.', UPDATEDATE = SYSDATE " +
    'WHERE NO = :wno AND BBSNO = :bbsno AND WRITER = :writer AND OK = 1 AND NVL(ADMIN_HIDDEN, 0) = 0';

  return connection.execute(sql, { wno: wno, bbsno: bbsno, writer: writer }, { autoCommit: false });
}

async function findCommentReactionByUser(connection, wno, userId) {
  var sql = 'SELECT REACTION_TYPE FROM BBSW_REACTION WHERE WNO = :wno AND USER_ID = :userId';
  return connection.execute(sql, { wno: wno, userId: userId });
}

async function createCommentReaction(connection, wno, userId, reactionType) {
  await connection.execute(
    'INSERT INTO BBSW_REACTION (WNO, USER_ID, REACTION_TYPE, REGDATE) VALUES (:wno, :userId, :reactionType, SYSDATE)',
    {
      wno: wno,
      userId: userId,
      reactionType: reactionType
    },
    { autoCommit: false }
  );

  var countSql =
    reactionType === 'LIKE'
      ? 'UPDATE BBSW SET LIKE_COUNT = NVL(LIKE_COUNT, 0) + 1 WHERE NO = :wno'
      : 'UPDATE BBSW SET DISLIKE_COUNT = NVL(DISLIKE_COUNT, 0) + 1 WHERE NO = :wno';

  return connection.execute(countSql, { wno: wno }, { autoCommit: false });
}

async function deleteCommentReaction(connection, wno, userId, reactionType) {
  await connection.execute(
    'DELETE FROM BBSW_REACTION WHERE WNO = :wno AND USER_ID = :userId',
    { wno: wno, userId: userId },
    { autoCommit: false }
  );

  var countSql =
    reactionType === 'LIKE'
      ? 'UPDATE BBSW SET LIKE_COUNT = GREATEST(NVL(LIKE_COUNT, 0) - 1, 0) WHERE NO = :wno'
      : 'UPDATE BBSW SET DISLIKE_COUNT = GREATEST(NVL(DISLIKE_COUNT, 0) - 1, 0) WHERE NO = :wno';

  return connection.execute(countSql, { wno: wno }, { autoCommit: false });
}

async function updateCommentReaction(connection, wno, userId, reactionType) {
  await connection.execute(
    'UPDATE BBSW_REACTION SET REACTION_TYPE = :reactionType, UPDATEDATE = SYSDATE WHERE WNO = :wno AND USER_ID = :userId',
    {
      wno: wno,
      userId: userId,
      reactionType: reactionType
    },
    { autoCommit: false }
  );

  var countSql =
    reactionType === 'LIKE'
      ? 'UPDATE BBSW SET LIKE_COUNT = NVL(LIKE_COUNT, 0) + 1, DISLIKE_COUNT = GREATEST(NVL(DISLIKE_COUNT, 0) - 1, 0) WHERE NO = :wno'
      : 'UPDATE BBSW SET DISLIKE_COUNT = NVL(DISLIKE_COUNT, 0) + 1, LIKE_COUNT = GREATEST(NVL(LIKE_COUNT, 0) - 1, 0) WHERE NO = :wno';

  return connection.execute(countSql, { wno: wno }, { autoCommit: false });
}

module.exports = {
  findCommentsByPostId: findCommentsByPostId,
  createComment: createComment,
  findCommentDepth: findCommentDepth,
  createReply: createReply,
  incrementChildCount: incrementChildCount,
  updateComment: updateComment,
  deleteComment: deleteComment,
  findCommentReactionByUser: findCommentReactionByUser,
  createCommentReaction: createCommentReaction,
  deleteCommentReaction: deleteCommentReaction,
  updateCommentReaction: updateCommentReaction,
  countHiddenComments: countHiddenComments,
  hideCommentByAdmin: hideCommentByAdmin,
  restoreCommentByAdmin: restoreCommentByAdmin
};
