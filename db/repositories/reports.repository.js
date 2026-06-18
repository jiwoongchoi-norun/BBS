async function createReport(connection, targetType, targetId, reporterId, reasonCode, reasonText) {
  var sql =
    'INSERT INTO BBS_REPORT(NO, TARGET_TYPE, TARGET_ID, REPORTER_ID, REASON_CODE, REASON_TEXT, STATUS, REGDATE) ' +
    "VALUES(BBS_REPORT_SEQ.NEXTVAL, :targetType, :targetId, :reporterId, :reasonCode, :reasonText, 'PENDING', SYSDATE)";
  return connection.execute(
    sql,
    {
      targetType: targetType,
      targetId: targetId,
      reporterId: reporterId,
      reasonCode: reasonCode,
      reasonText: reasonText
    },
    { autoCommit: false }
  );
}

async function countReports(connection, status) {
  var sql = 'SELECT COUNT(*) FROM BBS_REPORT';
  var binds = {};
  if (status) {
    sql += ' WHERE STATUS = :status';
    binds.status = status;
  }
  return connection.execute(sql, binds);
}

async function findReports(connection, status, offset, pageSize) {
  var whereSql = status ? 'WHERE R.STATUS = :status ' : '';
  var binds = status ? { status: status } : {};
  var sql =
    'SELECT R.NO, R.TARGET_TYPE, R.TARGET_ID, R.REPORTER_ID, R.REASON_CODE, R.REASON_TEXT, R.STATUS, ' +
    "TO_CHAR(R.REGDATE, 'yyyy-mm-dd hh24:mi:ss') AS REGDATE, R.HANDLED_BY, " +
    "TO_CHAR(R.HANDLED_AT, 'yyyy-mm-dd hh24:mi:ss') AS HANDLED_AT, " +
    "CASE WHEN R.TARGET_TYPE = 'POST' THEN B.TITLE ELSE W.CONTENT END AS TARGET_TEXT " +
    'FROM BBS_REPORT R ' +
    "LEFT JOIN BBS B ON R.TARGET_TYPE = 'POST' AND B.NO = R.TARGET_ID " +
    "LEFT JOIN BBSW W ON R.TARGET_TYPE = 'COMMENT' AND W.NO = R.TARGET_ID " +
    whereSql +
    "ORDER BY CASE R.STATUS WHEN 'PENDING' THEN 0 ELSE 1 END, R.NO DESC " +
    'OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY';

  return connection.execute(
    sql,
    Object.assign({}, binds, {
      offset: offset,
      pageSize: pageSize
    })
  );
}

async function handleReport(connection, reportNo, status, adminId) {
  var sql =
    'UPDATE BBS_REPORT SET STATUS = :status, HANDLED_BY = :adminId, HANDLED_AT = SYSDATE ' +
    'WHERE NO = :reportNo';
  return connection.execute(
    sql,
    { reportNo: reportNo, status: status, adminId: adminId },
    { autoCommit: false }
  );
}

module.exports = {
  createReport: createReport,
  countReports: countReports,
  findReports: findReports,
  handleReport: handleReport
};
