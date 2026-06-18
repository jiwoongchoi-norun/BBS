async function findBookmark(connection, bbsno, userId) {
  var sql = 'SELECT BBSNO FROM BBS_BOOKMARK WHERE BBSNO = :bbsno AND USER_ID = :userId';
  return connection.execute(sql, { bbsno: bbsno, userId: userId });
}

async function createBookmark(connection, bbsno, userId) {
  var sql =
    'INSERT INTO BBS_BOOKMARK(BBSNO, USER_ID, REGDATE) ' +
    'SELECT B.NO, :userId, SYSDATE FROM BBS B ' +
    'WHERE B.NO = :bbsno AND B.OK = 1 AND NVL(B.ADMIN_HIDDEN, 0) = 0';
  return connection.execute(sql, { bbsno: bbsno, userId: userId }, { autoCommit: false });
}

async function deleteBookmark(connection, bbsno, userId) {
  var sql = 'DELETE FROM BBS_BOOKMARK WHERE BBSNO = :bbsno AND USER_ID = :userId';
  return connection.execute(sql, { bbsno: bbsno, userId: userId }, { autoCommit: false });
}

async function findBookmarksByUser(connection, userId) {
  var sql =
    'SELECT B.NO, B.TITLE, B.WRITER, ' +
    "TO_CHAR(B.REGDATE, 'yyyy-mm-dd hh24:mi:ss') AS POST_REGDATE, " +
    "TO_CHAR(M.REGDATE, 'yyyy-mm-dd hh24:mi:ss') AS BOOKMARK_REGDATE, " +
    "NVL(C.NAME, '미분류') AS CATEGORY_NAME, NVL(C.SLUG, '') AS CATEGORY_SLUG " +
    'FROM BBS_BOOKMARK M ' +
    'JOIN BBS B ON B.NO = M.BBSNO ' +
    'LEFT JOIN BBS_CATEGORY C ON C.ID = B.CATEGORY_ID ' +
    'WHERE M.USER_ID = :userId AND B.OK = 1 AND NVL(B.ADMIN_HIDDEN, 0) = 0 ' +
    'ORDER BY M.REGDATE DESC, B.NO DESC';
  return connection.execute(sql, { userId: userId });
}

module.exports = {
  findBookmark: findBookmark,
  createBookmark: createBookmark,
  deleteBookmark: deleteBookmark,
  findBookmarksByUser: findBookmarksByUser
};
