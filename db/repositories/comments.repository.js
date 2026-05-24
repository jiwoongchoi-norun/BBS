async function findCommentsByPostId(connection, brdno) {
  var commentSql =
    'SELECT NO, BBSNO, PARENT_NO, WRITER, CONTENT, DEPTH, LIKE_COUNT, DISLIKE_COUNT, ' +
    "TO_CHAR(REGDATE, 'yyyy-mm-dd hh24:mi:ss') AS REGDATE, " +
    "TO_CHAR(UPDATEDATE, 'yyyy-mm-dd hh24:mi:ss') AS UPDATEDATE, OK " +
    'FROM BBSW ' +
    'WHERE BBSNO = :bbsno ' +
    'START WITH PARENT_NO IS NULL ' +
    'CONNECT BY PRIOR NO = PARENT_NO ' +
    'ORDER SIBLINGS BY NO ASC';
  return connection.execute(commentSql, { bbsno: brdno });
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

module.exports = {
  findCommentsByPostId: findCommentsByPostId,
  createComment: createComment,
  findCommentDepth: findCommentDepth,
  createReply: createReply,
  incrementChildCount: incrementChildCount,
  updateComment: updateComment,
  deleteComment: deleteComment
};
