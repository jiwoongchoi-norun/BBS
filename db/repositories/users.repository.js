async function countUsers(connection) {
  return connection.execute('SELECT COUNT(*) FROM LOGIN WHERE OK = 1');
}

async function countSuspendedUsers(connection) {
  return connection.execute(
    "SELECT COUNT(*) FROM LOGIN WHERE OK = 1 AND NVL(USER_STATUS, 'ACTIVE') = 'SUSPENDED'"
  );
}

async function findUsers(connection, offset, pageSize) {
  var sql =
    "SELECT L.ID, L.NAME, L.EMAIL, L.PHONE, L.ROLE, NVL(L.USER_STATUS, 'ACTIVE'), " +
    'L.SUSPEND_REASON, L.SUSPENDED_BY, ' +
    "TO_CHAR(L.SUSPENDED_AT, 'yyyy-mm-dd hh24:mi:ss') AS SUSPENDED_AT, " +
    'NVL((SELECT COUNT(*) FROM BBS B WHERE B.WRITER = L.ID AND B.OK = 1), 0) AS POST_COUNT, ' +
    'NVL((SELECT COUNT(*) FROM BBSW W WHERE W.WRITER = L.ID AND W.OK = 1), 0) AS COMMENT_COUNT ' +
    'FROM LOGIN L WHERE L.OK = 1 ORDER BY L.ID ASC ' +
    'OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY';
  return connection.execute(sql, { offset: offset, pageSize: pageSize });
}

async function findPublicProfile(connection, userId) {
  var sql =
    "SELECT ID, NAME, EMAIL, PHONE, ROLE, NVL(NICKNAME, NAME), BIO, AVATAR_URL, NVL(USER_STATUS, 'ACTIVE') " +
    'FROM LOGIN WHERE ID = :userId AND OK = 1';
  return connection.execute(sql, { userId: userId });
}

async function findRecentPostsByUser(connection, userId) {
  var sql =
    'SELECT NO, TITLE, ' +
    "TO_CHAR(REGDATE, 'yyyy-mm-dd hh24:mi:ss') AS REGDATE, VIEW_COUNT " +
    'FROM BBS WHERE WRITER = :userId AND OK = 1 AND NVL(ADMIN_HIDDEN, 0) = 0 ' +
    'ORDER BY NO DESC FETCH FIRST 10 ROWS ONLY';
  return connection.execute(sql, { userId: userId });
}

async function countPostsByUser(connection, userId) {
  var sql =
    'SELECT COUNT(*) FROM BBS WHERE WRITER = :userId AND OK = 1 AND NVL(ADMIN_HIDDEN, 0) = 0';
  return connection.execute(sql, { userId: userId });
}

async function countCommentsByUser(connection, userId) {
  var sql =
    'SELECT COUNT(*) FROM BBSW W JOIN BBS B ON B.NO = W.BBSNO ' +
    'WHERE W.WRITER = :userId AND W.OK = 1 AND B.OK = 1 ' +
    'AND NVL(W.ADMIN_HIDDEN, 0) = 0 AND NVL(B.ADMIN_HIDDEN, 0) = 0';
  return connection.execute(sql, { userId: userId });
}

async function updateRole(connection, userId, role) {
  var sql = 'UPDATE LOGIN SET ROLE = :role WHERE ID = :userId AND OK = 1';
  return connection.execute(sql, { userId: userId, role: role }, { autoCommit: false });
}

async function suspendUser(connection, userId, reason, adminId) {
  var sql =
    "UPDATE LOGIN SET USER_STATUS = 'SUSPENDED', SUSPENDED_AT = SYSDATE, " +
    'SUSPENDED_BY = :adminId, SUSPEND_REASON = :reason WHERE ID = :userId AND OK = 1';
  return connection.execute(
    sql,
    { userId: userId, reason: reason, adminId: adminId },
    { autoCommit: false }
  );
}

async function restoreUser(connection, userId) {
  var sql =
    "UPDATE LOGIN SET USER_STATUS = 'ACTIVE', SUSPENDED_AT = NULL, SUSPENDED_BY = NULL, " +
    'SUSPEND_REASON = NULL WHERE ID = :userId AND OK = 1';
  return connection.execute(sql, { userId: userId }, { autoCommit: false });
}

module.exports = {
  countUsers: countUsers,
  countSuspendedUsers: countSuspendedUsers,
  findUsers: findUsers,
  findPublicProfile: findPublicProfile,
  findRecentPostsByUser: findRecentPostsByUser,
  countPostsByUser: countPostsByUser,
  countCommentsByUser: countCommentsByUser,
  updateRole: updateRole,
  suspendUser: suspendUser,
  restoreUser: restoreUser
};
