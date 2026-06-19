var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var PgSession = require('connect-pg-simple')(expressSession);
var helmet = require('helmet');
var rateLimit = require('express-rate-limit');
var logger = require('morgan');
require('dotenv').config({ quiet: true });

var dbconfig = require('./config/dbconfig');
var indexRouter = require('./routes/index');
var bbsRouter = require('./routes/bbs');
var app = express();
var sessionSecret = process.env.SESSION_SECRET;
var isProduction = process.env.NODE_ENV === 'production';
var isDefaultSessionSecret = sessionSecret === 'change-this-session-secret';

if (!sessionSecret) {
  throw new Error('SESSION_SECRET is required. Set it in your .env file.');
}

if (isProduction && isDefaultSessionSecret) {
  throw new Error('SESSION_SECRET must be changed before running in production.');
}

// The project uses EJS only. Old Express-generator Jade views were removed so
// every rendered page is under views/*.ejs or views/bbs/*.ejs.
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
});

var writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: Number(process.env.WRITE_RATE_LIMIT || 120),
  standardHeaders: true,
  legacyHeaders: false,
  message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
});

app.use(['/bbs/logincheck', '/bbs/signupsave', '/bbs/reset-password/request'], authLimiter);
app.use(['/bbs/save', '/bbs/updatesave'], writeLimiter);

// Session data is stored in PostgreSQL so login state survives app restarts.
// Production enables secure cookies, so HTTPS is required if NODE_ENV=production.
app.use(
  expressSession({
    store: new PgSession({
      conObject: dbconfig,
      createTableIfMissing: true
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 2
    }
  })
);

// Common template state. Feature routes set req.flashMessage(), then redirect;
// the next request displays and clears the message from the session.
app.use(function (req, res, next) {
  var noticeMessages = {
    logout: {
      type: 'info',
      text: '로그아웃되었습니다.'
    }
  };

  res.locals.currentUser = req.session.user || null;
  res.locals.isAdmin = !!(req.session.user && req.session.user.role === 'ADMIN');
  res.locals.flashMessage = req.session.flashMessage || noticeMessages[req.query.notice] || null;
  delete req.session.flashMessage;

  req.flashMessage = function (type, text) {
    req.session.flashMessage = {
      type: type || 'info',
      text: text
    };
  };

  next();
});

app.use('/', indexRouter);
app.use('/bbs', bbsRouter);

// Unknown routes are handled by the shared error page.
app.use(function (req, res, next) {
  next(createError(404));
});

// Hide stack traces and internal messages in production, but keep them visible
// while developing so database/route errors can be fixed quickly.
app.use(function (err, req, res, _next) {
  var status = err.status || 500;
  var publicMessage =
    status === 404 ? '요청한 페이지를 찾을 수 없습니다.' : '요청 처리 중 문제가 발생했습니다.';
  var displayMessage = isProduction ? publicMessage : err.message;

  res.locals.message = displayMessage;
  res.locals.error = isProduction ? {} : err;

  res.status(status);
  res.render('error', {
    message: displayMessage,
    error: isProduction ? {} : err,
    errcode: 0
  });
});

module.exports = app;
