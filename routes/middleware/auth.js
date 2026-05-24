function requireLogin(req, res) {
  if (!req.session.user) {
    if (req.flashMessage) {
      req.flashMessage('warning', '로그인이 필요한 기능입니다.');
    }
    res.redirect('/bbs/login');
    return false;
  }
  return true;
}

module.exports = {
  requireLogin: requireLogin
};
