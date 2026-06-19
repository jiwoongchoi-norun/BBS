var pg = require('pg');
var dbconfig = require('../config/dbconfig');
var Pool = pg.Pool;
pg.types.setTypeParser(20, Number);
var pool = new Pool(dbconfig);

async function closeConnection(connection) {
  if (!connection) return;

  connection.release();
}

function normalizeSql(sql) {
  return sql
    .replace(/\bSYSDATE\b/gi, 'CURRENT_TIMESTAMP')
    .replace(/\bSYSTIMESTAMP\b/gi, 'CURRENT_TIMESTAMP')
    .replace(/\bFROM\s+DUAL\b/gi, '')
    .replace(/\b([A-Z][A-Z0-9_]*)_SEQ\.NEXTVAL\b/gi, function (_match, name) {
      return "nextval('" + name.toLowerCase() + "_seq')";
    })
    .replace(
      /OFFSET\s+(:[a-zA-Z_][a-zA-Z0-9_]*)\s+ROWS\s+FETCH\s+NEXT\s+(:[a-zA-Z_][a-zA-Z0-9_]*)\s+ROWS\s+ONLY/gi,
      'OFFSET $1 LIMIT $2'
    )
    .replace(/FETCH\s+FIRST\s+([0-9]+)\s+ROWS\s+ONLY/gi, 'LIMIT $1')
    .replace(/yyyy-mm-dd hh24:mi:ss/gi, 'YYYY-MM-DD HH24:MI:SS')
    .replace(/yyyy-mm-dd/gi, 'YYYY-MM-DD');
}

function convertNamedBinds(sql, binds) {
  var values = [];
  var positions = Object.create(null);
  var convertedSql = normalizeSql(sql).replace(
    /:([a-zA-Z_][a-zA-Z0-9_]*)/g,
    function (match, name) {
      if (!Object.prototype.hasOwnProperty.call(binds || {}, name)) {
        return match;
      }

      if (!positions[name]) {
        values.push(binds[name]);
        positions[name] = values.length;
      }

      return '$' + positions[name];
    }
  );

  return {
    sql: convertedSql,
    values: values
  };
}

function toArrayRows(result) {
  return result.rows.map(function (row) {
    return result.fields.map(function (field) {
      return row[field.name];
    });
  });
}

function createConnection(client) {
  return {
    inTransaction: false,
    async execute(sql, binds, options) {
      var opts = options || {};

      if (opts.autoCommit === false && !this.inTransaction) {
        await client.query('BEGIN');
        this.inTransaction = true;
      }

      var query = convertNamedBinds(sql, binds || {});
      var result = await client.query(query.sql, query.values);

      return {
        rows: toArrayRows(result),
        rowsAffected: result.rowCount || 0
      };
    },
    async commit() {
      if (this.inTransaction) {
        await client.query('COMMIT');
        this.inTransaction = false;
      }
    },
    async rollback() {
      if (this.inTransaction) {
        await client.query('ROLLBACK');
        this.inTransaction = false;
      }
    },
    async release() {
      if (this.inTransaction) {
        await client.query('ROLLBACK');
        this.inTransaction = false;
      }
      client.release();
    }
  };
}

// Central connection wrapper for route/repository code. This keeps release
// handling in one place and lets each route focus on its business flow.
async function withConnection(callback) {
  var client = await pool.connect();
  var connection = createConnection(client);

  try {
    return await callback(connection);
  } finally {
    await closeConnection(connection);
  }
}

module.exports = {
  withConnection: withConnection
};
