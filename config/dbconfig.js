require('dotenv').config({ quiet: true });

var requiredEnv = ['DB_USER', 'DB_PASSWORD', 'DB_CONNECT_STRING'];
var missingEnv = requiredEnv.filter(function (key) {
  return !process.env[key];
});

if (missingEnv.length > 0) {
  throw new Error('Missing required database environment variables: ' + missingEnv.join(', '));
}

module.exports = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING
};
