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
