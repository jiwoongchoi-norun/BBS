var oracledb = require('oracledb');
var dbconfig = require('../config/dbconfig');

async function closeConnection(connection) {
  if (!connection) return;

  if (typeof connection.close === 'function') {
    await connection.close();
    return;
  }

  connection.release();
}

// Central connection wrapper for route/repository code. This keeps release
// handling in one place and lets each route focus on its business flow.
async function withConnection(callback) {
  var connection = await oracledb.getConnection(dbconfig);

  try {
    return await callback(connection);
  } finally {
    await closeConnection(connection);
  }
}

module.exports = {
  withConnection: withConnection
};
