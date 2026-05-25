function requireLogin(req, res) {
  // 로그인 필수 라우트에서 세션 사용자 여부를 확인하고, 없으면 로그인 화면으로 보낸다.
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
