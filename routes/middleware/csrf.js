var crypto = require('crypto');

var unsafeMethods = {
  POST: true,
  PUT: true,
  PATCH: true,
  DELETE: true
};

function safeEqual(a, b) {
  var left = Buffer.from(String(a || ''), 'utf8');
  var right = Buffer.from(String(b || ''), 'utf8');

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function ensureCsrfToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  return req.session.csrfToken;
}

function csrfProtection(req, res, next) {
  if (!req.session) {
    next(new Error('Session is required for CSRF protection.'));
    return;
  }

  var token = ensureCsrfToken(req);
  res.locals.csrfToken = token;

  if (!unsafeMethods[req.method]) {
    next();
    return;
  }

  var submittedToken =
    (req.body && req.body._csrf) || (req.query && req.query._csrf) || req.get('x-csrf-token') || '';

  if (!safeEqual(token, submittedToken)) {
    res.status(403);
    res.send('CSRF token validation failed.');
    return;
  }

  next();
}

module.exports = {
  csrfProtection: csrfProtection
};
