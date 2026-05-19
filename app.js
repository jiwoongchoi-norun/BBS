var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var logger = require('morgan');
require('dotenv').config({ quiet: true });

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var bbsRouter = require('./routes/bbs');
var app = express();
var sessionSecret = process.env.SESSION_SECRET;
var isProduction = process.env.NODE_ENV === 'production';

if (!sessionSecret) {
  throw new Error('SESSION_SECRET is required. Set it in your .env file.');
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
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
app.use(function (req, res, next) {
  var noticeMessages = {
    logout: {
      type: 'info',
      text: '로그아웃되었습니다.'
    }
  };

  res.locals.currentUser = req.session.user || null;
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
app.use('/users', usersRouter);
app.use('/bbs', bbsRouter);
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, _next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: req.app.get('env') === 'development' ? err : {},
    errcode: 0
  });
});

module.exports = app;
