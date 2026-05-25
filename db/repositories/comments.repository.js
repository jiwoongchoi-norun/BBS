async function findCommentsByPostId(connection, brdno, userId) {
  var commentSql =
    'SELECT NO, BBSNO, PARENT_NO, WRITER, CONTENT, DEPTH, LIKE_COUNT, DISLIKE_COUNT, ' +
    "TO_CHAR(REGDATE, 'yyyy-mm-dd hh24:mi:ss') AS REGDATE, " +
    "TO_CHAR(UPDATEDATE, 'yyyy-mm-dd hh24:mi:ss') AS UPDATEDATE, OK, USER_REACTION " +
    'FROM ( ' +
    'SELECT W.NO, W.BBSNO, W.PARENT_NO, W.WRITER, W.CONTENT, W.DEPTH, W.LIKE_COUNT, W.DISLIKE_COUNT, ' +
    'W.REGDATE, W.UPDATEDATE, W.OK, R.REACTION_TYPE AS USER_REACTION ' +
    'FROM BBSW W ' +
    'LEFT JOIN BBSW_REACTION R ON R.WNO = W.NO AND R.USER_ID = :userId ' +
    'WHERE W.BBSNO = :bbsno ' +
    ') ' +
    'START WITH PARENT_NO IS NULL ' +
    'CONNECT BY PRIOR NO = PARENT_NO ' +
    'ORDER SIBLINGS BY NO ASC';
  return connection.execute(commentSql, { bbsno: brdno, userId: userId || '' });
}

async function createComment(connection, bbsno, writer, content) {
  var sql =
    'INSERT INTO BBSW (NO, BBSNO, PARENT_NO, WRITER, CONTENT, DEPTH, REGDATE, OK) ' +
    'VALUES (BBSW_SEQ.NEXTVAL, :bbsno, NULL, :writer, :content, 0, SYSDATE, 1)';

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
  var parentSql = 'SELECT DEPTH FROM BBSW WHERE NO = :parentNo AND BBSNO = :bbsno AND OK = 1';
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
    'WHERE NO = :wno AND BBSNO = :bbsno AND WRITER = :writer AND OK = 1';

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
    'WHERE NO = :wno AND BBSNO = :bbsno AND WRITER = :writer AND OK = 1';

  return connection.execute(sql, { wno: wno, bbsno: bbsno, writer: writer }, { autoCommit: false });
}

async function findCommentReactionByUser(connection, wno, userId) {
  var sql = 'SELECT REACTION_TYPE FROM BBSW_REACTION WHERE WNO = :wno AND USER_ID = :userId';
  return connection.execute(sql, { wno: wno, userId: userId });
}

async function createCommentReaction(connection, wno, userId, reactionType) {
  var sql =
    reactionType === 'LIKE'
      ? 'BEGIN ' +
        'INSERT INTO BBSW_REACTION (WNO, USER_ID, REACTION_TYPE, REGDATE) VALUES (:wno, :userId, :reactionType, SYSDATE); ' +
        'UPDATE BBSW SET LIKE_COUNT = NVL(LIKE_COUNT, 0) + 1 WHERE NO = :wno; ' +
        'END;'
      : 'BEGIN ' +
        'INSERT INTO BBSW_REACTION (WNO, USER_ID, REACTION_TYPE, REGDATE) VALUES (:wno, :userId, :reactionType, SYSDATE); ' +
        'UPDATE BBSW SET DISLIKE_COUNT = NVL(DISLIKE_COUNT, 0) + 1 WHERE NO = :wno; ' +
        'END;';

  return connection.execute(
    sql,
    {
      wno: wno,
      userId: userId,
      reactionType: reactionType
    },
    { autoCommit: false }
  );
}

async function deleteCommentReaction(connection, wno, userId, reactionType) {
  var sql =
    reactionType === 'LIKE'
      ? 'BEGIN ' +
        'DELETE FROM BBSW_REACTION WHERE WNO = :wno AND USER_ID = :userId; ' +
        'UPDATE BBSW SET LIKE_COUNT = GREATEST(NVL(LIKE_COUNT, 0) - 1, 0) WHERE NO = :wno; ' +
        'END;'
      : 'BEGIN ' +
        'DELETE FROM BBSW_REACTION WHERE WNO = :wno AND USER_ID = :userId; ' +
        'UPDATE BBSW SET DISLIKE_COUNT = GREATEST(NVL(DISLIKE_COUNT, 0) - 1, 0) WHERE NO = :wno; ' +
        'END;';

  return connection.execute(sql, { wno: wno, userId: userId }, { autoCommit: false });
}

async function updateCommentReaction(connection, wno, userId, reactionType) {
  var sql =
    reactionType === 'LIKE'
      ? 'BEGIN ' +
        'UPDATE BBSW_REACTION SET REACTION_TYPE = :reactionType, UPDATEDATE = SYSDATE WHERE WNO = :wno AND USER_ID = :userId; ' +
        'UPDATE BBSW SET LIKE_COUNT = NVL(LIKE_COUNT, 0) + 1, DISLIKE_COUNT = GREATEST(NVL(DISLIKE_COUNT, 0) - 1, 0) WHERE NO = :wno; ' +
        'END;'
      : 'BEGIN ' +
        'UPDATE BBSW_REACTION SET REACTION_TYPE = :reactionType, UPDATEDATE = SYSDATE WHERE WNO = :wno AND USER_ID = :userId; ' +
        'UPDATE BBSW SET DISLIKE_COUNT = NVL(DISLIKE_COUNT, 0) + 1, LIKE_COUNT = GREATEST(NVL(LIKE_COUNT, 0) - 1, 0) WHERE NO = :wno; ' +
        'END;';

  return connection.execute(
    sql,
    {
      wno: wno,
      userId: userId,
      reactionType: reactionType
    },
    { autoCommit: false }
  );
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
  updateCommentReaction: updateCommentReaction
};
