var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var logger = require('morgan');
require('dotenv').config({ quiet: true });

var indexRouter = require('./routes/index');
var bbsRouter = require('./routes/bbs');
var app = express();
var sessionSecret = process.env.SESSION_SECRET;
var isProduction = process.env.NODE_ENV === 'production';

if (!sessionSecret) {
  throw new Error('SESSION_SECRET is required. Set it in your .env file.');
}

// The project uses EJS only. Old Express-generator Jade views were removed so
// every rendered page is under views/*.ejs or views/bbs/*.ejs.
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Keep sessions simple, but do not allow a hardcoded secret.
// Production enables secure cookies, so HTTPS is required if NODE_ENV=production.
app.use(
  expressSession({
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
