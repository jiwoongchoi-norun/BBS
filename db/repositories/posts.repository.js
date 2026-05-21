async function countPosts(connection, whereSql, binds) {
  var countSql = 'SELECT COUNT(*) FROM BBS WHERE ' + whereSql;
  return connection.execute(countSql, binds);
}

async function findPosts(connection, whereSql, orderBy, binds, offset, pageSize) {
  var sql =
    "SELECT NO, TITLE, WRITER, CONTENT, to_char(REGDATE,'yyyy-mm-dd hh24:mi:ss'), " +
    'VIEW_COUNT, OK, NVL(LIKE_COUNT, 0), NVL(DISLIKE_COUNT, 0), ' +
    '(SELECT COUNT(*) FROM BBSW WHERE BBSW.BBSNO = BBS.NO AND BBSW.OK = 1) AS COMMENT_COUNT ' +
    'FROM BBS WHERE ' +
    whereSql +
    ' ORDER BY ' +
    orderBy +
    ' OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY';

  return connection.execute(
    sql,
    Object.assign({}, binds, {
      offset: offset,
      pageSize: pageSize
    })
  );
}

async function countSearchPosts(connection, whereSql, binds) {
  return connection.execute('SELECT COUNT(*) FROM BBS WHERE ' + whereSql, binds);
}

async function findSearchPosts(connection, whereSql, orderBy, binds, offset, pageSize) {
  var sql =
    "SELECT NO, TITLE, WRITER, CONTENT, to_char(REGDATE,'yyyy-mm-dd hh24:mi:ss'), " +
    'VIEW_COUNT, OK, NVL(LIKE_COUNT, 0), NVL(DISLIKE_COUNT, 0), ' +
    '(SELECT COUNT(*) FROM BBSW WHERE BBSW.BBSNO = BBS.NO AND BBSW.OK = 1) AS COMMENT_COUNT ' +
    'FROM BBS WHERE ' +
    whereSql +
    ' ORDER BY ' +
    orderBy +
    ' OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY';

  return connection.execute(
    sql,
    Object.assign({}, binds, {
      offset: offset,
      pageSize: pageSize
    })
  );
}

async function incrementViewCount(connection, brdno) {
  var updateSql = 'UPDATE BBS SET VIEW_COUNT = NVL(VIEW_COUNT, 0) + 1 WHERE OK = 1 AND NO = :brdno';
  return connection.execute(updateSql, { brdno: brdno });
}

async function findPostById(connection, brdno) {
  var sql =
    'SELECT NO, TITLE, CONTENT, ' +
    "WRITER, to_char(REGDATE,'yyyy-mm-dd'), VIEW_COUNT, " +
    'NVL(LIKE_COUNT, 0), NVL(DISLIKE_COUNT, 0) ' +
    ' FROM BBS' +
    ' WHERE OK = 1 AND NO = :brdno';
  return connection.execute(sql, { brdno: brdno });
}

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

async function findFilesByPostId(connection, brdno) {
  var fileSql =
    'SELECT NO, BBSNO, ORG_FILENAME, SAVE_FILENAME, FILEPATH, FILESIZE, MIMETYPE, ' +
    "TO_CHAR(REGDATE, 'yyyy-mm-dd hh24:mi:ss') AS REGDATE " +
    'FROM BBS_FILE WHERE BBSNO = :bbsno AND OK = 1 ORDER BY NO ASC';
  return connection.execute(fileSql, { bbsno: brdno });
}

async function findReactionByPostAndUser(connection, brdno, userId) {
  var reactionSql =
    'SELECT REACTION_TYPE FROM BBS_REACTION WHERE BBSNO = :bbsno AND USER_ID = :userId';
  return connection.execute(reactionSql, {
    bbsno: brdno,
    userId: userId
  });
}

async function findPostForEdit(connection, brdno) {
  var sql =
    "SELECT NO, TITLE, CONTENT, WRITER, to_char(REGDATE,'yyyy-mm-dd') " +
    'FROM BBS WHERE OK = 1 AND NO = :brdno';
  return connection.execute(sql, { brdno: brdno });
}

async function findPostFilesForEdit(connection, brdno) {
  var fileSql =
    'SELECT NO, BBSNO, ORG_FILENAME, SAVE_FILENAME, FILEPATH, FILESIZE, MIMETYPE, ' +
    "TO_CHAR(REGDATE, 'yyyy-mm-dd hh24:mi:ss') AS REGDATE " +
    'FROM BBS_FILE WHERE BBSNO = :bbsno AND OK = 1 ORDER BY NO ASC';
  return connection.execute(fileSql, { bbsno: brdno });
}

module.exports = {
  countPosts: countPosts,
  findPosts: findPosts,
  countSearchPosts: countSearchPosts,
  findSearchPosts: findSearchPosts,
  incrementViewCount: incrementViewCount,
  findPostById: findPostById,
  findCommentsByPostId: findCommentsByPostId,
  findFilesByPostId: findFilesByPostId,
  findReactionByPostAndUser: findReactionByPostAndUser,
  findPostForEdit: findPostForEdit,
  findPostFilesForEdit: findPostFilesForEdit
};
