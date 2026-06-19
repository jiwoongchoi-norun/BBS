require('dotenv').config({ quiet: true });

var hasDatabaseUrl = !!process.env.DATABASE_URL;
var requiredEnv = ['PGHOST', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'];
var missingEnv = hasDatabaseUrl
  ? []
  : requiredEnv.filter(function (key) {
      return !process.env[key];
    });

if (missingEnv.length > 0) {
  throw new Error(
    'Missing required PostgreSQL environment variables: DATABASE_URL or ' + missingEnv.join(', ')
  );
}

var timezone = process.env.PG_TIMEZONE || 'Asia/Seoul';
var timezoneOption = '-c timezone=' + timezone;

module.exports = hasDatabaseUrl
  ? {
      connectionString: process.env.DATABASE_URL,
      options: timezoneOption
    }
  : {
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      options: timezoneOption
    };
